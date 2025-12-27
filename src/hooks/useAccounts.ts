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
  bank_color: string | null;
  bank_logo: string | null;
  currency: string;
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
  bank_color?: string;
  bank_logo?: string;
  currency?: string;
  closing_day?: number;
  due_day?: number;
  credit_limit?: number;
}

export function useAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Account[];
    },
    enabled: !!user,
    staleTime: 60000, // Cache por 1 minuto
    retry: false,
  });
}

export function useCreateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (!user) throw new Error("User not authenticated");

      // Para cartões de crédito, usar insert direto pois RPC não suporta campos extras
      if (input.type === 'CREDIT_CARD') {
        const { data, error } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            name: input.name,
            type: input.type,
            balance: 0, // Cartões sempre começam com saldo 0
            bank_id: input.bank_id || null,
            currency: input.currency || 'BRL',
            closing_day: input.closing_day || null,
            due_day: input.due_day || null,
            credit_limit: input.credit_limit || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Para outras contas, usar RPC que cria com depósito inicial
      const { data, error } = await supabase.rpc('create_account_with_initial_deposit', {
        p_name: input.name,
        p_type: input.type,
        p_bank: input.bank_id || null,
        p_initial_balance: input.balance || 0,
        p_currency: input.currency || 'BRL',
      });

      if (error) throw error;
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
      const { error } = await supabase
        .from("accounts")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover conta: " + error.message);
    },
  });
}
