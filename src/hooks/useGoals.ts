import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Goal, GoalProgress } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { generateAllNotifications } from '@/services/notificationGenerator';
import { logger } from '@/utils/logger';

// AUDITORIA 2026-05-10: Corrigido contributeToGoal — agora cria transação financeira
// para rastrear o aporte no fluxo de caixa. Sem isso, o dinheiro "sumia" do saldo
// sem registro. Se a meta tem linked_account_id, debita dessa conta; caso contrário
// cria uma despesa genérica na categoria "Meta".

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
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Buscar progresso de uma meta
  const getGoalProgress = async (goalId: string) => {
    // Verificar se a função RPC existe antes de chamar
    const { data, error } = await supabase.rpc('get_goal_progress', {
      p_goal_id: goalId,
    });

    if (error) {
      // Se a função não existir, retornar array vazio em vez de quebrar
      logger.warn('[useGoals] get_goal_progress não disponível:', error.message);
      return [] as GoalProgress[];
    }
    return (data as any[]).map(item => ({
      ...item,
      percentage: item.percentage_complete
    })) as GoalProgress[];
  };

  // Criar meta
  const createGoal = useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted' | 'completed_at' | 'creator_user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, user_id: user.id, creator_user_id: user.id }])
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
  // AUDITORIA: Agora cria transação financeira para rastrear o aporte no fluxo de caixa
  const contributeToGoal = useMutation({
    mutationFn: async ({
      id,
      amount,
      accountId,
      description,
    }: {
      id: string;
      amount: number;
      accountId?: string; // Conta de onde o dinheiro sai (opcional)
      description?: string;
    }) => {
      if (amount === 0) throw new Error('O valor deve ser diferente de zero');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar meta atual
      const { data: goal, error: fetchError } = await supabase
        .from('goals')
        .select('current_amount, target_amount, name, linked_account_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentAmount = Number(goal.current_amount || 0);

      // VALIDAÇÃO FINANCEIRA: Bloquear resgates que gerariam saldo negativo
      if (amount < 0 && Math.abs(amount) > currentAmount) {
        throw new Error(
          `Resgate de R$ ${Math.abs(amount).toFixed(2)} excede o saldo disponível na meta ` +
          `(R$ ${currentAmount.toFixed(2)}). Você não pode resgatar mais do que o valor acumulado.`
        );
      }

      const newAmount = currentAmount + amount;
      const isCompleted = newAmount >= Number(goal.target_amount);

      // Determinar conta de débito
      const debitAccountId = accountId || goal.linked_account_id;

      // Criar transação financeira para rastrear o aporte no fluxo de caixa
      if (debitAccountId) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const competenceStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

        // Buscar categoria "Metas e Investimentos" ou criar uma genérica
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', '%meta%')
          .limit(1)
          .maybeSingle();

        // Buscar moeda da conta
        const { data: accountData } = await supabase
          .from('accounts')
          .select('currency')
          .eq('id', debitAccountId)
          .single();

        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          creator_user_id: user.id,
          account_id: debitAccountId,
          type: amount > 0 ? 'EXPENSE' : 'INCOME',
          amount: Math.abs(amount),
          description: description || (amount > 0 ? `Aporte: ${goal.name}` : `Resgate: ${goal.name}`),
          category_id: categoryData?.id || null,
          date: dateStr,
          competence_date: competenceStr,
          domain: 'PERSONAL',
          is_shared: false,
          is_installment: false,
          is_recurring: false,
          currency: accountData?.currency || 'BRL',
          notes: amount > 0 
            ? `Contribuição para a meta "${goal.name}"` 
            : `Resgate da meta "${goal.name}" para a conta`,
        });

        if (txError) {
          throw new Error(`Erro ao registrar aporte no extrato: ${txError.message}`);
        }
      }

      // Atualizar o valor acumulado da meta
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      toast({
        title: 'Aporte registrado',
        description: 'Contribuição adicionada e registrada no seu extrato.',
      });

      // ✅ INTELIGÊNCIA FINANCEIRA: Verificar marcos de metas
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        generateAllNotifications(user.id).catch(logger.error);
      }
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
      // 1. Fetch the goal to know its name
      const { data: goal, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single();

      // 2. Delete auto-generated transactions (Efeito Cascata)
      if (!fetchError && goal) {
        await supabase
          .from('transactions')
          .delete()
          .like('notes', `%meta "${goal.name}"%`)
          .eq('user_id', goal.user_id);
      }

      // 3. Soft delete the goal
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
    isContributing: contributeToGoal.isPending,
    isDeleting: deleteGoal.isPending,
  };
};
