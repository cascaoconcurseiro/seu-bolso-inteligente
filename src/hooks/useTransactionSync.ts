/**
 * Transaction Synchronization Hook
 * 
 * React hook for synchronizing shared transactions between different pages.
 * Ensures that changes in Compartilhados reflect in Transações and vice-versa.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TransactionSyncResult {
  syncTransaction: (transactionId: string) => Promise<void>;
  syncAllShared: () => Promise<void>;
  invalidateRelated: (transactionId: string) => Promise<void>;
  isSyncing: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to synchronize shared transactions across pages
 * 
 * @returns Sync functions and loading state
 * 
 * @example
 * ```tsx
 * const { syncTransaction, invalidateRelated, isSyncing } = useTransactionSync();
 * 
 * // After settling a transaction
 * await syncTransaction(transactionId);
 * 
 * // After any operation on a shared transaction
 * await invalidateRelated(transactionId);
 * ```
 */
export function useTransactionSync(): TransactionSyncResult {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Invalidate all queries related to a specific transaction
   * This ensures UI updates across all pages
   */
  const invalidateRelated = useCallback(
    async (transactionId: string) => {
      setIsSyncing(true);
      try {
        await Promise.all([
          // Invalidate shared finances queries
          queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] }),
          queryClient.invalidateQueries({ queryKey: ['paid-by-others-transactions'] }),
          
          // Invalidate transactions queries
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          
          // Invalidate specific transaction
          queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] }),
          queryClient.invalidateQueries({ queryKey: ['transaction-validation', transactionId] }),
          
          // Invalidate accounts (for balance updates)
          queryClient.invalidateQueries({ queryKey: ['accounts'] }),
          
          // Invalidate splits
          queryClient.invalidateQueries({ queryKey: ['transaction-splits'] }),
        ]);
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient]
  );

  /**
   * Sync a specific transaction
   * Fetches fresh data and updates cache
   */
  const syncTransaction = useCallback(
    async (transactionId: string) => {
      setIsSyncing(true);
      try {
        // Invalidate and refetch
        await invalidateRelated(transactionId);
        
        // Force refetch of the transaction
        await queryClient.refetchQueries({ 
          queryKey: ['transaction', transactionId],
          exact: true,
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient, invalidateRelated]
  );

  /**
   * Sync all shared transactions
   * Useful after bulk operations
   */
  const syncAllShared = useCallback(
    async () => {
      setIsSyncing(true);
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] }),
          queryClient.invalidateQueries({ queryKey: ['paid-by-others-transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        ]);
        
        // Refetch all
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['shared-transactions-with-splits'] }),
          queryClient.refetchQueries({ queryKey: ['paid-by-others-transactions'] }),
        ]);
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient]
  );

  return {
    syncTransaction,
    syncAllShared,
    invalidateRelated,
    isSyncing,
  };
}
