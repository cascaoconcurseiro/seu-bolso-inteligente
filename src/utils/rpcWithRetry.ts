/**
 * RPC with Retry Logic
 *
 * Wrapper para chamadas RPC com retry automático, backoff exponencial,
 * AbortController para cancelamento real de requests, e tratamento de erros.
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

function calculateBackoffDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return exponentialDelay + jitter;
}

function isRetriableError(error: unknown): boolean {
  const err = error as Record<string, unknown>;
  // Whitelist-only: never retry client errors (4xx) unless explicitly allowed
  if ((err as Error)?.name === 'AbortError') return true;  // our own timeout = network flakiness
  if (err?.status === 429) return true;                    // rate-limited
  if (err?.status === 503 || err?.status === 504) return true; // server unavailable / gateway timeout
  if (err?.code === 'PGRST999') return true;               // Supabase internal transient
  // Everything else (400, 401, 403, 404, 409, 422, 500 logic errors) is not retriable
  return false;
}

/**
 * Executes a single RPC attempt with AbortController-based timeout.
 * The underlying fetch is actually cancelled on timeout (no zombie connections).
 */
async function rpcAttempt<T>(
  functionName: string,
  params: Record<string, unknown> | undefined,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const builder = supabase.rpc(functionName as never, params as never);
    // abortSignal wires the AbortController to the underlying fetch call
    const { data, error } = await (builder as any).abortSignal(controller.signal);

    if (error) throw error;
    return data as T;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new Error(`RPC timeout após ${timeoutMs}ms: ${functionName}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

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

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug(`[RPC] Tentativa ${attempt + 1}/${maxRetries}: ${functionName}`, { params });

      const data = await rpcAttempt<T>(functionName, params, timeoutMs);

      logger.debug(`[RPC] Sucesso na tentativa ${attempt + 1}: ${functionName}`);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetriable = isRetriableError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      logger.warn(`[RPC] Tentativa ${attempt + 1}/${maxRetries} falhou: ${functionName}`, {
        error: lastError.message,
        retriable: isRetriable,
        isLastAttempt,
      });

      if (onRetry && !isLastAttempt) onRetry(attempt + 1, lastError);

      if (!isRetriable || isLastAttempt) {
        logger.error(`[RPC] Falha final após ${attempt + 1} tentativa(s): ${functionName}`, {
          error: lastError.message,
        });
        throw lastError;
      }

      const delay = calculateBackoffDelay(attempt, baseDelayMs);
      logger.debug(`[RPC] Aguardando ${delay.toFixed(0)}ms antes de retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`RPC falhou após ${maxRetries} tentativas`);
}

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

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug(`[RPC] Tentativa ${attempt + 1}/${maxRetries}: ${functionName}`);

      const data = await rpcAttempt<T>(functionName, params, timeoutMs);

      logger.debug(`[RPC] Sucesso na tentativa ${attempt + 1}: ${functionName}`);
      return { data, error: null, attempts: attempt + 1 };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetriable = isRetriableError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      logger.warn(`[RPC] Tentativa ${attempt + 1}/${maxRetries} falhou: ${functionName}`, {
        error: lastError.message,
      });

      if (onRetry && !isLastAttempt) onRetry(attempt + 1, lastError);

      if (!isRetriable || isLastAttempt) {
        logger.error(`[RPC] Falha final após ${attempt + 1} tentativa(s): ${functionName}`, {
          error: lastError.message,
        });
        return { data: null, error: lastError, attempts: attempt + 1, lastError };
      }

      const delay = calculateBackoffDelay(attempt, baseDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    data: null,
    error: lastError || new Error(`RPC falhou após ${maxRetries} tentativas`),
    attempts: maxRetries,
    lastError: lastError || undefined,
  };
}

export async function batchRpcWithRetry<T = unknown>(
  calls: Array<{ functionName: string; params?: Record<string, unknown> }>,
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
