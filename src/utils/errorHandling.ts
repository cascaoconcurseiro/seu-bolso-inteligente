/**
 * Error Handling Utilities
 * Centralized error handling for consistent error messages and logging
 */

import { toast } from 'sonner';
import { logger } from './logger';

export interface AppError {
  message?: string;
  code?: string;
  error_code?: string;
  error_description?: string;
  status?: number;
}

export const getError = (e: unknown): AppError => {
  if (typeof e === 'object' && e !== null) return e as AppError;
  return {};
};

/**
 * Handle query errors
 * Logs error and throws it for React Query to handle
 */
export const handleQueryError = (
  error: unknown,
  context: string
): never => {
  logger.error(`Erro ao ${context}`, { error });
  throw error;
};

/**
 * Handle mutation errors
 * Logs error and shows toast message
 */
export const handleMutationError = (
  error: unknown,
  action: string,
  entity: string
): void => {
  const message = `Erro ao ${action} ${entity}`;
  logger.error(message, { error });
  toast.error(`${message}: ${error.message}`);
};

/**
 * Handle Supabase errors
 * Provides user-friendly messages for common Supabase errors
 */
export const handleSupabaseError = (
  error: unknown,
  context: string
): never => {
  logger.error(`Erro Supabase ao ${context}`, { error });

  // Map common Supabase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    '23505': 'Este registro já existe',
    '23503': 'Não é possível excluir este registro pois está sendo usado',
    '42501': 'Você não tem permissão para realizar esta ação',
    'PGRST116': 'Nenhum registro encontrado',
    '42P01': 'Tabela não encontrada',
  };

  const err = getError(error);
  const code = String(err.code || err.error_code || '');
  const userMessage = errorMessages[code] || err.message || 'Erro desconhecido';

  throw new Error(userMessage as string);
};

/**
 * Handle validation errors
 * Shows toast with validation error message
 */
export const handleValidationError = (message: string): never => {
  logger.warn('Erro de validação', { message });
  toast.error(message);
  throw new Error(message);
};

/**
 * Handle network errors
 * Shows toast with network error message
 */
export const handleNetworkError = (error: unknown): never => {
  logger.error('Erro de rede', { error });
  toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
  throw error;
};

/**
 * Safe error handler
 * Catches all errors and provides fallback message
 */
export const safeErrorHandler = (
  error: unknown,
  fallbackMessage: string = 'Ocorreu um erro inesperado'
): void => {
  logger.error('Erro não tratado', { error });
  
  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error(fallbackMessage);
  }
};

/**
 * Async error wrapper
 * Wraps async functions with error handling
 */
export const withErrorHandling = <T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<T> => {
  return fn().catch((error) => {
    logger.error(errorMessage, { error });
    toast.error(`${errorMessage}: ${error.message}`);
    throw error;
  });
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
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  const err = getError(error);
  return (
    err.message === 'Network request failed' ||
    err.message === 'Failed to fetch' ||
    !navigator.onLine
  );
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  const err = getError(error);
  return (
    err.status === 401 ||
    err.code === 'PGRST301' ||
    err.message?.includes('JWT') || false
  );
};

/**
 * Check if error is a permission error
 */
export const isPermissionError = (error: unknown): boolean => {
  const err = getError(error);
  return (
    err.status === 403 ||
    err.code === '42501'
  );
};

/**
 * Format error for display
 * Extracts user-friendly message from error object
 */
export const formatErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  const err = getError(error);
  if (err.message) return err.message;
  if (err.error_description) return err.error_description;
  return 'Ocorreu um erro inesperado';
};
