export type CurrencyTotals = {
  income: number;
  expense: number;
  balance: number;
};

export interface ExportAccount {
  id?: string;
  name?: string;
  balance?: number | string | null;
  currency?: string | null;
}

export interface ExportTransaction {
  id?: string;
  type?: string;
  amount?: number | string;
  description?: string;
  date?: string | Date;
  category?: { name: string } | null;
  is_installment?: boolean;
  current_installment?: number | null;
  total_installments?: number | null;
  currency?: string | null;
  user_id?: string | null;
  account_id?: string | null;
  destination_account_id?: string | null;
  account?: ExportAccount | null;
}

export interface ExportCard {
  balance?: number | string | null;
  id?: string;
  name?: string;
  credit_limit?: number | string | null;
  currency?: string;
  user_id?: string;
}

export interface ExportInvoiceItem {
  id?: string;
  memberName?: string;
  date?: string | Date;
  description?: string;
  category?: { name: string } | string | null;
  type?: string;
  amount?: number | string;
  isPaid?: boolean;
  tripId?: string | null;
  currency?: string | null;
}

export const resolveItemCurrency = (item: Partial<ExportTransaction>, accounts: ExportAccount[] = []): string => {
  const account = item?.account || accounts.find((a) => a.id === item?.account_id);
  const destinationAccount = accounts.find((a) => a.id === item?.destination_account_id);
  return account?.currency || item?.currency || destinationAccount?.currency || "BRL";
};

export const formatExportMoney = (amount: number, currency = "BRL"): string => {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

export const calculateTransactionTotalsByCurrency = (
  items: Partial<ExportTransaction>[],
  accounts: ExportAccount[] = []
): Record<string, CurrencyTotals> => {
  const totals: Record<string, CurrencyTotals> = {};

  items.forEach((item) => {
    const isIncome = item.type === "INCOME" || item.type === "RECEITA";
    const isExpense = item.type === "EXPENSE" || item.type === "DESPESA";
    if (!isIncome && !isExpense) return;

    const currency = resolveItemCurrency(item, accounts);
    if (!totals[currency]) totals[currency] = { income: 0, expense: 0, balance: 0 };

    if (isIncome) totals[currency].income += Number(item.amount || 0);
    if (isExpense) totals[currency].expense += Number(item.amount || 0);
  });

  Object.values(totals).forEach((total) => {
    total.balance = total.income - total.expense;
  });

  return totals;
};

export const formatTotalsInline = (
  totals: Record<string, CurrencyTotals>,
  field: keyof CurrencyTotals
): string => {
  const entries = Object.entries(totals);
  if (entries.length === 0) return formatExportMoney(0, "BRL");
  return entries.map(([currency, total]) => formatExportMoney(total[field], currency)).join(" / ");
};
