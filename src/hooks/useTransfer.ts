import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
  exchangeRate?: number;
  destinationAmount?: number;
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransferData) => {
      const { data: result, error } = await supabase.rpc("transfer_between_accounts", {
        p_from_account_id: data.fromAccountId,
        p_to_account_id: data.toAccountId,
        p_amount: data.amount,
        p_description: data.description,
        p_date: data.date,
        p_exchange_rate: data.exchangeRate || undefined,
        p_destination_amount: data.destinationAmount || undefined,
      });

      if (error) throw error;

      // Verificar se a função retornou erro
      const res = result as { success?: boolean; error?: string } | null;
      if (res && !res.success) {
        throw new Error(res.error || "Erro ao transferir");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transferência realizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao realizar transferência");
    },
  });
}
