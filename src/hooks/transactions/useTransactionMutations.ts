import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
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
import { validatePayerId } from "./helpers";
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

      // Verificar se a transação já foi liquidada OU tem splits com acertos parciais
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("is_settled")
        .eq("id", id)
        .single();

      if (existingTx?.is_settled) {
        throw new Error(
          "Esta transação já foi liquidada/acertada. Desfaça o acerto antes de editá-la."
        );
      }

      // Verificar se há splits com acertos parciais (settled_by_debtor/creditor)
      const { data: existingSplits } = await supabase
        .from("transaction_splits")
        .select("id, is_settled, settled_by_debtor, settled_by_creditor")
        .eq("transaction_id", id);

      if (
        existingSplits?.some((s) => s.is_settled || s.settled_by_debtor || s.settled_by_creditor)
      ) {
        throw new Error(
          "Esta transação possui acertos parciais. Desfaça os acertos antes de editá-la."
        );
      }

      // Validate payer_id and members if they are being updated
      if (updateData.payer_id !== undefined) {
        await validatePayerId(updateData.payer_id);
      }

      // We update splits separately since they are in another table.
      const { splits, transaction_splits, ...restUpdateData } =
        updateData as Partial<Transaction> & {
          splits?: TransactionSplitData[];
          transaction_splits?: TransactionSplitData[];
        };
      const actualSplits = transaction_splits || splits;

      const { data, error } = await supabase
        .from("transactions")
        .update({
          ...restUpdateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        logger.error("Erro ao atualizar transação:", error);
        throw new Error(`Erro ao atualizar transação: ${error.message}`);
      }

      if (actualSplits) {
        const finalSplits = [...actualSplits];

        // Auto-completar splits se a soma for menor que 100% (Critério #6: O próprio criador assume o restante)
        if (finalSplits.length > 0) {
          const totalPercentage = SafeFinancialCalculator.safeSum(
            finalSplits.map((s: TransactionSplitData) => s.percentage)
          ).toNumber();
          if (totalPercentage < 100) {
            const remainingPercentage = SafeFinancialCalculator.subtract(
              100,
              totalPercentage
            ).toNumber();
            const { data: currentUserMember } = await supabase
              .from("family_members")
              .select("id")
              .eq("linked_user_id", user.id)
              .maybeSingle();

            if (currentUserMember) {
              finalSplits.push({
                member_id: currentUserMember.id,
                percentage: remainingPercentage,
                amount: SafeFinancialCalculator.percentage(
                  data.amount,
                  remainingPercentage
                ).toNumber(),
              });
            }
          }
        }

        // Save existing splits so we can restore them if the insert fails
        const { data: existingSplits } = await supabase
          .from("transaction_splits")
          .select("*")
          .eq("transaction_id", id);

        await supabase.from("transaction_splits").delete().eq("transaction_id", id);

        // Inserir os novos
        if (finalSplits.length > 0) {
          const memberIds = finalSplits.map((s: TransactionSplitData) => s.member_id);
          const { data: membersData } = await supabase
            .from("family_members")
            .select("id, name, linked_user_id")
            .or(`id.in.(${memberIds.join(",")}),linked_user_id.in.(${memberIds.join(",")})`);

          const memberNames: Record<string, string> = {};
          const memberUserIds: Record<string, string> = {};
          const userIdToMemberId: Record<string, string> = {};
          const userIdToName: Record<string, string> = {};

          membersData?.forEach((m) => {
            memberNames[m.id] = m.name;
            if (m.linked_user_id) {
              memberUserIds[m.id] = m.linked_user_id;
              userIdToMemberId[m.linked_user_id] = m.id;
              userIdToName[m.linked_user_id] = m.name;
            }
          });

          let allocatedSum = 0;
          const splitsToInsert = finalSplits.map((split: TransactionSplitData, index: number) => {
            const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
            const actualMemberId = isUserId ? userIdToMemberId[split.member_id] : split.member_id;
            const actualUserId = isUserId ? split.member_id : memberUserIds[split.member_id];
            const actualName = isUserId
              ? userIdToName[split.member_id]
              : memberNames[split.member_id];

            let splitAmount = 0;
            if (index === finalSplits.length - 1) {
              splitAmount = SafeFinancialCalculator.subtract(data.amount, allocatedSum).toNumber();
            } else {
              const baseAmount =
                split.amount !== undefined
                  ? split.amount
                  : SafeFinancialCalculator.percentage(data.amount, split.percentage).toNumber();
              splitAmount = baseAmount;
              allocatedSum = SafeFinancialCalculator.add(allocatedSum, splitAmount).toNumber();
            }

            return {
              transaction_id: id,
              member_id: actualMemberId,
              user_id: actualUserId,
              percentage: split.percentage,
              amount: splitAmount,
              name: actualName || "Membro",
              is_settled: false,
            };
          });

          const { error: splitsError } = await supabase
            .from("transaction_splits")
            .insert(splitsToInsert);

          if (splitsError) {
            // Restore original splits to avoid data loss
            if (existingSplits && existingSplits.length > 0) {
              await supabase.from("transaction_splits").insert(existingSplits);
            }
            logger.error("Erro ao atualizar splits:", splitsError);
            throw new Error(`Erro ao atualizar divisões: ${splitsError.message}`);
          }
        }
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
    onMutate: async ({ id, cascadeType = "NONE" }) => {
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
