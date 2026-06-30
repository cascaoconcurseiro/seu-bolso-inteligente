import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Goal, GoalProgress } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { generateAllNotifications } from "@/services/notificationGenerator";
import { logger } from "@/utils/logger";

// AUDITORIA 2026-05-10: Corrigido contributeToGoal — agora cria transação financeira
// para rastrear o aporte no fluxo de caixa. Sem isso, o dinheiro "sumia" do saldo
// sem registro. Se a meta tem linked_account_id, debita dessa conta; caso contrário
// cria uma despesa genérica na categoria "Meta".

export const useGoals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as metas
  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Buscar progresso de uma meta
  const getGoalProgress = async (goalId: string) => {
    // Verificar se a função RPC existe antes de chamar
    const { data, error } = await supabase.rpc("get_goal_progress", {
      p_goal_id: goalId,
    });

    if (error) {
      // Se a função não existir, retornar array vazio em vez de quebrar
      logger.warn("[useGoals] get_goal_progress não disponível:", error.message);
      return [] as GoalProgress[];
    }
    return (data as Array<GoalProgress & { percentage_complete: number }>).map((item) => ({
      ...item,
      percentage: item.percentage_complete,
    })) as GoalProgress[];
  };

  // Criar meta
  const createGoal = useMutation({
    onMutate: async (
      goal: Omit<
        Goal,
        | "id"
        | "user_id"
        | "created_at"
        | "updated_at"
        | "deleted"
        | "completed_at"
        | "creator_user_id"
      >
    ) => {
      await queryClient.cancelQueries({ queryKey: ["goals"] });
      const previous = queryClient.getQueryData<Goal[]>(["goals"]);
      const optimistic = {
        ...goal,
        id: `temp-${Date.now()}`,
        user_id: "",
        creator_user_id: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        completed_at: null,
      } as Goal;
      queryClient.setQueryData<Goal[]>(["goals"], (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["goals"], context.previous);
      toast({ title: "Erro ao criar meta", description: error.message, variant: "destructive" });
    },
    mutationFn: async (
      goal: Omit<
        Goal,
        | "id"
        | "user_id"
        | "created_at"
        | "updated_at"
        | "deleted"
        | "completed_at"
        | "creator_user_id"
      >
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("goals")
        .insert([{ ...goal, user_id: user.id, creator_user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Meta criada", description: "Meta criada com sucesso!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  // Atualizar meta
  const updateGoal = useMutation({
    onMutate: async ({ id, ...goal }: Partial<Goal> & { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ["goals"] });
      const previous = queryClient.getQueryData<Goal[]>(["goals"]);
      queryClient.setQueryData<Goal[]>(
        ["goals"],
        (old) => old?.map((g) => (g.id === id ? { ...g, ...goal } : g)) ?? []
      );
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["goals"], context.previous);
      toast({
        title: "Erro ao atualizar meta",
        description: error.message,
        variant: "destructive",
      });
    },
    mutationFn: async ({ id, ...goal }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from("goals")
        .update(goal)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Meta atualizada", description: "Meta atualizada com sucesso!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  // Adicionar contribuição à meta (CRIT-05: RPC atômica)
  const contributeToGoal = useMutation({
    mutationFn: async ({
      id,
      amount,
      accountId,
      description,
    }: {
      id: string;
      amount: number;
      accountId?: string;
      description?: string;
    }) => {
      const result = await callRPCWithRetry("contribute_to_goal", {
        p_goal_id: id,
        p_amount: amount,
        p_account_id: accountId || null,
        p_description: description || null,
      });

      // Re-fetch goal to get full updated data
      const { data: goal, error: fetchError } = await supabase
        .from("goals")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      return goal;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast({
        title: "Aporte registrado",
        description: "Contribuição adicionada e registrada no seu extrato.",
      });

      // ✅ INTELIGÊNCIA FINANCEIRA: Verificar marcos de metas
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        generateAllNotifications(user.id).catch(logger.error);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar contribuição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar meta (soft delete)
  const deleteGoal = useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["goals"] });
      const previous = queryClient.getQueryData<Goal[]>(["goals"]);
      queryClient.setQueryData<Goal[]>(["goals"], (old) => old?.filter((g) => g.id !== id) ?? []);
      return { previous };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["goals"], context.previous);
      toast({ title: "Erro ao excluir meta", description: error.message, variant: "destructive" });
    },
    mutationFn: async (id: string) => {
      // CRIT-06: Deleção por goal_id FK (substitui LIKE '%meta%' frágil)
      await supabase.from("transactions").delete().eq("goal_id", id);

      // Soft delete the goal
      const { error } = await supabase.from("goals").update({ deleted: true }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Meta excluída", description: "Meta excluída com sucesso!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    goals,
    isLoading,
    getGoalProgress,
    createGoal: createGoal.mutate,
    updateGoal: updateGoal.mutate,
    contributeToGoal: contributeToGoal.mutate,
    deleteGoal: deleteGoal.mutate,
    isCreating: createGoal.isPending,
    isUpdating: updateGoal.isPending,
    isContributing: contributeToGoal.isPending,
    isDeleting: deleteGoal.isPending,
  };
};
