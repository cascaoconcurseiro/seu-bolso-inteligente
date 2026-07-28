import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { getMonthDateRange } from "@/utils/dateUtils";
import { logger } from "@/utils/logger";

export interface DashboardTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string | null;
  date: string;
  description: string;
  is_shared: boolean;
  payer_id: string | null;
  account_id: string | null;
  source_transaction_id: string | null;
  creator_user_id?: string | null;
  category: { id: string; name: string; icon: string | null } | null;
  account: { id: string; name: string; currency: string | null } | null;
}

export interface DashboardSummary {
  total_income: number;
  total_expense: number;
  pending_income: number;
  pending_expense: number;
  balance: number;
  totals_by_currency: {
    currency: string;
    income: number;
    expense: number;
    pending_income: number;
    pending_expense: number;
    balance: number;
  }[];
  recent_transactions: DashboardTransaction[];
}

/**
 * Hook de alta performance para o Dashboard.
 * Substitui useTransactions() (1000 rows) por uma RPC que retorna
 * apenas os totais + 5 transações recentes em uma única chamada.
 */
export function useDashboardData() {
  const { user } = useAuth();
  const { currentDate, startDay } = useMonth();
  const { startDate, endDate, monthKey } = getMonthDateRange(currentDate, startDay);

  return useQuery({
    queryKey: ["dashboard-data", user?.id, monthKey],
    staleTime: 1000 * 30, // 30s — dados financeiros devem ser sempre frescos
    queryFn: async (): Promise<DashboardSummary> => {
      if (!user)
        return {
          total_income: 0,
          total_expense: 0,
          pending_income: 0,
          pending_expense: 0,
          balance: 0,
          totals_by_currency: [],
          recent_transactions: [],
        };

      const { data, error } = await supabase.rpc("get_dashboard_summary_v2", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        logger.error("[useDashboardData] Erro RPC:", JSON.stringify(error, null, 2));
        throw error;
      }

      const summary = (data ?? {}) as Partial<DashboardSummary>;
      return {
        total_income: Number(summary.total_income) || 0,
        total_expense: Number(summary.total_expense) || 0,
        pending_income: Number(summary.pending_income) || 0,
        pending_expense: Number(summary.pending_expense) || 0,
        balance: Number(summary.balance) || 0,
        totals_by_currency: summary.totals_by_currency ?? [],
        recent_transactions: summary.recent_transactions ?? [],
      };
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
