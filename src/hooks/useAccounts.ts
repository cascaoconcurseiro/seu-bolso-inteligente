import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  bank_id: string | null;
  currency: string;
  is_international: boolean | null;
  is_active: boolean;
  closing_day: number | null;
  due_day: number | null;
  credit_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  bank_id?: string;
  currency?: string;
  is_international?: boolean;
  closing_day?: number;
  due_day?: number;
  credit_limit?: number;
}

export function useAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Erro ao buscar contas:", error);
        throw error;
      }
      return data as Account[];
    },
    enabled: !!user,
    staleTime: 60000,
    retry: false,
  });
}

export function useCreateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (!user) throw new Error("User not authenticated");

      // Criar conta com saldo zero (o saldo será calculado pelo trigger após criar a transação)
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          balance: 0, // Sempre começa com zero, trigger calcula
          initial_balance: input.type === 'CREDIT_CARD' ? 0 : (input.balance || 0),
          bank_id: input.bank_id || null,
          currency: input.currency || 'BRL',
          is_international: input.is_international || false,
          closing_day: input.closing_day || null,
          due_day: input.due_day || null,
          credit_limit: input.credit_limit || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Se tem saldo inicial e não é cartão de crédito, criar transação de saldo inicial
      // O trigger vai atualizar o saldo da conta automaticamente
      if (input.balance && input.balance > 0 && input.type !== 'CREDIT_CARD') {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const competenceStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          creator_user_id: user.id,
          account_id: data.id,
          type: 'INCOME',
          amount: input.balance,
          description: 'Saldo inicial',
          date: dateStr,
          competence_date: competenceStr,
          domain: 'PERSONAL',
          is_shared: false,
          is_installment: false,
          is_recurring: false,
        });
        
        if (txError) {
          console.error('Erro ao criar transação de saldo inicial:', txError);
          throw new Error('Erro ao criar saldo inicial: ' + txError.message);
        }
      }
      
      // Buscar conta atualizada (com saldo calculado pelo trigger)
      const { data: updatedAccount, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', data.id)
        .single();
      
      if (fetchError) throw fetchError;
      return updatedAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Conta criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar conta: " + error.message);
    },
  });
}

export function useUpdateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Account> & { id: string }) => {
      // Se está atualizando o saldo, criar transação de ajuste
      if (input.balance !== undefined && user) {
        // Buscar saldo atual
        const { data: currentAccount, error: fetchError } = await supabase
          .from("accounts")
          .select("balance, name")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const currentBalance = Number(currentAccount.balance);
        const newBalance = Number(input.balance);
        const difference = newBalance - currentBalance;

        // Se há diferença, criar transação de ajuste
        if (Math.abs(difference) > 0.001) {
          const { error: txError } = await supabase.from('transactions').insert({
            user_id: user.id,
            account_id: id,
            type: difference > 0 ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(difference),
            description: `Ajuste de saldo - ${currentAccount.name}`,
            date: new Date().toISOString().split('T')[0],
            competence_date: new Date().toISOString().split('T')[0],
            domain: 'PERSONAL',
            is_shared: false,
            is_installment: false,
            is_recurring: false,
            sync_status: 'SYNCED',
            is_settled: true,
          });

          if (txError) throw txError;

          // Remover balance do input pois o trigger vai calcular
          delete input.balance;
        }
      }

      // Atualizar outros campos da conta (exceto balance que é calculado pelo trigger)
      const updateData = { ...input };
      delete updateData.balance; // Nunca atualizar balance diretamente

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase
          .from("accounts")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as Account;
      }

      // Se só atualizou o saldo (via transação), buscar conta atualizada
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Conta atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar conta: " + error.message);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fazer soft delete direto (sem verificações restritivas)
      const { error } = await supabase
        .from("accounts")
        .update({ is_active: false, deleted: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta removida!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover conta");
    },
  });
}
