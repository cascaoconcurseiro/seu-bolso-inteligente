import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GoalHistoryPoint {
  date: string;
  amount: number;
  cumulative: number;
  type: 'EXPENSE' | 'INCOME';
}

export function useGoalHistory(goalId: string, goalName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["goal-history", goalId, user?.id],
    queryFn: async (): Promise<GoalHistoryPoint[]> => {
      if (!user || !goalName) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount, type")
        .eq("user_id", user.id)
        .ilike("description", `%${goalName}%`)
        .is("deleted_at", null)
        .order("date", { ascending: true });

      if (error) throw error;

      let cumulative = 0;
      return (data || []).map(tx => {
        const delta = tx.type === 'EXPENSE' ? Number(tx.amount) : -Number(tx.amount);
        cumulative += delta;
        return {
          date: tx.date,
          amount: delta,
          cumulative: Math.max(0, cumulative),
          type: tx.type as 'EXPENSE' | 'INCOME',
        };
      });
    },
    enabled: !!user && !!goalName,
    staleTime: 30 * 1000,
  });
}
