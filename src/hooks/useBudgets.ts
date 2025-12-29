import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Budget, BudgetProgress } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Interface para o progresso do orçamento retornado pelo banco
export interface BudgetWithProgress {
  budget_id: string;
  budget_name: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  currency: string;
  period: string;
}

export const useBudgets = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentDate } = useMonth();
  const queryClient = useQueryClient();

  // Calcular datas do período atual
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Buscar todos os orçamentos COM progresso calculado pelo banco de dados
  // SINGLE SOURCE OF TRUTH: O gasto é calculado diretamente das transações
  const { data: budgetsWithProgress, isLoading } = useQuery({
    queryKey: ['budgets-progress', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase.rpc('get_user_budgets_progress', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data as BudgetWithProgress[];
    },
    enabled: !!user,
  });

  // Buscar orçamentos básicos (para edição/exclusão)
  const { data: budgets } = useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .or('deleted.is.null,deleted.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });

  // Buscar progresso de um orçamento específico (usa função do banco)
  const getBudgetProgress = async (budgetId: string, pStartDate: string, pEndDate: string) => {
    if (!user) return [];
    
    // Buscar o orçamento para pegar a categoria
    const budget = budgets?.find(b => b.id === budgetId);
    if (!budget?.category_id) return [];

    const { data, error } = await supabase.rpc('calculate_budget_spent', {
      p_user_id: user.id,
      p_category_id: budget.category_id,
      p_start_date: pStartDate,
      p_end_date: pEndDate,
      p_currency: budget.currency || 'BRL',
    });

    if (error) throw error;
    return data as number;
  };

  // Criar orçamento
  const createBudget = useMutation({
    mutationFn: async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted'>) => {
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
      queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
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
      queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
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
        .update({ deleted: true, is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
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
    budgetsWithProgress, // Novo: orçamentos com progresso calculado pelo banco
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
