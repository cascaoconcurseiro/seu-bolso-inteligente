import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

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
  const effectiveStartDate = startDate || format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const effectiveEndDate = endDate || format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ["account-statement", accountId, effectiveStartDate, effectiveEndDate, user?.id],
    queryFn: async () => {
      if (!user || !accountId) return { transactions: [], initialBalance: 0 };

      // Buscar saldo inicial da conta
      const { data: accountData } = await supabase
        .from("accounts")
        .select("balance, initial_balance")
        .eq("id", accountId)
        .single();

      const currentBalance = accountData?.balance || 0;

      // Buscar todas as transações da conta (incluindo transferências)
      // IMPORTANTE: Excluir transações compartilhadas (is_shared = true)
      // Transações compartilhadas só aparecem em "Compartilhados", não no extrato da conta
      // Apenas os acertos (settlement transactions) aparecem na conta
      const { data: outgoingTransactions, error: outError } = await supabase
        .from("transactions")
        .select(`
          *,
          category:categories(name, icon),
          transaction_splits(id, amount, user_id, member_id)
        `)
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .eq("is_shared", false) // Excluir compartilhadas
        .gte("date", effectiveStartDate)
        .lte("date", effectiveEndDate)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (outError) throw outError;

      // Buscar transferências de entrada (destination_account_id = conta)
      const { data: incomingTransfers, error: inError } = await supabase
        .from("transactions")
        .select(`
          *,
          category:categories(name, icon),
          transaction_splits(id, amount, user_id, member_id)
        `)
        .eq("user_id", user.id)
        .eq("destination_account_id", accountId)
        .eq("type", "TRANSFER")
        .gte("date", effectiveStartDate)
        .lte("date", effectiveEndDate)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (inError) throw inError;

      // Combinar e processar transações
      const allTransactions = [...(outgoingTransactions || []), ...(incomingTransfers || [])];
      
      // Ordenar por data e created_at
      allTransactions.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Calcular saldo inicial do período (saldo atual - soma das transações do período)
      let periodSum = 0;
      for (const t of allTransactions) {
        const amount = Number(t.amount);
        const txType = String(t.type).toUpperCase();
        if (txType === "INCOME") {
          periodSum += amount;
        } else if (txType === "EXPENSE") {
          periodSum -= amount;
        } else if (txType === "TRANSFER") {
          if (t.destination_account_id === accountId) {
            periodSum += amount; // Entrada
          } else if (t.account_id === accountId) {
            periodSum -= amount; // Saída
          }
        }
      }
      
      const initialBalance = currentBalance - periodSum;

      // Calcular running balance
      let runningBalance = initialBalance;
      const processedTransactions: StatementTransaction[] = allTransactions.map(t => {
        const amount = Number(t.amount);
        const txType = String(t.type).toUpperCase(); // Garantir que type é string uppercase
        let isIncoming = false;
        let displayAmount = 0;

        if (txType === "INCOME") {
          isIncoming = true;
          displayAmount = amount;
          runningBalance += amount;
        } else if (txType === "EXPENSE") {
          isIncoming = false;
          displayAmount = -amount;
          runningBalance -= amount;
        } else if (txType === "TRANSFER") {
          if (t.destination_account_id === accountId) {
            isIncoming = true;
            displayAmount = amount;
            runningBalance += amount;
          } else if (t.account_id === accountId) {
            isIncoming = false;
            displayAmount = -amount;
            runningBalance -= amount;
          }
        }

        return {
          ...t,
          amount, // Garantir que amount é número
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
    staleTime: 30000,
  });
}
