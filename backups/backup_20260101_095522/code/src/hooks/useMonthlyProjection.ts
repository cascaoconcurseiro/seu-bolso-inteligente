import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { format, endOfMonth } from "date-fns";

export interface MonthlyProjection {
  current_balance: number;
  future_income: number;
  future_expenses: number;
  credit_card_invoices: number;
  shared_debts: number;
  projected_balance: number;
}

/**
 * Hook para buscar a projeção completa do fim do mês
 * 
 * Considera:
 * - Saldo atual das contas
 * - Receitas futuras do mês
 * - Despesas futuras do mês
 * - Faturas de cartão pendentes
 * - Dívidas com compartilhados
 */
export function useMonthlyProjection() {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  const currentMonth = format(currentDate, 'yyyy-MM');

  return useQuery({
    queryKey: ["monthly-projection", user?.id, currentMonth],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_monthly_projection', {
        p_user_id: user.id,
        p_end_date: endDate,
      });

      if (error) {
        console.error('Erro ao buscar projeção mensal:', error);
        return null;
      }

      const projection = data?.[0];
      if (!projection) return null;

      return {
        current_balance: Number(projection.current_balance) || 0,
        future_income: Number(projection.future_income) || 0,
        future_expenses: Number(projection.future_expenses) || 0,
        credit_card_invoices: Number(projection.credit_card_invoices) || 0,
        shared_debts: Number(projection.shared_debts) || 0,
        projected_balance: Number(projection.projected_balance) || 0,
      } as MonthlyProjection;
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000, // Cache por 30 segundos
  });
}
