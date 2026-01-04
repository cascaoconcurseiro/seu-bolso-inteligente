import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

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
 * - Verifica se o split já foi pago (previne duplicidade)
 * - Marca o split como pago (is_settled = true)
 * - Cria transação de INCOME na conta selecionada
 */
export function useSettleWithPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, transactionId, amount, accountId, memberName, description }: SettleParams) => {
      if (!user) throw new Error("Não autenticado");

      // VERIFICAR SE JÁ FOI PAGO (prevenir duplicidade)
      const { data: existingSplit } = await supabase
        .from("transaction_splits")
        .select("is_settled")
        .eq("id", splitId)
        .single();

      if (existingSplit?.is_settled) {
        throw new Error("Este item já foi pago anteriormente!");
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const competenceDate = format(new Date(), 'yyyy-MM-01');

      // 1. Criar transação de INCOME (entrada na conta)
      const { data: paymentTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          creator_user_id: user.id,
          description: `Ressarcimento: ${description} (${memberName})`,
          amount: amount,
          date: today,
          competence_date: competenceDate,
          type: "INCOME",
          account_id: accountId,
          currency: "BRL",
          domain: "SHARED",
          is_shared: false,
          notes: `Ressarcimento de despesa compartilhada com ${memberName}`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Atualizar o split como pago
      const { error: splitError } = await supabase
        .from("transaction_splits")
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settled_transaction_id: paymentTx.id,
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
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success("Ressarcimento confirmado!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar ressarcimento");
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

      // VERIFICAR SE ALGUM JÁ FOI PAGO
      const splitIds = items.map(i => i.splitId);
      const { data: existingSplits } = await supabase
        .from("transaction_splits")
        .select("id, is_settled")
        .in("id", splitIds);

      const alreadyPaid = existingSplits?.filter(s => s.is_settled) || [];
      if (alreadyPaid.length > 0) {
        throw new Error(`${alreadyPaid.length} item(ns) já foram pagos anteriormente!`);
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const memberNames = [...new Set(items.map(i => i.memberName))].join(", ");
      const today = format(new Date(), 'yyyy-MM-dd');
      const competenceDate = format(new Date(), 'yyyy-MM-01');

      // 1. Criar transação de INCOME consolidada
      const { data: paymentTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          creator_user_id: user.id,
          description: `Acerto Total - ${memberNames}`,
          amount: totalAmount,
          date: today,
          competence_date: competenceDate,
          type: "INCOME",
          account_id: accountId,
          currency: "BRL",
          domain: "SHARED",
          is_shared: false,
          notes: `Ressarcimento consolidado de ${items.length} despesa(s) compartilhada(s)`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Atualizar todos os splits como pagos
      const { error: splitError } = await supabase
        .from("transaction_splits")
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settled_transaction_id: paymentTx.id,
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
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success(`${data.settledCount} ressarcimento(s) confirmado(s)!`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar ressarcimentos");
    },
  });
}

/**
 * Hook para reverter ressarcimento
 */
export function useUnsettleWithReversal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      // 1. Buscar o split para obter a transação de pagamento
      const { data: split, error: splitFetchError } = await supabase
        .from("transaction_splits")
        .select("*, settled_transaction_id")
        .eq("id", splitId)
        .single();

      if (splitFetchError) throw splitFetchError;

      const paymentTxId = split.settled_transaction_id;

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
          settled_transaction_id: null,
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
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success("Ressarcimento revertido!");
    },
    onError: (error) => {
      toast.error("Erro ao reverter ressarcimento: " + error.message);
    },
  });
}

/**
 * Hook para reverter múltiplos ressarcimentos de uma vez
 */
export function useUnsettleMultiple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitIds: string[]) => {
      // 1. Buscar os splits para obter as transações de pagamento
      const { data: splits, error: splitFetchError } = await supabase
        .from("transaction_splits")
        .select("id, settled_transaction_id")
        .in("id", splitIds);

      if (splitFetchError) throw splitFetchError;

      const paymentTxIds = splits
        .map(s => s.settled_transaction_id)
        .filter((id): id is string => !!id);

      const uniquePaymentTxIds = [...new Set(paymentTxIds)];

      // 2. Reverter transações de pagamento (se houver)
      if (uniquePaymentTxIds.length > 0) {
        // Buscar transações para ajustar saldos
        const { data: transactions } = await supabase
          .from("transactions")
          .select("id, amount, account_id")
          .in("id", uniquePaymentTxIds);

        if (transactions && transactions.length > 0) {
          // Agrupar ajustes por conta para otimizar
          const accountAdjustments: Record<string, number> = {};

          transactions.forEach(tx => {
            if (tx.account_id) {
              accountAdjustments[tx.account_id] = (accountAdjustments[tx.account_id] || 0) + Number(tx.amount);
            }
          });

          // Aplicar ajustes nos saldos
          for (const [accountId, amount] of Object.entries(accountAdjustments)) {
            // Buscar saldo atual
            const { data: account } = await supabase
              .from("accounts")
              .select("balance")
              .eq("id", accountId)
              .single();

            if (account) {
              await supabase
                .from("accounts")
                .update({ balance: Number(account.balance) - amount })
                .eq("id", accountId);
            }
          }
        }

        // Excluir as transações de pagamento
        await supabase.from("transactions").delete().in("id", uniquePaymentTxIds);
      }

      // 3. Marcar splits como não pagos
      const { error: splitError } = await supabase
        .from("transaction_splits")
        .update({
          is_settled: false,
          settled_at: null,
          settled_transaction_id: null,
        })
        .in("id", splitIds);

      if (splitError) throw splitError;

      return { count: splitIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["account-statement"] });
      toast.success(`${data.count} ressarcimentos revertidos!`);
    },
    onError: (error) => {
      toast.error("Erro ao reverter ressarcimentos: " + error.message);
    },
  });
}
