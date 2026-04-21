/**
 * React Query Configuration Utilities
 * Centralized query configuration to ensure consistency
 */

import { UseQueryOptions } from '@tanstack/react-query';

/**
 * Default query configuration
 * Applied to all queries for consistent behavior
 */
export const defaultQueryConfig = {
  staleTime: 0, // Always consider data stale
  refetchOnMount: 'always' as const, // Always refetch on mount
  retry: false, // Don't retry failed queries
};

/**
 * Configuration for queries that should cache data
 * Use for data that doesn't change frequently
 */
export const cachedQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnMount: false,
  retry: 1,
};

/**
 * Configuration for real-time queries
 * Use for data that needs to be always fresh
 */
export const realtimeQueryConfig = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
  refetchInterval: 30000, // Refetch every 30 seconds
  retry: false,
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
  filters: Record<string, any>,
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
