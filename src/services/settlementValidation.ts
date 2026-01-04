/**
 * Settlement Validation Service
 * 
 * Provides validation logic for transaction settlement operations.
 * Ensures that settled transactions cannot be modified, deleted, or anticipated.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SettlementStatus {
  isSettled: boolean;
  settledBy: 'debtor' | 'creditor' | 'both' | 'none';
  canEdit: boolean;
  canDelete: boolean;
  canAnticipate: boolean;
  blockReason?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: {
    code: SettlementErrorCode;
    message: string;
    action?: string;
  };
}

export interface Transaction {
  id: string;
  user_id: string;
  is_shared?: boolean;
  is_settled?: boolean;
  settled_at?: string;
  series_id?: string;
  current_installment?: number;
  total_installments?: number;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  user_id: string;
  member_id: string;
  amount: number;
  is_settled: boolean;
  settled_by_debtor: boolean;
  settled_by_creditor: boolean;
  debtor_settlement_tx_id?: string;
  creditor_settlement_tx_id?: string;
  settled_at?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

export enum SettlementErrorCode {
  TRANSACTION_SETTLED = 'TRANSACTION_SETTLED',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  NO_PERMISSION = 'NO_PERMISSION',
  SERIES_HAS_SETTLED_INSTALLMENTS = 'SERIES_HAS_SETTLED_INSTALLMENTS',
  INSTALLMENT_SETTLED = 'INSTALLMENT_SETTLED',
  DUPLICATE_SETTLEMENT = 'DUPLICATE_SETTLEMENT',
  INVALID_OPERATION = 'INVALID_OPERATION',
}

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES: Record<SettlementErrorCode, { message: string; action?: string }> = {
  [SettlementErrorCode.TRANSACTION_SETTLED]: {
    message: 'Esta transação já foi acertada e não pode ser modificada',
    action: 'Desfaça o acerto primeiro para poder editar',
  },
  [SettlementErrorCode.TRANSACTION_NOT_FOUND]: {
    message: 'Transação não encontrada',
  },
  [SettlementErrorCode.NO_PERMISSION]: {
    message: 'Apenas o criador da transação pode realizar esta operação',
  },
  [SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS]: {
    message: 'Esta série contém parcelas já acertadas',
    action: 'Desfaça os acertos das parcelas antes de excluir a série',
  },
  [SettlementErrorCode.INSTALLMENT_SETTLED]: {
    message: 'Parcelas acertadas não podem ser antecipadas',
    action: 'Desfaça o acerto primeiro para poder antecipar',
  },
  [SettlementErrorCode.DUPLICATE_SETTLEMENT]: {
    message: 'Já existe um acerto para esta transação',
  },
  [SettlementErrorCode.INVALID_OPERATION]: {
    message: 'Operação inválida',
  },
};

// ============================================================================
// Settlement Validator Class
// ============================================================================

export class SettlementValidator {
  /**
   * Check if a transaction is settled
   * A transaction is considered settled if:
   * - is_settled flag is true, OR
   * - Any split has settled_by_debtor = true, OR
   * - Any split has settled_by_creditor = true
   */
  private static isTransactionSettled(transaction: Transaction, split?: TransactionSplit): boolean {
    // Check transaction-level flag
    if (transaction.is_settled) {
      return true;
    }

    // Check split-level flags
    if (split) {
      return split.settled_by_debtor || split.settled_by_creditor;
    }

    return false;
  }

  /**
   * Get settlement status for a transaction
   */
  static getSettlementStatus(transaction: Transaction, split?: TransactionSplit): SettlementStatus {
    const isSettled = this.isTransactionSettled(transaction, split);

    let settledBy: 'debtor' | 'creditor' | 'both' | 'none' = 'none';
    if (split) {
      if (split.settled_by_debtor && split.settled_by_creditor) {
        settledBy = 'both';
      } else if (split.settled_by_debtor) {
        settledBy = 'debtor';
      } else if (split.settled_by_creditor) {
        settledBy = 'creditor';
      }
    }

    const canEdit = !isSettled;
    const canDelete = !isSettled;
    const canAnticipate = !isSettled;

    const blockReason = isSettled 
      ? ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED].message 
      : undefined;

    return {
      isSettled,
      settledBy,
      canEdit,
      canDelete,
      canAnticipate,
      blockReason,
    };
  }

  /**
   * Check if a transaction can be edited
   */
  static canEdit(transaction: Transaction, split?: TransactionSplit): ValidationResult {
    if (!transaction) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.TRANSACTION_NOT_FOUND,
          ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_NOT_FOUND],
        },
      };
    }

    const isSettled = this.isTransactionSettled(transaction, split);

    if (isSettled) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.TRANSACTION_SETTLED,
          ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED],
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Check if a transaction can be deleted
   */
  static canDelete(transaction: Transaction, splits?: TransactionSplit[]): ValidationResult {
    if (!transaction) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.TRANSACTION_NOT_FOUND,
          ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_NOT_FOUND],
        },
      };
    }

    // Check transaction-level settlement
    if (transaction.is_settled) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.TRANSACTION_SETTLED,
          ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED],
        },
      };
    }

    // Check if any split is settled
    if (splits && splits.length > 0) {
      const hasSettledSplit = splits.some(
        split => split.settled_by_debtor || split.settled_by_creditor
      );

      if (hasSettledSplit) {
        return {
          isValid: false,
          error: {
            code: SettlementErrorCode.TRANSACTION_SETTLED,
            ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED],
          },
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check if an installment can be anticipated
   */
  static canAnticipate(transaction: Transaction, split?: TransactionSplit): ValidationResult {
    if (!transaction) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.TRANSACTION_NOT_FOUND,
          ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_NOT_FOUND],
        },
      };
    }

    const isSettled = this.isTransactionSettled(transaction, split);

    if (isSettled) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.INSTALLMENT_SETTLED,
          ...ERROR_MESSAGES[SettlementErrorCode.INSTALLMENT_SETTLED],
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Check if a series can be deleted
   * A series can only be deleted if ALL installments are not settled
   */
  static canDeleteSeries(seriesId: string, transactions: Transaction[], allSplits?: TransactionSplit[]): ValidationResult {
    if (!seriesId || !transactions || transactions.length === 0) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.TRANSACTION_NOT_FOUND,
          ...ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_NOT_FOUND],
        },
      };
    }

    // Check if any transaction in the series is settled
    const hasSettledTransaction = transactions.some(tx => tx.is_settled);

    if (hasSettledTransaction) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS,
          ...ERROR_MESSAGES[SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS],
        },
      };
    }

    // Check if any split is settled
    if (allSplits && allSplits.length > 0) {
      const hasSettledSplit = allSplits.some(
        split => split.settled_by_debtor || split.settled_by_creditor
      );

      if (hasSettledSplit) {
        return {
          isValid: false,
          error: {
            code: SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS,
            ...ERROR_MESSAGES[SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS],
          },
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check if a settlement already exists for a split
   */
  static hasExistingSettlement(split: TransactionSplit, type: 'debtor' | 'creditor'): boolean {
    if (type === 'debtor') {
      return split.settled_by_debtor || !!split.debtor_settlement_tx_id;
    } else {
      return split.settled_by_creditor || !!split.creditor_settlement_tx_id;
    }
  }

  /**
   * Validate settlement creation
   */
  static canCreateSettlement(split: TransactionSplit, type: 'debtor' | 'creditor'): ValidationResult {
    if (this.hasExistingSettlement(split, type)) {
      return {
        isValid: false,
        error: {
          code: SettlementErrorCode.DUPLICATE_SETTLEMENT,
          ...ERROR_MESSAGES[SettlementErrorCode.DUPLICATE_SETTLEMENT],
        },
      };
    }

    return { isValid: true };
  }
}
