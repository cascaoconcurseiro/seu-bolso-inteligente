/**
 * Supabase Helper Utilities
 * Centralized Supabase query patterns to reduce duplication
 */

import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError, retryWithBackoff } from './errorHandling';

/**
 * Fetch user data from a table
 * Generic function to fetch data filtered by user_id
 */
export const fetchUserData = async <T>(
  table: string,
  userId: string,
  options?: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    filters?: Record<string, unknown>;
    limit?: number;
  }
): Promise<T[]> => {
  try {
    let query = supabase
      .from(table)
      .select(options?.select || '*')
      .eq('user_id', userId);

    // Apply additional filters
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending ?? false,
      });
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, `buscar dados de ${table}`);
    }

    return (data as T[]) || [];
  } catch (error) {
    handleSupabaseError(error, `buscar dados de ${table}`);
    return [];
  }
};

/**
 * Fetch single record by ID
 */
export const fetchById = async <T>(
  table: string,
  id: string,
  select?: string
): Promise<T | null> => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(select || '*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, `buscar registro de ${table}`);
    }

    return data as T | null;
  } catch (error) {
    handleSupabaseError(error, `buscar registro de ${table}`);
    return null;
  }
};

/**
 * Insert single record
 */
export const insertRecord = async <T>(
  table: string,
  data: Partial<T>
): Promise<T> => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as never)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, `inserir em ${table}`);
    }

    return result as T;
  } catch (error) {
    handleSupabaseError(error, `inserir em ${table}`);
    throw error;
  }
};

/**
 * Insert multiple records
 */
export const insertRecords = async <T>(
  table: string,
  data: Partial<T>[]
): Promise<T[]> => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as never)
      .select();

    if (error) {
      handleSupabaseError(error, `inserir múltiplos em ${table}`);
    }

    return (result as T[]) || [];
  } catch (error) {
    handleSupabaseError(error, `inserir múltiplos em ${table}`);
    return [];
  }
};

/**
 * Update record by ID
 */
export const updateRecord = async <T>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T> => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, `atualizar ${table}`);
    }

    return result as T;
  } catch (error) {
    handleSupabaseError(error, `atualizar ${table}`);
    throw error;
  }
};

/**
 * Delete record by ID
 */
export const deleteRecord = async (
  table: string,
  id: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, `excluir de ${table}`);
    }
  } catch (error) {
    handleSupabaseError(error, `excluir de ${table}`);
  }
};

/**
 * Soft delete record (set deleted = true)
 */
export const softDeleteRecord = async (
  table: string,
  id: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from(table)
      .update({ deleted: true, is_active: false } as never)
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, `excluir ${table}`);
    }
  } catch (error) {
    handleSupabaseError(error, `excluir ${table}`);
  }
};

/**
 * Count records with filters
 */
export const countRecords = async (
  table: string,
  filters?: Record<string, unknown>
): Promise<number> => {
  try {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      handleSupabaseError(error, `contar registros de ${table}`);
    }

    return count || 0;
  } catch (error) {
    handleSupabaseError(error, `contar registros de ${table}`);
    return 0;
  }
};

/**
 * Check if record exists
 */
export const recordExists = async (
  table: string,
  filters: Record<string, unknown>
): Promise<boolean> => {
  const count = await countRecords(table, filters);
  return count > 0;
};

/**
 * Fetch with date range filter
 */
export const fetchWithDateRange = async <T>(
  table: string,
  userId: string,
  startDate: string,
  endDate: string,
  dateField: string = 'date',
  options?: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    additionalFilters?: Record<string, unknown>;
  }
): Promise<T[]> => {
  try {
    let query = supabase
      .from(table)
      .select(options?.select || '*')
      .eq('user_id', userId)
      .gte(dateField, startDate)
      .lte(dateField, endDate);

    // Apply additional filters
    if (options?.additionalFilters) {
      Object.entries(options.additionalFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending ?? false,
      });
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, `buscar dados de ${table} com filtro de data`);
    }

    return (data as T[]) || [];
  } catch (error) {
    handleSupabaseError(error, `buscar dados de ${table} com filtro de data`);
    return [];
  }
};

/**
 * Call RPC function
 */
export const callRPC = async <T>(
  functionName: string,
  params?: Record<string, unknown>
): Promise<T> => {
  try {
    const { data, error } = await supabase.rpc(functionName as never, params as never);

    if (error) {
      handleSupabaseError(error, `chamar função ${functionName}`);
    }

    return data as T;
  } catch (error) {
    handleSupabaseError(error, `chamar função ${functionName}`);
    throw error;
  }
};

/**
 * Call RPC function with retry logic
 */
export const callRPCWithRetry = async <T>(
  functionName: string,
  params?: Record<string, unknown>,
  maxRetries: number = 3
): Promise<T> => {
  return retryWithBackoff(
    () => callRPC<T>(functionName, params),
    maxRetries
  );
};
