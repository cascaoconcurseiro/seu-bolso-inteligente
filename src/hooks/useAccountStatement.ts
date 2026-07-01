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
  displayAmount: number;
  runningBalance: number;
  isInitialBalance?: boolean;
}

interface UseAccountStatementOptions {
  accountId: string;
}

/**
 * Hook de extrato bancário real:
 * - Segue o mês selecionado globalmente no app
 * - Calcula saldo de abertura = soma de TODOS os lançamentos anteriores ao mês
 * - Calcula saldo de fechamento = abertura + movimentos do mês
 * - Mostra saldo acumulado (running balance) em cada linha
 * - O lançamento "Saldo inicial" aparece no mês em que foi criado
 */
export function useAccountStatement({ accountId }: UseAccountStatementOptions) {
  const { user } = useAuth();
  const { currentDate } = useMonth();

  // Mês selecionado no app = janela do extrato (como num banco real)
  const monthStart = dateFns.format(dateFns.startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = dateFns.format(dateFns.endOfMonth(currentDate), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["account-statement", accountId, monthStart, monthEnd, user?.id],
    queryFn: async () => {
      if (!user || !accountId) {
        logger.warn("User ou accountId não definido no useAccountStatement");
        return { transactions: [], openingBalance: 0, closingBalance: 0 };
      }

      // Buscar tipo da conta e saldo atual (Single Source of Truth)
      const { data: accountData } = await supabase
        .from("accounts")
        .select("balance, type")
        .eq("id", accountId)
        .single();

      const dateField = accountData?.type === "CREDIT_CARD" ? "competence_date" : "date";

      // ── 1. Saldo de ABERTURA do mês (via DB — Single Source of Truth) ─────
      // Usa a mesma função que as triggers usam: get_account_balance_at_date
      const { data: openingData } = await supabase
        .rpc("get_account_balance_at_date", {
          p_account_id: accountId,
          p_date: monthStart,
        });

      const openingBalance = Number(openingData ?? 0);

      // ── 2. Transações DO mês selecionado ────────────────────────────────────
      const { data: monthRaw, error: txError } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, currency),
          category:categories(name, icon),
          transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .or(`account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
        .gte(dateField, monthStart)
        .lte(dateField, monthEnd)
        .is("deleted_at", null)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (txError) {
        logger.error("Erro ao buscar transações no extrato:", txError);
        throw txError;
      }

      // Filtrar por segurança
      const monthTransactions = (monthRaw || []).filter((tx) => tx.user_id === user.id);

      // Ordenar cronologicamente
      monthTransactions.sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // ── 3. Calcular saldo acumulado (running balance) ────────────────────────
      let runningBalance = openingBalance;
      const processedTransactions: StatementTransaction[] = monthTransactions.map((t) => {
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

      // ── 3. Saldo de FECHAMENTO (vem do DB — Single Source of Truth) ──────
      const closingBalance = accountData?.balance ?? runningBalance;

      // Retornar na ordem mais recente primeiro (padrão extrato bancário)
      return {
        transactions: processedTransactions.reverse(),
        openingBalance,
        closingBalance,
      };
    },
    enabled: !!user && !!accountId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
