import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

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
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  currency: string | null;
  domain: "PERSONAL" | "SHARED" | "TRAVEL";
  is_shared: boolean;
  payer_id: string | null;
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  series_id: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  source_transaction_id: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  creator_user_id?: string | null;
  transaction_splits?: {
    id: string;
    member_id: string;
    amount: number;
    is_settled: boolean;
    paid_at?: string | null;
    settled_at?: string | null;
    payer_account_id?: string | null;
  }[];
  // Joined data
  account?: { id: string; name: string; currency?: string; bank_id?: string | null };
  category?: { id: string; name: string; icon: string | null };
}

export interface DayGroup {
  date: string;           // YYYY-MM-DD
  label: string;          // "Hoje", "Ontem", "25 de dezembro"
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;        // totalIncome - totalExpense
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
    
    // Calcular totais
    let totalIncome = 0;
    let totalExpense = 0;
    
    for (const t of sortedTransactions) {
      const amount = Number(t.amount);
      if (t.type === "INCOME") {
        totalIncome += amount;
      } else if (t.type === "EXPENSE") {
        totalExpense += amount;
      }
    }
    
    groups.push({
      date,
      label: getDateLabel(date),
      transactions: sortedTransactions,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  }
  
  // Ordenar grupos por data (mais recente primeiro)
  groups.sort((a, b) => b.date.localeCompare(a.date));
  
  return groups;
}

/**
 * Calcula o running balance (saldo acumulado) para um extrato
 * Usado na página de detalhes da conta
 */
export interface StatementEntry {
  transaction: Transaction;
  runningBalance: number;
  isIncoming: boolean;
}

export function calculateRunningBalance(
  transactions: Transaction[],
  initialBalance: number,
  accountId: string
): StatementEntry[] {
  // Ordenar por data crescente para calcular saldo acumulado
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  let runningBalance = initialBalance;
  const entries: StatementEntry[] = [];
  
  for (const transaction of sorted) {
    const amount = Number(transaction.amount);
    let isIncoming = false;
    
    if (transaction.type === "INCOME") {
      runningBalance += amount;
      isIncoming = true;
    } else if (transaction.type === "EXPENSE") {
      runningBalance -= amount;
      isIncoming = false;
    } else if (transaction.type === "TRANSFER") {
      // Transferência: verificar direção
      if (transaction.destination_account_id === accountId) {
        // Entrada na conta
        runningBalance += amount;
        isIncoming = true;
      } else if (transaction.account_id === accountId) {
        // Saída da conta
        runningBalance -= amount;
        isIncoming = false;
      }
    }
    
    entries.push({
      transaction,
      runningBalance,
      isIncoming,
    });
  }
  
  // Inverter para mostrar mais recente primeiro
  return entries.reverse();
}

/**
 * Filtra contas baseado na moeda da viagem
 */
export interface Account {
  id: string;
  name: string;
  is_international: boolean;
  currency: string;
  type: string;
}

export function filterAccountsByTripCurrency(
  accounts: Account[],
  tripCurrency?: string | null
): { filteredAccounts: Account[]; hasCompatibleAccounts: boolean; message?: string } {
  // Excluir cartões de crédito (não são contas para transações normais)
  const nonCreditCards = accounts.filter(a => a.type !== "CREDIT_CARD");
  
  if (!tripCurrency || tripCurrency === "BRL") {
    // Sem viagem ou viagem nacional: mostrar apenas contas nacionais
    const filtered = nonCreditCards.filter(a => !a.is_international);
    return {
      filteredAccounts: filtered,
      hasCompatibleAccounts: filtered.length > 0,
      message: filtered.length === 0 ? "Nenhuma conta nacional encontrada." : undefined,
    };
  }
  
  // Viagem internacional: mostrar apenas contas na moeda da viagem
  const filtered = nonCreditCards.filter(a => a.currency === tripCurrency);
  return {
    filteredAccounts: filtered,
    hasCompatibleAccounts: filtered.length > 0,
    message: filtered.length === 0 
      ? `Nenhuma conta encontrada na moeda ${tripCurrency}. Crie uma conta internacional.`
      : undefined,
  };
}
