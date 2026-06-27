import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/utils/logger';

export interface WealthPoint {
  month_label: string;
  balance: number;
}

/**
 * Hook para buscar a evolução patrimonial histórica dos últimos N meses
 * Integrado de forma reativa com a moeda selecionada e com o Supabase.
 */
export function useWealthEvolution(currency: string = "BRL", months: number = 6) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wealth-evolution", user?.id, currency, months],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_wealth_evolution", {
        p_user_id: user.id,
        p_months: months,
        p_currency: currency,
      });

      if (error) {
        logger.error("Erro ao buscar evolução patrimonial:", error);
        return [];
      }

      if (!data) return [];

      return data.map((item: { month_label: string; balance: number | string }) => ({
        month_label: item.month_label,
        balance: Number(item.balance) || 0,
      })) as WealthPoint[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });
}
