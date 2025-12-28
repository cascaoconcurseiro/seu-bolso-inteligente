import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SettleParams {
  splitId: string;
  transactionId: string;
  amount: number;
  accountId: string;
  memberName: string;
  description: string;
}

interface SettleMultipleParams {
  items: Array<{
    splitId: string;
    transactionId: string;
    amount: number;
    memberName: string;
    description: string;
  }>;
  accountId: string;
}

/**
 * Hook para confirmar ressarcimento de despesa compartilhada
 * - Marca o split como pago (is_settled = true)
 * - Cria transação de RECEITA na conta selecionada
 * - Vincula a transação de pagamento ao split
 */
export function useSettleWithPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, transactionId, amount, accountId, memberName, description }: SettleParams) => {
      if (!user) throw new Error("Não autenticado");

      // 1. Criar transação de RECEITA (entrada na conta)
      const { data: paymentTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          created_by: user.id,
          description: `Ressarcimento: ${description} (${memberName})`,
          amount: amount,
          date: new Date().toISOString().split("T")[0],
          type: "RECEITA",
          category: "Ressarcimento",
          account_id: accountId,
          currency: "BRL",
          domain: "SHARED",
          observation: `Ressarcimento de despesa compartilhada com ${memberName}`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Atualizar o split como pago e vincular a transação de pagamento
      const { error: splitError } = await supabase
        .from("transaction_splits")
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          payment_transaction_id: paymentTx.id,
        })
        .eq("id", splitId);

      if (splitError) {
        // Rollback: excluir a transação criada
        await supabase.from("transactions").delete().eq("id", paymentTx.id);
        throw splitError;
      }

      // 3. Atualizar saldo da conta
      const { data: account } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single();

      if (account) {
        await supabase
          .from("accounts")
          .update({ balance: Number(account.balance) + amount })
          .eq("id", accountId);
      }

      return { paymentTx, splitId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Ressarcimento confirmado e entrada registrada!");
    },
    onError: (error) => {
      toast.error("Erro ao confirmar ressarcimento: " + error.message);
    },
  });
}

/**
 * Hook para confirmar múltiplos ressarcimentos de uma vez
 */
export function useSettleMultipleWithPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, accountId }: SettleMultipleParams) => {
      if (!user) throw new Error("Não autenticado");

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const memberNames = [...new Set(items.map(i => i.memberName))].join(", ");

      // 1. Criar transação de RECEITA consolidada
      const { data: paymentTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          created_by: user.id,
          description: `Ressarcimento de ${items.length} item(ns) - ${memberNames}`,
          amount: totalAmount,
          date: new Date().toISOString().split("T")[0],
          type: "RECEITA",
          category: "Ressarcimento",
          account_id: accountId,
          currency: "BRL",
          domain: "SHARED",
          observation: `Ressarcimento consolidado de ${items.length} despesa(s) compartilhada(s)`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Atualizar todos os splits como pagos
      const splitIds = items.map(i => i.splitId);
      const { error: splitError } = await supabase
        .from("transaction_splits")
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          payment_transaction_id: paymentTx.id,
        })
        .in("id", splitIds);

      if (splitError) {
        // Rollback
        await supabase.from("transactions").delete().eq("id", paymentTx.id);
        throw splitError;
      }

      // 3. Atualizar saldo da conta
      const { data: account } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single();

      if (account) {
        await supabase
          .from("accounts")
          .update({ balance: Number(account.balance) + totalAmount })
          .eq("id", accountId);
      }

      return { paymentTx, settledCount: items.length, totalAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(`${data.settledCount} ressarcimento(s) confirmado(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao confirmar ressarcimentos: " + error.message);
    },
  });
}

/**
 * Hook para reverter ressarcimento (efeito cascata)
 * - Marca o split como não pago
 * - Exclui a transação de pagamento
 * - Reverte o saldo da conta
 */
export function useUnsettleWithReversal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      // 1. Buscar o split para obter a transação de pagamento
      const { data: split, error: splitFetchError } = await supabase
        .from("transaction_splits")
        .select("*, payment_transaction_id")
        .eq("id", splitId)
        .single();

      if (splitFetchError) throw splitFetchError;

      const paymentTxId = split.payment_transaction_id;

      // 2. Se houver transação de pagamento, buscar e reverter
      if (paymentTxId) {
        const { data: paymentTx } = await supabase
          .from("transactions")
          .select("amount, account_id")
          .eq("id", paymentTxId)
          .single();

        if (paymentTx && paymentTx.account_id) {
          // Reverter saldo da conta
          const { data: account } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", paymentTx.account_id)
            .single();

          if (account) {
            await supabase
              .from("accounts")
              .update({ balance: Number(account.balance) - Number(paymentTx.amount) })
              .eq("id", paymentTx.account_id);
          }
        }

        // Excluir a transação de pagamento
        await supabase.from("transactions").delete().eq("id", paymentTxId);
      }

      // 3. Marcar split como não pago
      const { error: splitError } = await supabase
        .from("transaction_splits")
        .update({
          is_settled: false,
          settled_at: null,
          payment_transaction_id: null,
        })
        .eq("id", splitId);

      if (splitError) throw splitError;

      return { splitId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Ressarcimento revertido!");
    },
    onError: (error) => {
      toast.error("Erro ao reverter ressarcimento: " + error.message);
    },
  });
}
