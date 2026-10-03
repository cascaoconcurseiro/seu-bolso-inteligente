import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateTransaction } from "@/hooks/transactions/useCreateTransaction";
import { useAccounts } from "@/hooks/useAccounts";

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
  const createTransaction = useCreateTransaction();
  const { data: accounts } = useAccounts();

  return useMutation({
    mutationFn: async (data: TransferData) => {
      // Mesma moeda: um único lançamento do tipo TRANSFER (como o formulário "Transf." e o
      // pagamento de fatura). A função transfer_between_accounts grava uma despesa e uma
      // receita comuns, o que inflava Entradas/Saídas, relatórios e orçamentos.
      if (!data.exchangeRate) {
        const from = accounts?.find((a) => a.id === data.fromAccountId);
        await createTransaction.mutateAsync({
          amount: data.amount,
          description: data.description || "Transferência entre contas",
          date: data.date,
          competence_date: `${data.date.slice(0, 7)}-01`,
          type: "TRANSFER",
          account_id: data.fromAccountId,
          destination_account_id: data.toAccountId,
          domain: "PERSONAL",
          currency: from?.currency || "BRL",
        });
        return { success: true };
      }

      // Com câmbio: mantém a função do banco (fluxo não coberto pelo lançamento TRANSFER aqui).
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
