/**
 * Audit Log Service
 * 
 * Provides logging functionality for settlement operations.
 * Records user actions, timestamps, and affected entities for auditing and troubleshooting.
 * 
 * Task 20: Auditoria de Operações
 * Requirements: 13.1, 13.2, 13.3, 13.5
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type SettlementOperationType =
  | 'SETTLEMENT_CREATED'
  | 'SETTLEMENT_UNDONE'
  | 'OPERATION_BLOCKED'
  | 'TRANSACTION_DELETED'
  | 'SERIES_DELETED'
  | 'INSTALLMENT_ANTICIPATED';

export interface SettlementOperationLog {
  operation_type: SettlementOperationType;
  user_id: string;
  transaction_id?: string;
  split_id?: string;
  series_id?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  error_code?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  operation_type: SettlementOperationType;
  user_id: string;
  transaction_id?: string;
  split_id?: string;
  series_id?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  error_code?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditLogFilters {
  user_id?: string;
  operation_type?: SettlementOperationType;
  start_date?: string;
  end_date?: string;
  transaction_id?: string;
  split_id?: string;
  series_id?: string;
}

// ============================================================================
// Audit Log Functions
// ============================================================================

/**
 * Log a settlement operation
 * 
 * @param log - Settlement operation log data
 * @returns Promise with the created log entry
 * 
 * @example
 * ```typescript
 * await logSettlementOperation({
 *   operation_type: 'SETTLEMENT_CREATED',
 *   user_id: userId,
 *   transaction_id: txId,
 *   split_id: splitId,
 *   amount: 100.50,
 *   currency: 'BRL'
 * });
 * ```
 */
export async function logSettlementOperation(
  log: SettlementOperationLog
): Promise<AuditLogEntry | null> {
  try {
    console.log('📝 [auditLog] Logging settlement operation:', {
      operation_type: log.operation_type,
      user_id: log.user_id,
      transaction_id: log.transaction_id,
      split_id: log.split_id,
      amount: log.amount
    });

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        operation_type: log.operation_type,
        user_id: log.user_id,
        transaction_id: log.transaction_id,
        split_id: log.split_id,
        series_id: log.series_id,
        amount: log.amount,
        currency: log.currency,
        reason: log.reason,
        error_code: log.error_code,
        metadata: log.metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [auditLog] Error logging operation:', error);
      // Don't throw - logging should not break the main flow
      return null;
    }

    console.log('✅ [auditLog] Operation logged successfully:', data.id);
    return data as AuditLogEntry;
  } catch (error) {
    console.error('❌ [auditLog] Unexpected error:', error);
    return null;
  }
}

/**
 * Log a settlement creation
 * 
 * @param userId - ID of the user creating the settlement
 * @param transactionId - ID of the transaction being settled
 * @param splitId - ID of the split being settled
 * @param amount - Amount being settled
 * @param currency - Currency of the settlement
 * @param metadata - Additional metadata
 */
export async function logSettlementCreated(
  userId: string,
  transactionId: string,
  splitId: string,
  amount: number,
  currency: string = 'BRL',
  metadata?: Record<string, any>
): Promise<void> {
  await logSettlementOperation({
    operation_type: 'SETTLEMENT_CREATED',
    user_id: userId,
    transaction_id: transactionId,
    split_id: splitId,
    amount,
    currency,
    metadata,
  });
}

/**
 * Log a settlement undo
 * 
 * @param userId - ID of the user undoing the settlement
 * @param transactionId - ID of the transaction
 * @param splitId - ID of the split
 * @param reason - Reason for undoing
 * @param metadata - Additional metadata
 */
export async function logSettlementUndone(
  userId: string,
  transactionId: string,
  splitId: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSettlementOperation({
    operation_type: 'SETTLEMENT_UNDONE',
    user_id: userId,
    transaction_id: transactionId,
    split_id: splitId,
    reason,
    metadata,
  });
}

/**
 * Log a blocked operation
 * 
 * @param userId - ID of the user attempting the operation
 * @param transactionId - ID of the transaction
 * @param errorCode - Error code for the blocked operation
 * @param reason - Reason for blocking
 * @param metadata - Additional metadata
 */
