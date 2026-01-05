/**
 * Transaction Validation Hook
 * 
 * React hook for validating transaction operations based on settlement status.
 * Provides real-time validation flags and on-demand validation function.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  SettlementValidator,
  SettlementStatus,
  ValidationResult,
  Transaction,
  TransactionSplit,
} from '@/services/settlementValidation';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UseTransactionValidationProps {
  transactionId?: string;
  splitId?: string;
}

export interface TransactionValidationResult {
  canEdit: boolean;
  canDelete: boolean;
  canAnticipate: boolean;
  settlementStatus: SettlementStatus;
  validate: (operation: 'edit' | 'delete' | 'anticipate') => ValidationResult;
  isLoading: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to validate transaction operations
 * 
 * @param props - Configuration object with transactionId and optional splitId
 * @returns Validation result with flags and validation function
 * 
 * @example
 * ```tsx
 * const { canEdit, canDelete, validate } = useTransactionValidation({
 *   transactionId: 'tx-123',
 *   splitId: 'split-456'
 * });
 * 
 * if (!canEdit) {
 *   toast.error('Cannot edit settled transaction');
 * }
 * ```
 */
export function useTransactionValidation(
  props: UseTransactionValidationProps
): TransactionValidationResult {
  const { transactionId, splitId } = props;

  // Fetch transaction data
  const { data: transaction, isLoading: txLoading } = useQuery({
    queryKey: ['transaction-validation', transactionId],
    queryFn: async () => {
      if (!transactionId) return null;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    enabled: !!transactionId,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: 'always',
  });

  // Fetch split data if splitId is provided
  const { data: split, isLoading: splitLoading } = useQuery({
    queryKey: ['split-validation', splitId],
    queryFn: async () => {
      if (!splitId) return null;

      const { data, error } = await supabase
        .from('transaction_splits')
        .select('*')
        .eq('id', splitId)
        .single();

      if (error) throw error;
      return data as TransactionSplit;
    },
    enabled: !!splitId,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: 'always',
  });

  // Calculate validation flags
  const validationResult = useMemo(() => {
    if (!transaction) {
      return {
        canEdit: false,
        canDelete: false,
        canAnticipate: false,
        settlementStatus: {
          isSettled: false,
          settledBy: 'none' as const,
          canEdit: false,
          canDelete: false,
          canAnticipate: false,
        },
      };
    }

    const settlementStatus = SettlementValidator.getSettlementStatus(transaction, split || undefined);

    return {
      canEdit: settlementStatus.canEdit,
      canDelete: settlementStatus.canDelete,
      canAnticipate: settlementStatus.canAnticipate,
      settlementStatus,
    };
  }, [transaction, split]);

  // Validation function for on-demand validation
  const validate = useMemo(() => {
    return (operation: 'edit' | 'delete' | 'anticipate'): ValidationResult => {
      if (!transaction) {
        return {
          isValid: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND' as any,
            message: 'Transação não encontrada',
          },
        };
      }

      switch (operation) {
        case 'edit':
          return SettlementValidator.canEdit(transaction, split || undefined);
        case 'delete':
          return SettlementValidator.canDelete(transaction, split ? [split] : undefined);
        case 'anticipate':
          return SettlementValidator.canAnticipate(transaction, split || undefined);
        default:
          return {
            isValid: false,
            error: {
              code: 'INVALID_OPERATION' as any,
              message: 'Operação inválida',
            },
          };
      }
    };
  }, [transaction, split]);

  return {
    ...validationResult,
    validate,
    isLoading: txLoading || splitLoading,
  };
}
