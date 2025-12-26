/**
 * VALIDATION SERVICE
 * Serviço completo de validação de transações
 * Baseado no PE copy com 20+ validações
 */

import { SafeFinancialCalculator } from './SafeFinancialCalculator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Transaction {
  id?: string;
  amount?: number;
  description?: string;
  date?: string;
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  account_id?: string;
  destination_account_id?: string;
  category_id?: string;
  trip_id?: string;
  is_shared?: boolean;
  is_installment?: boolean;
  total_installments?: number;
  is_recurring?: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrence_day?: number;
  is_refund?: boolean;
  refund_of_transaction_id?: string;
  exchange_rate?: number;
  destination_amount?: number;
  destination_currency?: string;
  transaction_splits?: Array<{
    member_id: string;
    percentage: number;
    amount: number;
  }>;
}

export interface Account {
  id: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH';
  balance: number;
  credit_limit?: number;
  currency: string;
  is_international?: boolean;
}

export interface Trip {
  id: string;
  currency: string;
}

/**
 * Valida se uma data é válida no calendário
 */
function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return false;
  
  const reconstructedDate = new Date(year, month - 1, day);
  
  return (
    reconstructedDate.getFullYear() === year &&
    reconstructedDate.getMonth() === month - 1 &&
    reconstructedDate.getDate() === day
  );
}

/**
 * Valida se uma data está em um intervalo razoável (±1 ano)
 */
function isReasonableDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  return date >= oneYearAgo && date <= oneYearAhead;
}

/**
 * VALIDAÇÃO PRINCIPAL DE TRANSAÇÃO
 */
