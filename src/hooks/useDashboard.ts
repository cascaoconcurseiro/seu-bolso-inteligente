import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import { getMonthDateRange } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';

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
  category: { id: string; name: string; icon: string | null } | null;
  account: { id: string; name: string; currency: string | null } | null;
}

export interface DashboardSummary {
  total_income: number;
  total_expense: number;
  pending_income: number;
  pending_expense: number;
  balance: number;
  totals_by_currency: { currency: string; income: number; expense: number; pending_income: number; pending_expense: number; balance: number }[];
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
    queryKey: ['dashboard-data', user?.id, monthKey],
    staleTime: 1000 * 60 * 5, // 5 minutes cache to avoid excessive refetching
    queryFn: async (): Promise<DashboardSummary> => {
      if (!user) return { total_income: 0, total_expense: 0, pending_income: 0, pending_expense: 0, balance: 0, totals_by_currency: [], recent_transactions: [] };

      const { data, error } = await (supabase.rpc as any)('get_dashboard_summary', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        logger.error('[useDashboardData] Erro RPC:', JSON.stringify(error, null, 2));
        return { total_income: 0, total_expense: 0, pending_income: 0, pending_expense: 0, balance: 0, totals_by_currency: [], recent_transactions: [] };
      }

      return {
        total_income: Number(data?.total_income) || 0,
        total_expense: Number(data?.total_expense) || 0,
        pending_income: Number(data?.pending_income) || 0,
        pending_expense: Number(data?.pending_expense) || 0,
        balance: Number(data?.balance) || 0,
        totals_by_currency: data?.totals_by_currency || [],
        recent_transactions: (data?.recent_transactions as DashboardTransaction[]) || [],
      };
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook para evolução mensal — retorna dados dos últimos N meses via RPC.
 * Substitui o cálculo manual em Reports.tsx que iterava sobre 1000 transações.
 */
export function useMonthlyEvolutionReport(months: number = 6, currency: string = 'BRL') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-evolution-report', user?.id, months, currency],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase.rpc as any)('get_monthly_evolution_report', {
        p_user_id: user.id,
        p_months: months,
      });

      if (error) {
        logger.error('[useMonthlyEvolutionReport] Erro RPC:', error);
        return [];
      }

      // Filtrar a moeda desejada
      const currencyData = (Array.isArray(data) ? data : []).filter(
        (row: any) => (row.currency || 'BRL') === currency
      );

      return currencyData.map((row: any) => ({
        month_start: row.month_date,
        income: Number(row.total_income) || 0,
        expense: Number(row.total_expense) || 0,
        savings: (Number(row.total_income) || 0) - (Number(row.total_expense) || 0),
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
