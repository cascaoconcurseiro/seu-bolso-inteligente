/**
 * RPC with Retry Logic
 * 
 * Wrapper para chamadas RPC com retry automático, backoff exponencial,
 * logging detalhado e tratamento de erros consistente.
 * 
 * Uso:
 *   const result = await rpcWithRetry('settle_split', { p_split_id: '123' });
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

interface RpcRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RpcCallResult<T> {
  data: T | null;
  error: Error | null;
  attempts: number;
  lastError?: Error;
}

/**
 * Calcula delay com backoff exponencial + jitter
 * Evita thundering herd quando múltiplas requisições falham simultaneamente
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return exponentialDelay + jitter;
}

/**
 * Verifica se um erro é retriável
 * Alguns erros (como 401 Unauthorized) não devem ser retentados
 */
function isRetriableError(error: unknown): boolean {
  const err = error as Record<string, unknown>;
  // Erros de autenticação não são retriáveis
  if (err?.status === 401 || err?.code === 'PGRST301') {
    return false;
  }

  // Erros de permissão não são retriáveis
  if (err?.status === 403 || err?.code === '42501') {
    return false;
  }

  // Erros de validação não são retriáveis
  if (err?.status === 400 || err?.code === '42601') {
    return false;
  }

  // Tudo mais é potencialmente retriável (network, timeout, etc)
  return true;
}

/**
 * Chama função RPC com retry automático
 * 
 * @param functionName - Nome da função RPC no Supabase
 * @param params - Parâmetros para passar à função
 * @param options - Opções de retry
 * @returns Resultado da chamada RPC
 * 
 * @throws Error se todas as tentativas falharem
 */
export async function rpcWithRetry<T = unknown>(
  functionName: string,
  params?: Record<string, unknown>,
  options: RpcRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 30000,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  for (attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug(`[RPC] Tentativa ${attempt + 1}/${maxRetries}: ${functionName}`, {
        params,
      });

      // Criar promise com timeout
      const rpcPromise = supabase.rpc(functionName as never, params);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`RPC timeout após ${timeoutMs}ms`)),
          timeoutMs
        )
      );

      const { data, error } = await Promise.race([
        rpcPromise,
        timeoutPromise,
      ]) as Promise<{ data: unknown; error: Error | null }>;

      if (error) {
        throw error;
      }

      logger.debug(`[RPC] Sucesso na tentativa ${attempt + 1}: ${functionName}`, {
        dataSize: JSON.stringify(data).length,
      });

      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetriable = isRetriableError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      logger.warn(
        `[RPC] Tentativa ${attempt + 1}/${maxRetries} falhou: ${functionName}`,
        {
          error: lastError.message,
          retriable: isRetriable,
          isLastAttempt,
        }
      );

      if (onRetry && !isLastAttempt) {
        onRetry(attempt + 1, lastError);
      }

      // Se não é retriável ou é última tentativa, lançar erro
      if (!isRetriable || isLastAttempt) {
        logger.error(
          `[RPC] Falha final após ${attempt + 1} tentativa(s): ${functionName}`,
          {
            error: lastError.message,
            retriable: isRetriable,
          }
        );
        throw lastError;
      }

      // Aguardar antes de retry
      const delay = calculateBackoffDelay(attempt, baseDelayMs);
      logger.debug(`[RPC] Aguardando ${delay.toFixed(0)}ms antes de retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Nunca deve chegar aqui, mas por segurança
  throw lastError || new Error(`RPC falhou após ${maxRetries} tentativas`);
}

/**
 * Versão simplificada que retorna resultado com metadados
 * Útil quando você quer saber quantas tentativas foram necessárias
 */
export async function rpcWithRetryDetailed<T = unknown>(
  functionName: string,
  params?: Record<string, unknown>,
  options: RpcRetryOptions = {}
): Promise<RpcCallResult<T>> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 30000,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  for (attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug(`[RPC] Tentativa ${attempt + 1}/${maxRetries}: ${functionName}`);

      const rpcPromise = supabase.rpc(functionName as never, params);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`RPC timeout após ${timeoutMs}ms`)),
          timeoutMs
        )
      );

      const { data, error } = await Promise.race([
        rpcPromise,
        timeoutPromise,
      ]) as Promise<{ data: unknown; error: Error | null }>;

      if (error) {
        throw error;
      }

      logger.debug(`[RPC] Sucesso na tentativa ${attempt + 1}: ${functionName}`);

      return {
        data: data as T,
        error: null,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetriable = isRetriableError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      logger.warn(
        `[RPC] Tentativa ${attempt + 1}/${maxRetries} falhou: ${functionName}`,
        { error: lastError.message }
      );

      if (onRetry && !isLastAttempt) {
        onRetry(attempt + 1, lastError);
      }

      if (!isRetriable || isLastAttempt) {
        logger.error(
          `[RPC] Falha final após ${attempt + 1} tentativa(s): ${functionName}`,
          { error: lastError.message }
        );

        return {
          data: null,
          error: lastError,
          attempts: attempt + 1,
          lastError,
        };
      }

      const delay = calculateBackoffDelay(attempt, baseDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    data: null,
    error: lastError || new Error(`RPC falhou após ${maxRetries} tentativas`),
    attempts: attempt,
    lastError,
  };
}

/**
 * Batch RPC calls com retry
 * Útil para múltiplas chamadas RPC que devem ser feitas em paralelo
 */
export async function batchRpcWithRetry<T = unknown>(
  calls: Array<{
    functionName: string;
    params?: Record<string, unknown>;
  }>,
  options: RpcRetryOptions = {}
): Promise<T[]> {
  logger.debug(`[RPC] Iniciando batch de ${calls.length} chamadas RPC`);

  const results = await Promise.all(
    calls.map(({ functionName, params }) =>
      rpcWithRetry<T>(functionName, params, options).catch(error => {
        logger.error(`[RPC] Erro em batch call ${functionName}`, { error });
        throw error;
      })
    )
  );

  logger.debug(`[RPC] Batch concluído com sucesso`);
  return results;
}
