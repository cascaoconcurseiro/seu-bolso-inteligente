import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { logger } from "@/utils/logger";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";

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
}

interface UseAccountStatementOptions {
  accountId: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook para buscar o extrato completo de uma conta
 * Inclui todas as transações: despesas, receitas e transferências
 */
export function useAccountStatement({ accountId, startDate, endDate }: UseAccountStatementOptions) {
  const { user } = useAuth();
  const { currentDate } = useMonth();

  // Se não há filtros de data, usar o mês atual
  const effectiveStartDate = startDate || dateFns.format(dateFns.startOfMonth(currentDate), 'yyyy-MM-dd');
  const effectiveEndDate = endDate || dateFns.format(dateFns.endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ["account-statement", accountId, effectiveStartDate, effectiveEndDate, user?.id],
    queryFn: async () => {
      if (!user || !accountId) {
        logger.warn('User ou accountId não definido no useAccountStatement');
        return { transactions: [], initialBalance: 0 };
      }

      // Buscar saldo inicial da conta
      const { data: accountData } = await supabase
        .from("accounts")
        .select("balance, initial_balance, type")
        .eq("id", accountId)
        .single();

      const currentBalance = accountData?.balance || 0;

      // Buscar TODAS as transações da conta (saída E entrada de transferência) em uma única query
      const { data: allTransactionsRaw, error: txError } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, currency),
          category:categories(name, icon),
          transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .or(`account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
        .gte(accountData?.type === 'CREDIT_CARD' ? "competence_date" : "date", effectiveStartDate)
        .lte(accountData?.type === 'CREDIT_CARD' ? "competence_date" : "date", effectiveEndDate)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (txError) {
        logger.error('Erro ao buscar transações no extrato:', txError);
        throw txError;
      }

      // Filtrar apenas transações de contas do usuário (segurança)
      const allTransactions = (allTransactionsRaw || []).filter(tx => tx.user_id === user.id);

      // Ordenar por data e created_at
      allTransactions.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Calcular saldo inicial do período (saldo atual - soma das transações do período)
      let periodSum = 0;
      for (const t of allTransactions) {
        const txType = String(t.type).toUpperCase();
        if (txType === "INCOME") {
          periodSum = SafeFinancialCalculator.add(periodSum, Number(t.amount));
        } else if (txType === "EXPENSE") {
          periodSum = SafeFinancialCalculator.subtract(periodSum, Number(t.amount));
        } else if (txType === "TRANSFER") {
          if (t.destination_account_id === accountId) {
            // Se for entrada, usar destination_amount se houver (caso de câmbio)
            const amt = t.destination_amount !== null && t.destination_amount !== undefined 
              ? Number(t.destination_amount) 
              : Number(t.amount);
            periodSum = SafeFinancialCalculator.add(periodSum, amt); // Entrada
          } else if (t.account_id === accountId) {
            periodSum = SafeFinancialCalculator.subtract(periodSum, Number(t.amount)); // Saída (sempre do valor original)
          }
        }
      }

      const initialBalance = SafeFinancialCalculator.subtract(currentBalance, periodSum);

      // Calcular running balance
      let runningBalance = initialBalance;
      const processedTransactions: StatementTransaction[] = allTransactions.map(t => {
        const txType = String(t.type).toUpperCase(); // Garantir que type é string uppercase
        let isIncoming = false;
        let displayAmount = 0;
        let amt = Number(t.amount);
        let curr = t.currency;

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
            // Se for entrada na conta selecionada, usar destination_amount e destination_currency se houver
            amt = t.destination_amount !== null && t.destination_amount !== undefined 
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
          amount: amt, // Sobrescrever com o valor adequado para a conta
          currency: curr, // Sobrescrever com a moeda adequada para a conta
          type: txType as "EXPENSE" | "INCOME" | "TRANSFER",
          isIncoming,
          displayAmount,
          runningBalance,
        };
      });

      // Inverter para mostrar mais recente primeiro
      return {
        transactions: processedTransactions.reverse(),
        initialBalance,
        currentBalance,
      };
    },
    enabled: !!user && !!accountId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
