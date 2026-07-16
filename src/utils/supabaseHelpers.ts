/**
 * Supabase Helper Utilities
 * Centralized Supabase query patterns to reduce duplication
 */

import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError, retryWithBackoff } from "./errorHandling";

import { Database } from "@/integrations/supabase/types";

/**
 * Insert multiple records
 */
export const insertRecords = async <T>(table: string, data: Partial<T>[]): Promise<T[]> => {
  try {
    const { data: result, error } = await supabase
      .from(table as keyof Database["public"]["Tables"])
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
  return retryWithBackoff(() => callRPC<T>(functionName, params), maxRetries);
};
