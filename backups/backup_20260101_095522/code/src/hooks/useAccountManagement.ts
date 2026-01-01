import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Hook para migrar transações de uma conta para outra
 */
export function useMigrateTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromAccountId, toAccountId }: { fromAccountId: string; toAccountId: string }) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.rpc("migrate_transactions_to_account", {
        p_from_account_id: fromAccountId,
        p_to_account_id: toAccountId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return { migratedCount: data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success(`${data.migratedCount} transação(ões) migrada(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao migrar transações: " + error.message);
    },
  });
}

/**
 * Hook para atribuir conta padrão a transações órfãs
 */
export function useAssignDefaultAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (defaultAccountId: string) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.rpc("assign_default_account_to_orphans", {
        p_user_id: user.id,
        p_default_account_id: defaultAccountId,
      });

      if (error) throw error;
      return { assignedCount: data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      if (data.assignedCount > 0) {
        toast.success(`${data.assignedCount} transação(ões) vinculada(s) à conta!`);
      } else {
        toast.info("Nenhuma transação órfã encontrada.");
      }
    },
    onError: (error) => {
      toast.error("Erro ao vincular transações: " + error.message);
    },
  });
}

/**
 * Hook para recalcular saldos de todas as contas
 */
export function useRecalculateBalances() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.rpc("recalculate_all_balances", {
        p_user_id: user.id,
      });

      if (error) throw error;
      return { accountsUpdated: data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(`Saldos de ${data.accountsUpdated} conta(s) recalculados!`);
    },
    onError: (error) => {
      toast.error("Erro ao recalcular saldos: " + error.message);
    },
  });
}

/**
 * Hook para contar transações órfãs
 */
export function useOrphanTransactionsCount() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("account_id", null)
        .neq("type", "TRANSFERÊNCIA")
        .eq("deleted", false);

      if (error) throw error;
      return count || 0;
    },
  });
}

/**
 * Hook para contar transações de uma conta
 */
export function useAccountTransactionsCount() {
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .or(`account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
        .eq("deleted", false);

      if (error) throw error;
      return count || 0;
    },
  });
}
