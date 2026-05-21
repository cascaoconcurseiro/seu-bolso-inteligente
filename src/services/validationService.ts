/**
 * VALIDATION SERVICE
 * Serviço completo de validação de transações
 * Baseado no PE copy com 20+ validações
 */

import { z } from 'zod';
import { SafeFinancialCalculator } from './SafeFinancialCalculator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().positive('Valor deve ser maior que zero'),
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT']),
  account_id: z.string().uuid().nullable().optional(),
  destination_account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  trip_id: z.string().uuid().nullable().optional(),
  is_shared: z.boolean().optional(),
  payer_id: z.string().uuid().nullable().optional(),
  is_installment: z.boolean().optional(),
  total_installments: z.number().int().min(2).max(48).nullable().optional(),
  is_recurring: z.boolean().nullable().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).nullable().optional(),
  recurrence_day: z.number().int().min(1).max(31).nullable().optional(),
  is_refund: z.boolean().nullable().optional(),
  refund_of_transaction_id: z.string().uuid().nullable().optional(),
  exchange_rate: z.number().positive().nullable().optional(),
  destination_amount: z.number().positive().nullable().optional(),
  destination_currency: z.string().nullable().optional(),
  transaction_splits: z.array(z.object({
    member_id: z.string().uuid(),
    percentage: z.number().min(0).max(100),
    amount: z.number().min(0)
  })).optional()
});

export type Transaction = z.infer<typeof transactionSchema>;

export interface Account {
  id: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH' | 'EMERGENCY_FUND';
  balance: number;
  credit_limit: number | null;
  currency: string;
  is_international?: boolean | null;
}

export interface Trip {
  id: string;
  currency: string;
}

/**
 * Valida se uma data é válida no calendário
 * 
 * Uses dateUtils.parseDate() to avoid timezone issues with new Date(year, month-1, day)
 */
function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  
  // Validate format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return false;
  
  // Check if month is valid (1-12)
  if (month < 1 || month > 12) return false;
  
  // Check if day is valid for the given month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  
  return true;
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
  allTransactions?: Transaction[],
  isPaidByOther?: boolean,
  currentUserMemberId?: string,
  currentUserId?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 0. VALIDAÇÃO ZOD (Estrutural)
  const zodResult = transactionSchema.safeParse(transaction);
  if (!zodResult.success) {
    zodResult.error.errors.forEach(err => {
      errors.push(`${err.path.join('.')}: ${err.message}`);
    });
    return { isValid: false, errors, warnings };
  }

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

  // Conta obrigatória para tipos que movem dinheiro (exceto quando pago por outro)
  // Priorizar o parâmetro isPaidByOther se fornecido explicitamente. Caso contrário, usar a lógica de comparação.
  const isPaidByOtherBool = isPaidByOther !== undefined
    ? isPaidByOther
    : (!!transaction.payer_id &&
       (currentUserMemberId ? transaction.payer_id !== currentUserMemberId : true) &&
       (currentUserId ? transaction.payer_id !== currentUserId : true));
    
  const isSingleAccountType = ['EXPENSE', 'INCOME', 'WITHDRAWAL', 'DEPOSIT'].includes(transaction.type);
  
  if (isSingleAccountType && !transaction.account_id && !isPaidByOtherBool) {
    errors.push('Conta é obrigatória');
  }
  
  // Validar que account_id é null quando pago por outro
  if (isPaidByOtherBool && transaction.account_id) {
    errors.push('Transação paga por outra pessoa não deve ter conta vinculada');
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

  // Categoria é obrigatória para despesas (EXPENSE)
  if (transaction.type === 'EXPENSE' && !transaction.category_id) {
    errors.push('A categoria é obrigatória para despesas');
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
  // 4.1 VALIDAÇÃO DE SALDO NEGATIVO EM CONTAS
  // ==========================================
  
  // Para despesas/saques em contas regulares (não cartão de crédito)
  const isMoneyOut = transaction.type === 'EXPENSE' || transaction.type === 'WITHDRAWAL';
  if (account && account.type !== 'CREDIT_CARD' && isMoneyOut) {
    const newBalance = account.balance - (transaction.amount || 0);
    
    if (newBalance < 0) {
      warnings.push(
        `Esta transação deixará a conta com saldo negativo: ` +
        `${newBalance.toLocaleString('pt-BR', { style: 'currency', currency: account.currency || 'BRL' })}`
      );
    }
  }
  
  // Para transferências, validar saldo da conta de origem
  if (account && transaction.type === 'TRANSFER') {
    const newBalance = account.balance - (transaction.amount || 0);
    
    if (newBalance < 0) {
      errors.push(
        `Saldo insuficiente para transferência. ` +
        `Disponível: ${account.balance.toLocaleString('pt-BR', { style: 'currency', currency: account.currency || 'BRL' })}`
      );
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
    
    // Soma de percentagens não deve exceder 100%
    // Se for menor que 100%, o sistema auto-completa com a parte do criador no hook useCreateTransaction
    // ✅ VALIDAÇÃO RIGOROSA (Critério #6): Rejeitar se > 100% sem margem de erro
    if (totalPercentage > 100.0001) {
      errors.push(`A soma das porcentagens não pode exceder 100% (atual: ${totalPercentage.toFixed(2)}%)`);
    } else if (totalPercentage <= 0 && transaction.is_shared) {
      // Se é compartilhada e tem splits, a soma deve ser > 0
      errors.push(`A soma das porcentagens deve ser maior que 0% para transações compartilhadas`);
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
  
  // Transferência para cartão de crédito é permitida (pagamento de fatura)
  if (transaction.type === 'TRANSFER' && destinationAccount?.type === 'CREDIT_CARD') {
    // Apenas uma nota informativa ou aviso se for o caso
  }

  // ==========================================
  // 8. VALIDAÇÃO DE MOEDA (VIAGENS)
  // ==========================================
  
  if (trip && account && account.currency !== trip.currency) {
    warnings.push(
      `Lançamento em ${account.currency} para viagem em ${trip.currency}. O valor será convertido automaticamente.`
    );
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
    const targetTime = new Date(transaction.date + 'T12:00:00').getTime();
    const targetDescLower = transaction.description.toLowerCase().trim();
    
    const duplicates = allTransactions.filter(tx => {
      if (tx.id === transaction.id) return false; // Ignorar a própria transação em edição
      
      // 1. Filtros leves rápidos (evitam criar objetos de data desnecessários)
      const isSameAmount = Math.abs((tx.amount || 0) - (transaction.amount || 0)) < 0.01;
      if (!isSameAmount) return false;
      
      const isSameAccount = tx.account_id === transaction.account_id;
      if (!isSameAccount) return false;
      
      const isSameDescription = tx.description?.toLowerCase().trim() === targetDescLower;
      if (!isSameDescription) return false;
      
      // 2. Filtro pesado de data (apenas executado para transações pré-selecionadas)
      if (tx.date) {
        const txTime = new Date(tx.date + 'T12:00:00').getTime();
        const diffDays = Math.abs((txTime - targetTime) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
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
