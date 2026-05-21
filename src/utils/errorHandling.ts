/**
 * Error Handling Utilities
 * Centralized error handling for consistent error messages and logging
 */

import { toast } from 'sonner';
import { logger } from './logger';

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

  const code = error.code || error.error_code;
  const userMessage = errorMessages[code] || error.message;

  throw new Error(userMessage);
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
    } catch (error) {
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
  return (
    error.message === 'Network request failed' ||
    error.message === 'Failed to fetch' ||
    !navigator.onLine
  );
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  return (
    error.status === 401 ||
    error.code === 'PGRST301' ||
    error.message?.includes('JWT')
  );
};

/**
 * Check if error is a permission error
 */
export const isPermissionError = (error: unknown): boolean => {
  return (
    error.status === 403 ||
    error.code === '42501'
  );
};

/**
 * Format error for display
 * Extracts user-friendly message from error object
 */
export const formatErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  return 'Ocorreu um erro inesperado';
};
