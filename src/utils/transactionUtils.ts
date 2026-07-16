import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { TransactionType, TransactionDomain, DBTransactionSplit } from "@/hooks/transactions/types";
export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  trip_id: string | null;
  amount: number;
  description: string;
  date: string;
  competence_date: string;
  type: TransactionType;
  currency: string | null;
  domain: TransactionDomain;
  is_shared: boolean;
  payer_id: string | null;
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  series_id: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  source_transaction_id: string | null;
  external_id?: string | null;
  notes: string | null;
  exchange_rate: number | null;
  destination_amount: number | null;
  destination_currency: string | null;
  created_at: string;
  updated_at: string;
  creator_user_id?: string | null;
  transaction_splits?: DBTransactionSplit[];
  settled_as_debtor?: unknown[];
  settled_as_creditor?: unknown[];
  // Joined data
  account?: { id: string; name: string; currency?: string; type?: string; bank_id?: string | null };
  category?: { id: string; name: string; icon: string | null };
}

export interface DayGroup {
  date: string; // YYYY-MM-DD
  label: string; // "Hoje", "Ontem", "25 de dezembro"
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number; // totalIncome - totalExpense
  balancesByCurrency: Record<
    string,
    {
      totalIncome: number;
      totalExpense: number;
      balance: number;
    }
  >;
}

export function getTransactionCurrency(transaction: {
  currency?: string | null;
  account?: { currency?: string | null } | null;
}): string {
  return transaction.account?.currency || transaction.currency || "BRL";
}

/**
 * Gera um label amigável para a data
 * Ex: "Hoje", "Ontem", "25 de dezembro"
 */
export function getDateLabel(dateStr: string): string {
  if (!dateStr) return "Data indefinida";

  const date = dateFns.parseISO(dateStr);

  if (!dateFns.isValid(date)) {
    return "Data inválida";
  }

  if (dateFns.isToday(date)) {
    return "Hoje";
  }

  if (dateFns.isYesterday(date)) {
    return "Ontem";
  }

  // Formato: "25 de dezembro"
  return dateFns.format(date, "d 'de' MMMM", { locale: ptBR });
}

/**
 * Agrupa transações por dia e calcula totais
 * Exclui transferências (aparecem apenas no extrato)
 */
export function groupTransactionsByDay(transactions: Transaction[]): DayGroup[] {
  // Agrupar por data (incluindo transferências para exibir pagamentos de fatura)
  const groupsMap = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const dateKey = transaction.date.split("T")[0]; // YYYY-MM-DD

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
    }
    groupsMap.get(dateKey)!.push(transaction);
  }

  // Converter para array de DayGroup
  const groups: DayGroup[] = [];

  for (const [date, dayTransactions] of groupsMap) {
    // Ordenar transações dentro do dia por created_at (mais recente primeiro)
    const sortedTransactions = [...dayTransactions].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Calcular totais por moeda para não misturar BRL, EUR, USD etc.
    let totalIncome = 0;
    let totalExpense = 0;
    const balancesByCurrency: DayGroup["balancesByCurrency"] = {};

    for (const t of sortedTransactions) {
      const amount = Number(t.amount);
      const currency = getTransactionCurrency(t);
      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = { totalIncome: 0, totalExpense: 0, balance: 0 };
      }

      if (t.type === "INCOME") {
        totalIncome = SafeFinancialCalculator.add(totalIncome, amount).toNumber();
        balancesByCurrency[currency].totalIncome = SafeFinancialCalculator.add(
          balancesByCurrency[currency].totalIncome,
          amount
        ).toNumber();
      } else if (t.type === "EXPENSE") {
        totalExpense = SafeFinancialCalculator.add(totalExpense, amount).toNumber();
        balancesByCurrency[currency].totalExpense = SafeFinancialCalculator.add(
          balancesByCurrency[currency].totalExpense,
          amount
        ).toNumber();
      }
    }

    Object.values(balancesByCurrency).forEach((totals) => {
      totals.balance = SafeFinancialCalculator.subtract(
        totals.totalIncome,
        totals.totalExpense
      ).toNumber();
    });

    groups.push({
      date,
      label: getDateLabel(date),
      transactions: sortedTransactions,
      totalIncome,
      totalExpense,
      balance: SafeFinancialCalculator.subtract(totalIncome, totalExpense).toNumber(),
      balancesByCurrency,
    });
  }

  // Ordenar grupos por data (mais recente primeiro)
  groups.sort((a, b) => b.date.localeCompare(a.date));

  return groups;
}