export async function logOperationBlocked(
  userId: string,
  transactionId: string,
  errorCode: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSettlementOperation({
    operation_type: 'OPERATION_BLOCKED',
    user_id: userId,
    transaction_id: transactionId,
    error_code: errorCode,
    reason,
    metadata,
  });
}

/**
 * Log a transaction deletion
 * 
 * @param userId - ID of the user deleting the transaction
 * @param transactionId - ID of the transaction being deleted
 * @param metadata - Additional metadata
 */
export async function logTransactionDeleted(
  userId: string,
  transactionId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSettlementOperation({
    operation_type: 'TRANSACTION_DELETED',
    user_id: userId,
    transaction_id: transactionId,
    metadata,
  });
}

/**
 * Log a series deletion
 * 
 * @param userId - ID of the user deleting the series
 * @param seriesId - ID of the series being deleted
 * @param metadata - Additional metadata (e.g., number of installments)
 */
export async function logSeriesDeleted(
  userId: string,
  seriesId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSettlementOperation({
    operation_type: 'SERIES_DELETED',
    user_id: userId,
    series_id: seriesId,
    metadata,
  });
}

/**
 * Log an installment anticipation
 * 
 * @param userId - ID of the user anticipating installments
 * @param seriesId - ID of the series
 * @param metadata - Additional metadata (e.g., installment IDs, new date)
 */
export async function logInstallmentAnticipated(
  userId: string,
  seriesId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSettlementOperation({
    operation_type: 'INSTALLMENT_ANTICIPATED',
    user_id: userId,
    series_id: seriesId,
    metadata,
  });
}

/**
 * Query audit logs with filters
 * 
 * @param filters - Filters to apply to the query
 * @returns Promise with array of audit log entries
 * 
 * @example
 * ```typescript
 * const logs = await queryAuditLogs({
 *   user_id: userId,
 *   operation_type: 'SETTLEMENT_CREATED',
 *   start_date: '2024-01-01',
 *   end_date: '2024-01-31'
 * });
 * ```
 */
export async function queryAuditLogs(
  filters: AuditLogFilters
): Promise<AuditLogEntry[]> {
  try {
    console.log('🔍 [auditLog] Querying audit logs with filters:', filters);

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.operation_type) {
      query = query.eq('operation_type', filters.operation_type);
    }

    if (filters.transaction_id) {
      query = query.eq('transaction_id', filters.transaction_id);
    }

    if (filters.split_id) {
      query = query.eq('split_id', filters.split_id);
    }

    if (filters.series_id) {
      query = query.eq('series_id', filters.series_id);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [auditLog] Error querying logs:', error);
      throw error;
    }

    console.log('✅ [auditLog] Found', data.length, 'log entries');
    return data as AuditLogEntry[];
  } catch (error) {
    console.error('❌ [auditLog] Unexpected error:', error);
    return [];
  }
}

/**
 * Get recent audit logs for a user
 * 
 * @param userId - ID of the user
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Promise with array of audit log entries
 */
export async function getRecentUserLogs(
  userId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data as AuditLogEntry[];
  } catch (error) {
    console.error('❌ [auditLog] Error getting recent logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific transaction
 * 
 * @param transactionId - ID of the transaction
 * @returns Promise with array of audit log entries
 */
export async function getTransactionLogs(
  transactionId: string
): Promise<AuditLogEntry[]> {
  return queryAuditLogs({ transaction_id: transactionId });
}

/**
 * Get audit logs for a specific split
 * 
 * @param splitId - ID of the split
 * @returns Promise with array of audit log entries
 */
export async function getSplitLogs(
  splitId: string
): Promise<AuditLogEntry[]> {
  return queryAuditLogs({ split_id: splitId });
}

/**
 * Get audit logs for a specific series
 * 
 * @param seriesId - ID of the series
 * @returns Promise with array of audit log entries
 */
export async function getSeriesLogs(
  seriesId: string
): Promise<AuditLogEntry[]> {
  return queryAuditLogs({ series_id: seriesId });
}
