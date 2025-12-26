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
