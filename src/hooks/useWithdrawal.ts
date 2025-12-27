import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface WithdrawalData {
  accountId: string;
  amount: number;
  description: string;
  date: string;
}

export function useWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WithdrawalData) => {
      const { data: result, error } = await supabase.rpc("withdraw_from_account", {
        p_account_id: data.accountId,
        p_amount: data.amount,
        p_description: data.description,
        p_date: data.date,
      });

      if (error) throw error;

      // Verificar se a função retornou erro
      if (result && !result.success) {
        throw new Error(result.error || "Erro ao sacar");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Saque realizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao realizar saque");
    },
  });
}
