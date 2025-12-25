import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Budget, BudgetProgress } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useBudgets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os orçamentos
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Budget[];
    },
  });

  // Buscar progresso de um orçamento
  const getBudgetProgress = async (budgetId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase.rpc('get_budget_progress', {
      p_budget_id: budgetId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;
    return data as BudgetProgress[];
  };

  // Criar orçamento
  const createBudget = useMutation({
    mutationFn: async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('budgets')
        .insert([{ ...budget, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento criado',
        description: 'Orçamento criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar orçamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar orçamento
  const updateBudget = useMutation({
    mutationFn: async ({ id, ...budget }: Partial<Budget> & { id: string }) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(budget)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento atualizado',
        description: 'Orçamento atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar orçamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar orçamento (soft delete)
  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .update({ deleted: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento excluído',
        description: 'Orçamento excluído com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir orçamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    budgets,
    isLoading,
    getBudgetProgress,
    createBudget: createBudget.mutate,
    updateBudget: updateBudget.mutate,
    deleteBudget: deleteBudget.mutate,
    isCreating: createBudget.isPending,
    isUpdating: updateBudget.isPending,
    isDeleting: deleteBudget.isPending,
  };
};
