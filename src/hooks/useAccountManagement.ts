import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
