import { Transaction } from "@/hooks/useTransactions";

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: string;
  credit: string;
  amount: number;
}

export interface TrialBalanceItem {
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Generates Double-Entry Ledger from transactions
 * Implements proper accounting principles
 */
export const generateLedger = (
  transactions: Transaction[],
  accounts: Array<{ id: string; name: string }>
): LedgerEntry[] => {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const accountIds = new Set(accounts.map((a) => a.id));
  const getAccountName = (id: string) => accountMap.get(id) || "Conta Desconhecida";

  const ledger: LedgerEntry[] = [];

  // Filter active transactions
  const activeTransactions = transactions.filter((tx) => !tx.deleted);

  activeTransactions.forEach((tx) => {
    if (!tx.amount || tx.amount <= 0) return;

    // Validate account exists
    if (!tx.account_id || !accountIds.has(tx.account_id)) {
      return;
    }

    // Validate destination for transfers
    if (tx.type === "TRANSFER" && tx.destination_account_id) {
      if (!accountIds.has(tx.destination_account_id)) {
        return;
      }
    }

    const date = tx.date;
    const description = tx.description;
    const amount = tx.amount;

    if (tx.type === "EXPENSE") {
      // Expense: Debit Category, Credit Account
      ledger.push({
        id: tx.id,
        date,
        description,
        debit: tx.category?.name || "Despesa",
        credit: getAccountName(tx.account_id),
        amount,
      });
    } else if (tx.type === "INCOME") {
      // Income: Debit Account, Credit Category
      ledger.push({
        id: tx.id,
        date,
        description,
        debit: getAccountName(tx.account_id),
        credit: tx.category?.name || "Receita",
        amount,
      });
    } else if (tx.type === "TRANSFER") {
      // Transfer: Debit Destination, Credit Source
      const sourceName = getAccountName(tx.account_id);
      const destName = tx.destination_account_id
        ? getAccountName(tx.destination_account_id)
        : "Externo";

      ledger.push({
        id: tx.id,
        date,
        description,
        debit: destName,
        credit: sourceName,
        amount,
      });
    }
  });

  return ledger.sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Calculates Trial Balance
 */
export const getTrialBalance = (ledger: LedgerEntry[]): TrialBalanceItem[] => {
  const balances = new Map<string, { debit: number; credit: number }>();

  const ensureAccount = (name: string) => {
    if (!balances.has(name)) {
      balances.set(name, { debit: 0, credit: 0 });
    }
  };

  ledger.forEach((entry) => {
    ensureAccount(entry.debit);
    ensureAccount(entry.credit);

    balances.get(entry.debit)!.debit += entry.amount;
    balances.get(entry.credit)!.credit += entry.amount;
  });

  return Array.from(balances.entries())
    .map(([name, val]) => ({
      accountName: name,
      debit: val.debit,
      credit: val.credit,
      balance: val.debit - val.credit,
    }))
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
};

/**
 * Integrity Verification Result
 */
export interface IntegrityResult {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  trialBalanceSum: number;
  orphanedTransactions: string[];
  errors: string[];
}

/**
 * Verifies accounting integrity
 * - Debits must equal Credits
 * - Trial Balance must sum to zero
 * - No orphaned transactions
 */
export const verifyIntegrity = (
  ledger: LedgerEntry[],
  transactions: Transaction[],
  accounts: Array<{ id: string; name: string }>
): IntegrityResult => {
  const errors: string[] = [];
  const accountIds = new Set(accounts.map((a) => a.id));
  
  // Calculate total debits and credits
  let totalDebits = 0;
  let totalCredits = 0;
  
  ledger.forEach((entry) => {
    totalDebits += entry.amount;
    totalCredits += entry.amount;
  });
  
  const difference = Math.abs(totalDebits - totalCredits);
  
  // Check if debits equal credits (should always be true in double-entry)
  if (difference > 0.01) {
    errors.push(`Débitos (${totalDebits.toFixed(2)}) não igualam Créditos (${totalCredits.toFixed(2)})`);
  }
  
  // Calculate trial balance sum
  const trialBalance = getTrialBalance(ledger);
  const trialBalanceSum = trialBalance.reduce((sum, item) => sum + item.balance, 0);
  
  // Trial balance should sum to zero
  if (Math.abs(trialBalanceSum) > 0.01) {
    errors.push(`Trial Balance não fecha em zero (soma: ${trialBalanceSum.toFixed(2)})`);
  }
  
  // Find orphaned transactions (transactions without valid accounts)
  const orphanedTransactions: string[] = [];
  
  transactions.forEach((tx) => {
    // Skip transactions paid by others (they don't need accounts)
    if (tx.payer_id && tx.payer_id !== tx.user_id) {
      return;
    }
    
    // Skip mirror transactions
    if (tx.source_transaction_id) {
      return;
    }
    
    // Check if account exists
    if (tx.account_id && !accountIds.has(tx.account_id)) {
      orphanedTransactions.push(tx.id);
      errors.push(`Transação ${tx.id} referencia conta inexistente: ${tx.account_id}`);
    }
    
    // Check destination account for transfers
    if (tx.type === 'TRANSFER' && tx.destination_account_id && !accountIds.has(tx.destination_account_id)) {
      orphanedTransactions.push(tx.id);
      errors.push(`Transferência ${tx.id} referencia conta destino inexistente: ${tx.destination_account_id}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    totalDebits,
    totalCredits,
    difference,
    trialBalanceSum,
    orphanedTransactions,
    errors,
  };
};

/**
 * Calculates expected account balance from transactions
 * Useful for reconciliation
 */
export const calculateExpectedBalance = (
  accountId: string,
  transactions: Transaction[],
  initialBalance: number = 0
): number => {
  let balance = initialBalance;
  
  transactions.forEach((tx) => {
    // Skip transactions paid by others
    if (tx.payer_id && tx.payer_id !== tx.user_id) {
      return;
    }
    
    // Skip mirror transactions
    if (tx.source_transaction_id) {
      return;
    }
    
    if (tx.account_id === accountId) {
      if (tx.type === 'INCOME') {
        balance += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        balance -= tx.amount;
      } else if (tx.type === 'TRANSFER') {
        balance -= tx.amount; // Saída da conta origem
      }
    }
    
    if (tx.type === 'TRANSFER' && tx.destination_account_id === accountId) {
      balance += tx.amount; // Entrada na conta destino
    }
  });
  
  return balance;
};