export function validateTransaction(
  transaction: Transaction,
  account?: Account,
  destinationAccount?: Account,
  trip?: Trip,
  allTransactions?: Transaction[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ==========================================
  // 1. CAMPOS OBRIGATÓRIOS
  // ==========================================
  
  if (!transaction.amount || transaction.amount <= 0) {
    errors.push('Valor deve ser maior que zero');
  }

  if (!transaction.description || transaction.description.trim() === '') {
    errors.push('Descrição é obrigatória');
  }

  if (!transaction.date) {
    errors.push('Data é obrigatória');
  }

  if (!transaction.type) {
    errors.push('Tipo de transação é obrigatório');
  }

  // Conta obrigatória para EXPENSE e INCOME
  if ((transaction.type === 'EXPENSE' || transaction.type === 'INCOME') && !transaction.account_id) {
    errors.push('Conta é obrigatória');
  }

  // Conta origem e destino obrigatórias para TRANSFER
  if (transaction.type === 'TRANSFER') {
    if (!transaction.account_id) {
      errors.push('Conta de origem é obrigatória');
    }
    if (!transaction.destination_account_id) {
      errors.push('Conta de destino é obrigatória');
    }
    if (transaction.account_id === transaction.destination_account_id) {
      errors.push('Conta de origem e destino devem ser diferentes');
    }
  }

  // ==========================================
  // 2. VALIDAÇÃO DE DATA
  // ==========================================
  
  if (transaction.date) {
    // Data válida no calendário
    if (!isValidDate(transaction.date)) {
      errors.push('Data inválida (dia não existe no mês)');
    }
    
    // Data razoável (±1 ano)
    if (!isReasonableDate(transaction.date)) {
      warnings.push('Data muito distante (mais de 1 ano)');
    }
  }

  // ==========================================
  // 3. VALIDAÇÃO DE VALOR
  // ==========================================
  
  const MAX_AMOUNT = 1000000;
  if (transaction.amount && transaction.amount > MAX_AMOUNT) {
    warnings.push(`Valor muito alto (maior que ${MAX_AMOUNT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);
  }

  // ==========================================
  // 4. VALIDAÇÃO DE LIMITE DE CARTÃO
  // ==========================================
  
  if (account?.type === 'CREDIT_CARD' && transaction.type === 'EXPENSE') {
    if (account.credit_limit) {
      const currentUsed = Math.abs(account.balance);
      const newUsed = currentUsed + (transaction.amount || 0);
      
      if (newUsed > account.credit_limit) {
        const available = account.credit_limit - currentUsed;
        errors.push(
          `Limite do cartão será ultrapassado. ` +
          `Disponível: ${available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        );
      }
    }
  }

  // ==========================================
  // 5. VALIDAÇÃO DE PARCELAMENTO
  // ==========================================
  
  if (transaction.is_installment) {
    if (!transaction.total_installments || transaction.total_installments < 2) {
      errors.push('Parcelamento deve ter pelo menos 2 parcelas');
    }
    
    if (transaction.total_installments && transaction.total_installments > 48) {
      warnings.push('Número de parcelas muito alto (mais de 48)');
    }
    
    // Parcelamento em conta não-cartão
    if (account && account.type !== 'CREDIT_CARD') {
      warnings.push('Parcelamento geralmente é usado apenas em cartões de crédito');
    }
  }

  // ==========================================
  // 6. VALIDAÇÃO DE DIVISÃO COMPARTILHADA
  // ==========================================
  
  if (transaction.is_shared && transaction.transaction_splits && transaction.transaction_splits.length > 0) {
    const totalPercentage = SafeFinancialCalculator.safeSum(
      transaction.transaction_splits.map(s => SafeFinancialCalculator.toSafeNumber(s.percentage, 0))
    );
    
    const totalAssigned = SafeFinancialCalculator.safeSum(
      transaction.transaction_splits.map(s => SafeFinancialCalculator.toSafeNumber(s.amount, 0))
    );
    
    // Soma de percentagens deve ser 100%
    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(`A soma das porcentagens deve ser 100% (atual: ${totalPercentage.toFixed(2)}%)`);
    }
    
    // Soma de valores não pode exceder o total
    const safeAmount = SafeFinancialCalculator.toSafeNumber(transaction.amount, 0);
    if (safeAmount > 0 && totalAssigned > safeAmount) {
      errors.push(
        `Divisão inválida: soma dos valores (${totalAssigned.toFixed(2)}) ` +
        `é maior que o total (${safeAmount.toFixed(2)})`
      );
    }
  }

  // ==========================================
  // 7. VALIDAÇÃO DE TIPO DE CONTA
  // ==========================================
  
  // Transferência não pode ir para cartão de crédito
  if (transaction.type === 'TRANSFER' && destinationAccount?.type === 'CREDIT_CARD') {
    errors.push('Não é possível transferir para cartão de crédito');
  }

  // ==========================================
  // 8. VALIDAÇÃO DE MOEDA (VIAGENS)
  // ==========================================
  
  if (trip && account) {
    if (account.currency !== trip.currency) {
      errors.push(
        `Conta em ${account.currency} não pode ser usada em viagem em ${trip.currency}`
      );
    }
  }

  // ==========================================
  // 9. VALIDAÇÃO DE TRANSFERÊNCIA INTERNACIONAL
  // ==========================================
  
  if (transaction.type === 'TRANSFER' && account && destinationAccount) {
    const isMultiCurrency = account.currency !== destinationAccount.currency;
    
    if (isMultiCurrency && !transaction.exchange_rate) {
      errors.push('Taxa de câmbio é obrigatória para transferências entre moedas diferentes');
    }
    
    if (isMultiCurrency && transaction.exchange_rate && transaction.exchange_rate <= 0) {
      errors.push('Taxa de câmbio deve ser maior que zero');
    }
  }

  // ==========================================
  // 10. VALIDAÇÃO DE RECORRÊNCIA
  // ==========================================
  
  if (transaction.is_recurring) {
    if (!transaction.frequency) {
      errors.push('Frequência é obrigatória para transações recorrentes');
    }
    
    if (transaction.frequency === 'MONTHLY' && !transaction.recurrence_day) {
      errors.push('Dia do mês é obrigatório para recorrência mensal');
    }
    
    if (transaction.recurrence_day && (transaction.recurrence_day < 1 || transaction.recurrence_day > 31)) {
      errors.push('Dia de recorrência deve estar entre 1 e 31');
    }
  }

  // ==========================================
  // 11. VALIDAÇÃO DE DUPLICATAS
  // ==========================================
  
  if (allTransactions && transaction.amount && transaction.description && transaction.date) {
    const duplicates = allTransactions.filter(tx => {
      if (tx.id === transaction.id) return false; // Ignorar a própria transação em edição
      
      const isSameAmount = Math.abs((tx.amount || 0) - (transaction.amount || 0)) < 0.01;
      const isSameDescription = tx.description?.toLowerCase() === transaction.description?.toLowerCase();
      const isSameAccount = tx.account_id === transaction.account_id;
      
      // Verificar se é no mesmo dia ou ±3 dias
      if (tx.date && transaction.date) {
        const txDate = new Date(tx.date);
        const transactionDate = new Date(transaction.date);
        const diffDays = Math.abs((txDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 3 && isSameAmount && isSameDescription && isSameAccount) {
          return true;
        }
      }
      
      return false;
    });
    
    if (duplicates.length > 0) {
      warnings.push(
        `Possível duplicata: transação similar encontrada (${duplicates.length} ocorrência${duplicates.length > 1 ? 's' : ''})`
      );
    }
  }

  // ==========================================
  // 12. VALIDAÇÃO DE REEMBOLSO
  // ==========================================
  
  if (transaction.is_refund && !transaction.refund_of_transaction_id) {
    warnings.push('Reembolso sem referência à transação original');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida uma conta
 */
export function validateAccount(account: Partial<Account>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!account.type) {
    errors.push('Tipo de conta é obrigatório');
  }

  // Validações específicas por tipo
  if (account.type === 'CREDIT_CARD') {
    if (!account.credit_limit || account.credit_limit <= 0) {
      errors.push('Limite de crédito é obrigatório para cartões');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
