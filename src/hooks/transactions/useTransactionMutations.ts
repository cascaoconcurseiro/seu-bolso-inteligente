import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dateUtils } from "@/utils/dateUtils";
import {
  invalidateFinancialQueries,
  invalidateSharedQueries,
  invalidateTripQueries,
} from "@/utils/queryInvalidation";
import { transactionToasts } from "@/utils/toastMessages";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { logger } from "@/utils/logger";
import { generateAllNotifications } from "@/services/notificationGenerator";
import { createNotification } from "@/services/notificationService";
import { CreateTransactionInput, Transaction } from "./types";
import { toast } from "sonner";
// Splits vindos do formulário usam snake_case (member_id), diferente do
// TransactionSplitData camelCase de types/transactions
interface TransactionSplitData {
  member_id: string;
  percentage: number;
  amount?: number;
}

export function useBulkCreateTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateTransactionInput[]) => {
      if (!user) throw new Error("Usuário não autenticado");

      const transactionsToInsert = inputs.map((input) => {
        const { splits, ...transactionData } = input;
        void splits;

        return {
          user_id: user.id,
          creator_user_id: user.id,
          ...transactionData,
          competence_date:
            input.competence_date || dateUtils.getCompetenceDate(dateUtils.parseDate(input.date)),
        };
      });

      const { data, error } = await supabase
        .from("transactions")
        .insert(transactionsToInsert)
        .select();

      if (error) {
        logger.error("Erro ao criar transações em lote:", error);
        throw new Error(`Erro ao criar transações em lote: ${error.message}`);
      }

      return data as Transaction[];
    },
    onSuccess: async () => {
      // Run invalidations
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      transactionToasts.created();
    },
    onError: (error) => {
      transactionToasts.error("criar", error);
    },
  });
}

export function useUpdateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async (updateData: Partial<Transaction> & { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previousTransactions = queryClient.getQueriesData({ queryKey: ["transactions"] });

      if (user) {
        queryClient.setQueriesData({ queryKey: ["transactions"] }, (old: Transaction[]) => {
          if (!Array.isArray(old)) return old;
          return old.map((tx) => (tx.id === updateData.id ? { ...tx, ...updateData } : tx));
        });
      }
      return { previousTransactions };
    },
    mutationFn: async ({ id, ...updateData }: Partial<Transaction> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const {
        splits,
        transaction_splits,
        category,
        account,
        trip,
        is_optimistic,
        ...restUpdateData
      } = updateData as Partial<Transaction> & {
        splits?: TransactionSplitData[];
        transaction_splits?: TransactionSplitData[];
      };
      void category;
      void account;
      void trip;
      void is_optimistic;
      const actualSplits = transaction_splits || splits;

      const { data, error } = await supabase.rpc(
        "update_transaction_with_splits_v1" as never,
        {
          p_transaction_id: id,
          p_transaction: restUpdateData,
          p_splits: actualSplits,
        } as never
      );

      if (error) {
        logger.error("Erro ao atualizar transação:", error);
        throw new Error(`Erro ao atualizar transação: ${error.message}`);
      }

      return data as Transaction;
    },
    onSuccess: async () => {
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      showActionFeedback("success");
    },
    onError: (error, _variables, onMutateResult) => {
      if (onMutateResult?.previousTransactions) {
        onMutateResult.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      showActionFeedback("error");
    },
  });
}

export function useDeleteTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previousTransactions = queryClient.getQueriesData({ queryKey: ["transactions"] });

      if (user) {
        queryClient.setQueriesData({ queryKey: ["transactions"] }, (old: Transaction[]) => {
          if (!Array.isArray(old)) return old;
          return old.filter((tx) => tx.id !== id);
        });
      }
      return { previousTransactions };
    },
    mutationFn: async ({
      id,
      cascadeType = "NONE",
    }: {
      id: string;
      cascadeType?: "ALL" | "NEXT" | "NONE";
    }) => {
      // 1. Buscar dados para notificação antes de deletar
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("is_shared, domain, description, user_id")
        .eq("id", id)
        .maybeSingle();

      // 2. Se for compartilhada, buscar splits antes de deletar
      let otherUserIds: string[] = [];
      if (existingTx && (existingTx.is_shared || existingTx.domain === "SHARED")) {
        const { data: splitsData } = await supabase
          .from("transaction_splits")
          .select("user_id")
          .eq("transaction_id", id);

        if (splitsData && splitsData.length > 0) {
          otherUserIds = Array.from(
            new Set(
              splitsData
                .map((s) => s.user_id)
                .filter((uid): uid is string => Boolean(uid) && uid !== user?.id)
            )
          );
        }
      }

      // 3. Excluir via RPC com validação server-side (permissão, liquidação,
      // cascata e espelhos). Lança erro explícito se nada for excluído —
      // o UPDATE direto anterior falhava silenciosamente com 0 linhas.
      const { error } = await supabase.rpc("soft_delete_transaction", {
        p_transaction_id: id,
        p_cascade: cascadeType,
      });

      if (error) throw error;

      // 4. Notificar outros membros
      if (existingTx && otherUserIds.length > 0) {
        try {
          // Fire and forget notification
          Promise.all(
            otherUserIds.map((otherUserId) =>
              createNotification({
                user_id: otherUserId,
                type: "SHARED_EXPENSE",
                title: "Transação Excluída",
                message: `${user?.user_metadata?.name || user?.email || "Alguém"} excluiu a transação compartilhada "${existingTx.description}".`,
                icon: "❌",
                priority: "NORMAL",
              }).catch((e) =>
                logger.error("Erro ao criar notificação de exclusão compartilhada:", e)
              )
            )
          );
        } catch (notificationError) {
          logger.error(
            "Erro ao tentar enviar notificação de exclusão compartilhada:",
            notificationError
          );
        }
      }
    },
    onSuccess: async () => {
      // Run invalidations without awaiting to unblock UI instantly
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
      transactionToasts.deleted();

      // ✅ INTELIGÊNCIA FINANCEIRA: Atualizar orçamentos e saldos em tempo real
      if (user?.id) {
        generateAllNotifications(user.id).catch((e) =>
          logger.error("Erro ao gerar notificações pós-exclusão", e)
        );
      }
    },
    onError: (error, _variables, onMutateResult) => {
      if (onMutateResult?.previousTransactions) {
        onMutateResult.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      transactionToasts.error("remover", error);
    },
  });
}

export function useUpdateRecurringSeries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      fromInstallment,
      updates,
    }: {
      seriesId: string;
      fromInstallment: number;
      updates: Partial<
        Pick<Transaction, "description" | "amount" | "category_id" | "account_id" | "notes">
      >;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("transactions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("series_id", seriesId)
        .eq("user_id", user.id)
        .gte("current_installment", fromInstallment)
        .is("deleted_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Recorrências atualizadas!");
    },
    onError: (error) => {
      transactionToasts.error("atualizar série", error);
    },
  });
}
