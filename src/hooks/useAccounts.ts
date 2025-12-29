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

      // Usar INSERT direto para todas as contas (mais confiável que RPC)
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          balance: input.type === 'CREDIT_CARD' ? 0 : (input.balance || 0),
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
      
      // Se tem saldo inicial e não é cartão de crédito, criar transação de depósito
      if (input.balance && input.balance > 0 && input.type !== 'CREDIT_CARD') {
        await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: data.id,
          type: 'INCOME',
          amount: input.balance,
          description: 'Depósito inicial',
          date: new Date().toISOString().split('T')[0],
          category: 'Depósito',
          domain: 'PERSONAL',
        });
      }
      
      return data;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from("accounts")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
      // Primeiro, verificar se a conta tem saldo
      const { data: account, error: fetchError } = await supabase
        .from("accounts")
        .select("balance, name")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Verificar se tem saldo diferente de zero
      if (account && Math.abs(Number(account.balance)) > 0.01) {
        throw new Error(
          `Não é possível excluir a conta "${account.name}" pois ela possui saldo de ${Number(account.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Transfira o saldo antes de excluir.`
        );
      }

      // Verificar se tem transações vinculadas
      const { count: txCount, error: countError } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .or(`account_id.eq.${id},destination_account_id.eq.${id}`)
        .eq("deleted", false);

      if (countError) throw countError;

      if (txCount && txCount > 0) {
        throw new Error(
          `Não é possível excluir a conta "${account?.name}" pois ela possui ${txCount} transação(ões) vinculada(s). Migre as transações para outra conta primeiro.`
        );
      }

      // Se não tem saldo nem transações, fazer soft delete
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
