import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";

export type StatementPeriod = "30d" | "90d" | "current_month" | "current_year" | "all";

export interface StatementTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  amount: number;
  description: string;
  date: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  currency: string | null;
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  is_shared: boolean;
  created_at: string;
  category?: { name: string; icon: string | null };
  // Campos calculados para o extrato
  isIncoming: boolean;
  displayAmount: number; // Positivo para entrada, negativo para saída
  runningBalance: number;
  isInitialBalance?: boolean; // Marcador para o lançamento inicial
}

interface UseAccountStatementOptions {
  accountId: string;
  period?: StatementPeriod;
  startDate?: string; // override manual
  endDate?: string;   // override manual
}

/**
 * Calcula as datas de início e fim com base no período selecionado.
 * Retorna null para ambos quando o período é "all" (sem filtro).
 */
export function getPeriodDates(period: StatementPeriod): { startDate: string | null; endDate: string | null } {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  if (period === "all") return { startDate: null, endDate: null };

  if (period === "30d") {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return { startDate: d.toISOString().split("T")[0], endDate: todayStr };
  }

  if (period === "90d") {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return { startDate: d.toISOString().split("T")[0], endDate: todayStr };
  }

  if (period === "current_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  if (period === "current_year") {
    return {
      startDate: `${today.getFullYear()}-01-01`,
      endDate: `${today.getFullYear()}-12-31`,
    };
  }

  return { startDate: null, endDate: null };
}

/**
 * Hook para buscar o extrato completo de uma conta, funcionando como banco real.
 * - Suporta todo o histórico (sem filtro de data) ou períodos específicos.
 * - Sempre mostra o lançamento inicial, independente do período.
 * - Calcula saldo acumulado (running balance) linha a linha.
 * - Retorna saldo de abertura do período selecionado.
 */
