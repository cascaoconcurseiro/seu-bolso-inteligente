import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Goal, GoalProgress } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useGoals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as metas
  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
  });

  // Buscar progresso de uma meta
  const getGoalProgress = async (goalId: string) => {
    const { data, error } = await supabase.rpc('get_goal_progress', {
      p_goal_id: goalId,
    });

    if (error) throw error;
    return data as GoalProgress[];
  };

  // Criar meta
  const createGoal = useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted' | 'completed_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Meta criada',
        description: 'Meta criada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar meta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar meta
  const updateGoal = useMutation({
    mutationFn: async ({ id, ...goal }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(goal)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Meta atualizada',
        description: 'Meta atualizada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar meta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Adicionar contribuição à meta
  const contributeToGoal = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // Buscar meta atual
      const { data: goal, error: fetchError } = await supabase
        .from('goals')
        .select('current_amount, target_amount')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newAmount = (goal.current_amount || 0) + amount;
      const isCompleted = newAmount >= goal.target_amount;

      const { data, error } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Contribuição adicionada',
        description: 'Contribuição adicionada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar contribuição',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar meta (soft delete)
  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .update({ deleted: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Meta excluída',
        description: 'Meta excluída com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir meta',
        description: error.message,
        variant: 'destructive',
      });
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
    isDeleting: deleteGoal.isPending,
  };
};
