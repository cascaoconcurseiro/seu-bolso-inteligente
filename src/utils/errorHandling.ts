/**
 * Error Handling Utilities
 * Centralized error handling for consistent error messages and logging
 */

import { logger } from "./logger";

export interface AppError {
  message?: string;
  code?: string;
  error_code?: string;
  error_description?: string;
  status?: number;
}

export const getError = (e: unknown): AppError => {
  if (typeof e === "object" && e !== null) return e as AppError;
  return {};
};

/**
 * Handle Supabase errors
 * Provides user-friendly messages for common Supabase errors
 */
export const handleSupabaseError = (error: unknown, context: string): never => {
  logger.error(`Erro Supabase ao ${context}`, { error });

  // Map common Supabase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    "23505": "Este registro já existe",
    "23503": "Não é possível excluir este registro pois está sendo usado",
    "42501": "Você não tem permissão para realizar esta ação",
    PGRST116: "Nenhum registro encontrado",
    "42P01": "Tabela não encontrada",
  };

  const err = getError(error);
  const code = String(err.code || err.error_code || "");
  const userMessage = errorMessages[code] || err.message || "Erro desconhecido";

  // Preserva o código Postgres/PostgREST para os chamadores poderem tratar
  // casos específicos (ex.: 23505 = duplicata no import OFX)
  const wrapped = new Error(userMessage as string) as Error & { code?: string };
  wrapped.code = code as string | undefined;
  throw wrapped;
};

/**
 * Retry with exponential backoff
 * Retries a function with exponential backoff on failure
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      logger.warn(`Tentativa ${i + 1}/${maxRetries} falhou`, { error });

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