export function useAccountStatement({ accountId, period = "all", startDate, endDate }: UseAccountStatementOptions) {
  const { user } = useAuth();

  const periodDates = getPeriodDates(period);
  const effectiveStartDate = startDate ?? periodDates.startDate;
  const effectiveEndDate = endDate ?? periodDates.endDate;

  return useQuery({
    queryKey: ["account-statement", accountId, effectiveStartDate, effectiveEndDate, user?.id],
    queryFn: async () => {
      if (!user || !accountId) {
        logger.warn("User ou accountId não definido no useAccountStatement");
        return { transactions: [], initialBalance: 0, currentBalance: 0, openingBalance: 0 };
      }

      // Buscar dados da conta
      const { data: accountData } = await supabase
        .from("accounts")
        .select("balance, initial_balance, type, created_at")
        .eq("id", accountId)
        .single();

      const currentBalance = accountData?.balance || 0;

      // Montar query de transações. Se sem data, busca todo o histórico.
      let query = supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, currency),
          category:categories(name, icon),
          transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .or(`account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      // Aplicar filtros de data apenas se fornecidos
      const dateField = accountData?.type === "CREDIT_CARD" ? "competence_date" : "date";
      if (effectiveStartDate) query = query.gte(dateField, effectiveStartDate);
      if (effectiveEndDate) query = query.lte(dateField, effectiveEndDate);

      const { data: allTransactionsRaw, error: txError } = await query;

      if (txError) {
        logger.error("Erro ao buscar transações no extrato:", txError);
        throw txError;
      }

      // Filtrar por segurança (só transações do usuário)
      const allTransactions = (allTransactionsRaw || []).filter((tx) => tx.user_id === user.id);

      // Ordenar cronologicamente
      allTransactions.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Quando há filtro de período, calcular o saldo de abertura do período.
      // Quando é "todo o histórico", o saldo de abertura é sempre 0 (inclui tudo).
      let openingBalance = 0;
      if (effectiveStartDate) {
        // Buscar todas as transações ANTES do período para calcular o saldo de abertura
        let prevQuery = supabase
          .from("transactions")
          .select("type, amount, destination_account_id, account_id, destination_amount")
          .or(`account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
          .lt(dateField, effectiveStartDate);

        const { data: prevTransactions } = await prevQuery;
        const prevTxs = (prevTransactions || []).filter((tx: any) => tx.user_id !== undefined);

        // Somar tudo anterior ao período = saldo de abertura
        let prevSum = 0;
        for (const t of prevTransactions || []) {
          const txType = String(t.type).toUpperCase();
          if (txType === "INCOME") {
            prevSum = SafeFinancialCalculator.add(prevSum, Number(t.amount));
          } else if (txType === "EXPENSE") {
            prevSum = SafeFinancialCalculator.subtract(prevSum, Number(t.amount));
          } else if (txType === "TRANSFER") {
            if (t.destination_account_id === accountId) {
              const amt = t.destination_amount != null ? Number(t.destination_amount) : Number(t.amount);
              prevSum = SafeFinancialCalculator.add(prevSum, amt);
            } else if (t.account_id === accountId) {
              prevSum = SafeFinancialCalculator.subtract(prevSum, Number(t.amount));
            }
          }
        }
        openingBalance = prevSum;
      }

      // Calcular soma do período para obter initialBalance (= currentBalance - periodSum)
      // Isso garante que o running balance ao final = currentBalance
      let periodSum = 0;
      for (const t of allTransactions) {
        const txType = String(t.type).toUpperCase();
        if (txType === "INCOME") {
          periodSum = SafeFinancialCalculator.add(periodSum, Number(t.amount));
        } else if (txType === "EXPENSE") {
          periodSum = SafeFinancialCalculator.subtract(periodSum, Number(t.amount));
        } else if (txType === "TRANSFER") {
          if (t.destination_account_id === accountId) {
            const amt = t.destination_amount != null && t.destination_amount !== undefined
              ? Number(t.destination_amount)
              : Number(t.amount);
            periodSum = SafeFinancialCalculator.add(periodSum, amt);
          } else if (t.account_id === accountId) {
            periodSum = SafeFinancialCalculator.subtract(periodSum, Number(t.amount));
          }
        }
      }

      // initialBalance = saldo real antes do primeiro lançamento listado
      const initialBalance = SafeFinancialCalculator.subtract(currentBalance, periodSum);

      // Calcular running balance linha a linha
      let runningBalance = initialBalance;
      const processedTransactions: StatementTransaction[] = allTransactions.map((t) => {
        const txType = String(t.type).toUpperCase();
        let isIncoming = false;
        let displayAmount = 0;
        let amt = Number(t.amount);
        let curr = t.currency;
        const isInitialBalance = t.description === "Saldo inicial";

        if (txType === "INCOME") {
          isIncoming = true;
          displayAmount = amt;
          runningBalance = SafeFinancialCalculator.add(runningBalance, amt);
        } else if (txType === "EXPENSE") {
          isIncoming = false;
          displayAmount = -amt;
          runningBalance = SafeFinancialCalculator.subtract(runningBalance, amt);
        } else if (txType === "TRANSFER") {
          if (t.destination_account_id === accountId) {
            isIncoming = true;
            amt = t.destination_amount != null && t.destination_amount !== undefined
              ? Number(t.destination_amount)
              : Number(t.amount);
            curr = t.destination_currency || t.currency;
            displayAmount = amt;
            runningBalance = SafeFinancialCalculator.add(runningBalance, amt);
          } else if (t.account_id === accountId) {
            isIncoming = false;
            displayAmount = -amt;
            runningBalance = SafeFinancialCalculator.subtract(runningBalance, amt);
          }
        }

        return {
          ...t,
          amount: amt,
          currency: curr,
          type: txType as "EXPENSE" | "INCOME" | "TRANSFER",
          isIncoming,
          displayAmount,
          runningBalance,
          isInitialBalance,
        };
      });

      // Inverter para mostrar mais recente primeiro
      return {
        transactions: processedTransactions.reverse(),
        initialBalance,
        currentBalance,
        openingBalance, // Saldo de abertura do período (para exibição no header do extrato)
      };
    },
    enabled: !!user && !!accountId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
