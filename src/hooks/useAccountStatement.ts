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
      console.log('🔍 [useAccountStatement] INÍCIO DA QUERY', {
        accountId,
        user: user?.id,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate
      });

      if (!user || !accountId) {
        console.log('❌ [useAccountStatement] User ou accountId não definido');
        return { transactions: [], initialBalance: 0 };
      }

      // Buscar saldo inicial da conta
      const { data: accountData } = await supabase
        .from("accounts")
        .select("balance, initial_balance")
        .eq("id", accountId)
        .single();

      const currentBalance = accountData?.balance || 0;

      // Buscar transações da conta
      // REGRA: Mostrar TODAS as transações vinculadas a esta conta
      // IMPORTANTE: Especificar FK explicitamente para evitar ambiguidade
      // transaction_splits tem múltiplas FKs para transactions:
      // - transaction_splits_transaction_id_fkey (a que queremos)
      // - transaction_splits_settled_transaction_id_fkey
      // - transaction_splits_debtor_settlement_tx_id_fkey
      // - transaction_splits_creditor_settlement_tx_id_fkey
      const { data: outgoingTransactions, error: outError } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, currency),
          category:categories(name, icon),
          transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .eq("account_id", accountId)
        .gte("date", effectiveStartDate)
        .lte("date", effectiveEndDate)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (outError) {
        console.error('❌ [useAccountStatement] Erro ao buscar transações:', outError);
        throw outError;
      }

      console.log('🔍 [useAccountStatement] Transações encontradas:', {
        accountId,
        outgoingCount: outgoingTransactions?.length || 0,
        outgoing: outgoingTransactions?.map(t => ({ id: t.id, desc: t.description, amount: t.amount, date: t.date }))
      });

      // Buscar transferências de entrada (destination_account_id = conta)
      const { data: incomingTransfers, error: inError } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, currency),
          category:categories(name, icon),
          transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .eq("destination_account_id", accountId)
        .eq("type", "TRANSFER")
        .gte("date", effectiveStartDate)
        .lte("date", effectiveEndDate)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (inError) {
        console.error('❌ [useAccountStatement] Erro ao buscar transferências:', inError);
        throw inError;
      }

      console.log('🔍 [useAccountStatement] Transferências de entrada:', {
        accountId,
        incomingCount: incomingTransfers?.length || 0,
        incoming: incomingTransfers?.map(t => ({ id: t.id, desc: t.description, amount: t.amount, date: t.date }))
      });

      // Combinar e processar transações
      // Filtrar apenas transações de contas do usuário (segurança)
      const allTransactions = [
        ...(outgoingTransactions || []),
        ...(incomingTransfers || [])
      ].filter(tx => tx.user_id === user.id); // Garantir que só vê suas próprias transações

      console.log('🔍 [useAccountStatement] Após filtro de segurança:', {
        totalBefore: (outgoingTransactions?.length || 0) + (incomingTransfers?.length || 0),
        totalAfter: allTransactions.length,
        userId: user.id,
        filtered: allTransactions.map(t => ({ id: t.id, desc: t.description, user_id: t.user_id, date: t.date }))
      });
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
    staleTime: 0, // Sempre buscar dados frescos para debug
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
