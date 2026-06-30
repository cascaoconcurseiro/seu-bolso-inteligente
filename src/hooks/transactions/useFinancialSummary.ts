import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { callRPCWithRetry } from "@/utils/supabaseHelpers";
import * as dateFns from "date-fns";
import { logger } from "@/utils/logger";
import { defaultQueryConfig } from "@/utils/queryConfig";

export function useFinancialSummary(month: Date) {
  const { user } = useAuth();

  const startDate = dateFns.format(dateFns.startOfMonth(month), "yyyy-MM-dd");
  const endDate = dateFns.format(dateFns.endOfMonth(month), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["financial-summary", user?.id, startDate, endDate],
    queryFn: async () => {
      try {
        const data = await callRPCWithRetry("get_monthly_financial_summary", {
          p_user_id: user!.id,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        interface FinancialSummaryRpc {
          total_balance: number;
          total_income: number;
          total_expenses: number;
          net_savings: number;
        }
        const summary = (Array.isArray(data) ? data[0] : data) as FinancialSummaryRpc | null;
        return {
          balance: summary?.total_balance || 0,
          income: summary?.total_income || 0,
          expenses: summary?.total_expenses || 0,
          savings: summary?.net_savings || 0,
        };
      } catch (error) {
        logger.error("Erro ao buscar resumo financeiro:", error);
        return { balance: 0, income: 0, expenses: 0, savings: 0 };
      }
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}
