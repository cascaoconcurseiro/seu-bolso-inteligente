/**
 * React Query Configuration Utilities
 * Centralized query configuration to ensure consistency
 * 
 * AUDITORIA 2026-05-10: Corrigido staleTime de 0 para 30s.
 * Com staleTime: 0, toda troca de aba no app disparava refetch de TODAS as queries,
 * causando lentidão visível especialmente no módulo Compartilhados.
 * Com 30s, dados são reaproveitados por 30 segundos e invalidados explicitamente
 * após mutações (create/update/delete) via invalidateQueries.
 */

import { UseQueryOptions, keepPreviousData } from '@tanstack/react-query';

/**
 * Default query configuration
 * staleTime: 30s — evita refetch desnecessário ao navegar entre abas.
 * refetchOnWindowFocus: false — evita refetch ao voltar ao app no celular.
 * retry: 1 — tenta uma vez em caso de falha de rede (ex: 3G instável).
 */
export const defaultQueryConfig = {
  staleTime: 30 * 1000, // 30 segundos
  refetchOnMount: true as const,
  refetchOnWindowFocus: false,
  retry: 1,
  placeholderData: keepPreviousData,
};

/**
 * Configuration for queries that should cache data longer
 * Use for data that doesn't change frequently (categories, banks, profiles)
 */
export const cachedQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: 1,
};

/**
 * Configuration for real-time / financial queries
 * Use for saldo, financial summary — dados críticos que precisam ser frescos
 * após uma mutação. As mutações já invalidam explicitamente com invalidateQueries.
 */
export const realtimeQueryConfig = {
  staleTime: 15 * 1000, // 15 segundos
  refetchOnMount: true as const,
  refetchOnWindowFocus: false,
  retry: 1,
  placeholderData: keepPreviousData,
};

/**
 * Configuration for shared expenses queries
 * Slightly longer stale time since updates are always explicit.
 * This is the key fix for the Compartilhados page delay.
 */
export const sharedQueryConfig = {
  staleTime: 30 * 1000, // 30 segundos
  refetchOnMount: true as const,
  refetchOnWindowFocus: false,
  retry: 1,
};

/**
 * Create a user-scoped query configuration
 * Automatically adds user ID to query key and enables only when user exists
 */
export const createUserQueryConfig = <T>(
  baseKey: string[],
  userId: string | undefined,
  additionalConfig?: Partial<UseQueryOptions<T>>
): UseQueryOptions<T> => {
  return {
    queryKey: [...baseKey, userId],
    enabled: !!userId,
    ...defaultQueryConfig,
    ...additionalConfig,
  } as UseQueryOptions<T>;
};

/**
 * Create a date-scoped query configuration
 * Automatically adds date range to query key
 */
export const createDateQueryConfig = <T>(
  baseKey: string[],
  startDate: string,
  endDate: string,
  userId: string | undefined,
  additionalConfig?: Partial<UseQueryOptions<T>>
): UseQueryOptions<T> => {
  return {
    queryKey: [...baseKey, userId, startDate, endDate],
    enabled: !!userId,
    ...defaultQueryConfig,
    ...additionalConfig,
  } as UseQueryOptions<T>;
};

/**
 * Create a filtered query configuration
 * Automatically adds filters to query key
 */
export const createFilteredQueryConfig = <T>(
  baseKey: string[],
  filters: Record<string, unknown>,
  userId: string | undefined,
  additionalConfig?: Partial<UseQueryOptions<T>>
): UseQueryOptions<T> => {
  return {
    queryKey: [...baseKey, userId, filters],
    enabled: !!userId,
    ...defaultQueryConfig,
    ...additionalConfig,
  } as UseQueryOptions<T>;
};