/**
 * Filtro de transações reutilizável aplicando search, tipo, categoria, conta, período e moeda.
 * Extraído de Transactions.tsx para eliminar duplicação entre filteredTransactions e filteredAnnualTransactions.
 */
export interface TransactionFilters {
  searchQuery: string;
  selectedType: string;
  selectedCategory: string;
  selectedAccount: string;
  selectedPeriod: string;
  selectedCurrency: string;
  userId?: string;
  familyMembers?: Array<{ id: string; linked_user_id: string | null }>;
}

export function applyTransactionFilters<
  T extends {
    id: string;
    description: string;
    type: string;
    date: string;
    category?: { id: string; name: string } | null;
    account?: { id: string; name: string; type?: string } | null;
    account_id?: string | null;
    destination_account_id?: string | null;
    source_transaction_id?: string | null;
    is_shared?: boolean;
    creator_user_id?: string | null;
    payer_id?: string | null;
    currency?: string | null;
  },
>(transactions: T[], filters: TransactionFilters): T[] {
  const periodDates = getPeriodDates(filters.selectedPeriod);

  return transactions.filter((t) => {
    const txCurrency = getTransactionCurrency(
      t as { currency?: string | null; account?: { currency?: string | null } | null }
    );
    if (filters.selectedCurrency !== "all" && txCurrency !== filters.selectedCurrency) return false;

    if (
      t.source_transaction_id &&
      t.source_transaction_id !== null &&
      filters.selectedAccount === "all"
    )
      return false;

    if (t.is_shared === true) {
      const isCreator = t.creator_user_id === filters.userId;
      const myFamilyMember = filters.familyMembers?.find(
        (m) => m.linked_user_id === filters.userId
      );
      const isPayer = myFamilyMember && t.payer_id === myFamilyMember.id;
      if (!isCreator && !isPayer) return false;
    }

    const matchesSearch = t.description.toLowerCase().includes(filters.searchQuery.toLowerCase());
    const matchesType =
      filters.selectedType === "all" ||
      t.type === filters.selectedType ||
      (filters.selectedType === "EXPENSE" &&
        t.type === "TRANSFER" &&
        (filters.selectedAccount === "all" || t.account_id === filters.selectedAccount)) ||
      (filters.selectedType === "INCOME" &&
        t.type === "TRANSFER" &&
        t.destination_account_id === filters.selectedAccount);
    const matchesCategory =
      filters.selectedCategory === "all" || t.category?.id === filters.selectedCategory;
    const matchesAccount =
      filters.selectedAccount === "all" || t.account?.id === filters.selectedAccount;

    let matchesPeriod = true;
    if (periodDates) {
      const txDate = new Date(t.date + "T12:00:00");
      matchesPeriod =
        txDate >= periodDates.start && txDate <= new Date(periodDates.end.getTime() + 86400000 - 1);
    }

    return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesPeriod;
  });
}

function getPeriodDates(period: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  switch (period) {
    case "today":
      return { start: today, end: today };
    case "week": {
      const weekStart = new Date(today);
      weekStart.setUTCDate(today.getUTCDate() - 7);
      return { start: weekStart, end: today };
    }
    case "month":
      return { start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)), end: today };
    case "lastMonth":
      return {
        start: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1)),
        end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return null;
  }
}
