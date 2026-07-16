import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id: string;
  name: string;
  target_pct: number;
  reached_at: string | null;
  created_at: string;
}

export function useGoalMilestones(goalId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goal-milestones", goalId],
    queryFn: async (): Promise<GoalMilestone[]> => {
      if (!goalId) return [];
      const { data, error } = await supabase
        .from("goal_milestones")
        .select("*")
        .eq("goal_id", goalId)
        .order("target_pct");
      if (error) throw error;
      return data as GoalMilestone[];
    },
    enabled: !!goalId && !!user,
    staleTime: 30_000,
  });
}

export function useCreateGoalMilestone() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goalId,
      name,
      targetPct,
    }: {
      goalId: string;
      name: string;
      targetPct: number;
    }) => {
      const { data, error } = await supabase
        .from("goal_milestones")
        .insert({ goal_id: goalId, user_id: user!.id, name, target_pct: targetPct })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["goal-milestones", v.goalId] });
      toast.success("Marco adicionado");
    },
    onError: () => toast.error("Erro ao adicionar marco"),
  });
}

export function useDeleteGoalMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, goalId }: { id: string; goalId: string }) => {
      const { error } = await supabase.from("goal_milestones").delete().eq("id", id);
      if (error) throw error;
      return goalId;
    },
    onSuccess: (goalId) => {
      queryClient.invalidateQueries({ queryKey: ["goal-milestones", goalId] });
      toast.success("Marco removido");
    },
    onError: () => toast.error("Erro ao remover marco"),
  });
}
