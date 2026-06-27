import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { dateUtils } from "@/lib/dateUtils";
import { calculateTransactionSplits } from "@/utils/sharedFinanceCalculations";
import {
  invalidateFinancialQueries,
  invalidateSharedQueries,
  invalidateTripQueries,
} from "@/utils/queryInvalidation";
import { transactionToasts } from "@/utils/toastMessages";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { logger } from "@/utils/logger";
import {
  generateAllNotifications,
  dismissRelatedNotifications,
} from "@/services/notificationGenerator";
import { createNotification } from "@/services/notificationService";
import { CategoryPredictionService } from "@/services/categoryPredictionService";
import { matchAutoShareRule } from "@/hooks/useAutoShareRules";
import { CreateTransactionInput, Transaction } from "./types";
import { validatePayerId } from "./helpers";

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: async (newTx) => {
      // Cancelar refetches de transações para não sobrescrever nossa atualização otimista
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      await queryClient.cancelQueries({ queryKey: ["dashboard_data"] });

      // Save previous data for all transaction queries in case we need to rollback
      const previousTransactions = queryClient.getQueriesData({ queryKey: ["transactions"] });

      // Injetar transação temporária em todas as consultas relacionadas a transações na UI
      if (user) {
        queryClient.setQueriesData(
          { queryKey: ["transactions"] },
          (old: Transaction[] | undefined) => {
            const optimisticTx = {
              id: `temp-${Date.now()}`,
              user_id: user.id,
              creator_user_id: user.id,
              amount: newTx.amount,
              description: newTx.description,
              date: newTx.date,
              type: newTx.type,
              account_id: newTx.account_id,
              category_id: newTx.category_id,
              is_shared: newTx.is_shared,
              domain: newTx.domain || "PERSONAL",
              created_at: new Date().toISOString(),
              is_optimistic: true, // Útil caso queiramos mostrar um ícone de carregando
              category: { id: newTx.category_id, name: "...", icon: "⏳" },
              account: { id: newTx.account_id, name: "..." },
            };

            if (!old) return [optimisticTx] as Transaction[];
            return [optimisticTx, ...old] as Transaction[];
          }
        );
      }

      return { previousTransactions };
    },
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user) throw new Error("User not authenticated");

      // ✅ PARALELIZAR CONSULTAS INICIAIS
      const accDataPromise = input.account_id
        ? supabase
            .from("accounts")
            .select("type, closing_day")
            .eq("id", input.account_id)
            .maybeSingle()
        : Promise.resolve({ data: null });

      const memberDataPromise =
        input.is_shared && !input.payer_id
          ? supabase.from("family_members").select("id").eq("linked_user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null });

      const existingTxPromise = supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("amount", input.amount)
        .eq("description", (input.description || "").trim())
        .eq("date", input.date)
        .eq("account_id", input.account_id || "")
        .gt("created_at", new Date(Date.now() - 10000).toISOString())
        .maybeSingle();

      const [accResult, memberResult, existingTxResult] = await Promise.all([
        accDataPromise,
        memberDataPromise,
        existingTxPromise,
      ]);

      let cardClosingDay: number | null = null;
      if (accResult.data && accResult.data.type === "CREDIT_CARD") {
        cardClosingDay = accResult.data.closing_day || 1;
      }

      const calculateCompetence = (dateStr: string) => {
        const d = dateUtils.parseDate(dateStr);
        if (cardClosingDay !== null) {
          const day = d.getUTCDate();
          let compMonth = d.getUTCMonth();
          let compYear = d.getUTCFullYear();
          if (day >= cardClosingDay) {
            compMonth++;
            if (compMonth > 11) {
              compMonth = 0;
              compYear++;
            }
          }
          return `${compYear}-${String(compMonth + 1).padStart(2, "0")}-01`;
        }
        return dateUtils.getCompetenceDate(d);
      };

      // ✅ VALIDAÇÃO: Payer ID (Quem pagou)
      let resolvedPayerId = input.payer_id;

      if (input.is_shared && !resolvedPayerId) {
        if (memberResult.data) {
          resolvedPayerId = memberResult.data.id;
          input.payer_id = resolvedPayerId;
        } else {
          // Fallback final: Tentar encontrar admin se necessário
          const { data: adminMember } = await supabase
            .from("family_members")
            .select("id")
            .eq("role", "admin")
            .limit(1)
            .maybeSingle();

          if (adminMember) {
            resolvedPayerId = adminMember.id;
            input.payer_id = resolvedPayerId;
          } else {
            throw new Error("Não foi possível identificar seu perfil de membro.");
          }
        }
      }

      // Validar payer_id se fornecido
      if (input.payer_id) {
        await validatePayerId(input.payer_id);
      }

      // ✅ VALIDAÇÃO E AUTO-COMPLETAGEM DE SPLITS
      const finalSplits = [...(input.splits || [])];

      if (input.is_shared) {
        const totalPercentage = finalSplits.reduce(
          (sum, s) => SafeFinancialCalculator.add(sum, Number(s.percentage || 0)),
          0
        );

        if (totalPercentage > 100) {
          throw new Error(
            `A soma das porcentagens não pode exceder 100% (atualmente: ${totalPercentage.toFixed(1)}%)`
          );
        }

        if (finalSplits.length === 0) {
          throw new Error("Transação compartilhada deve ter pelo menos um membro selecionado.");
        }

        if (totalPercentage < 100) {
          const remainingPercentage = 100 - totalPercentage;
          const mySplitIndex = finalSplits.findIndex((s) => s.member_id === user!.id);

          if (mySplitIndex >= 0) {
            const currentPct = finalSplits[mySplitIndex].percentage || 0;
            const newPct = currentPct + remainingPercentage;

            finalSplits[mySplitIndex] = {
              ...finalSplits[mySplitIndex],
              percentage: newPct,
              amount: SafeFinancialCalculator.percentage(input.amount, newPct),
            };
          } else {
            finalSplits.push({
              member_id: user!.id,
              percentage: remainingPercentage,
              amount: SafeFinancialCalculator.percentage(input.amount, remainingPercentage),
            });
          }
        }
      }

      if (input.amount <= 0) {
        throw new Error("O valor da transação deve ser maior que zero");
      }

      if (!input.description || input.description.trim() === "") {
        throw new Error("A descrição é obrigatória");
      }

      // ✅ TRAVA DE DUPLICIDADE
      if (existingTxResult.data) {
        throw new Error(
          "⚠️ Transação duplicada detectada! Aguarde alguns segundos ou verifique se já foi lançada."
        );
      }

      const { splits, transaction_splits, ...transactionData } = input;

      // Parcelamento — usa RPC atômica (ARC-02: rollback automático se splits falharem)
      if (input.is_installment && input.total_installments && input.total_installments > 1) {
        const seriesId = input.series_id || crypto.randomUUID();
        const startingInstallment = input.current_installment || 1;
        const installmentsToCreate = input.total_installments - startingInstallment + 1;

        const installmentAmount = SafeFinancialCalculator.calculateInstallment(
          input.amount,
          input.total_installments // divisor é o TOTAL de parcelas, não as restantes
        );

        const baseDate = dateUtils.parseDate(input.date);

        // Resolve member data before building transactions (needed for embedded splits)
        let memberNames: Record<string, string> = {};
        let memberUserIds: Record<string, string> = {};
        let userIdToMemberId: Record<string, string> = {};
        let userIdToName: Record<string, string> = {};

        if (finalSplits && finalSplits.length > 0) {
          const memberIds = finalSplits.map((s) => s.member_id);
          const { data: membersData } = await supabase
            .from("family_members")
            .select("id, name, linked_user_id")
            .or(`id.in.(${memberIds.join(",")}),linked_user_id.in.(${memberIds.join(",")})`);

          membersData?.forEach((m) => {
            memberNames[m.id] = m.name;
            if (m.linked_user_id) {
              memberUserIds[m.id] = m.linked_user_id;
              userIdToMemberId[m.linked_user_id] = m.id;
              userIdToName[m.linked_user_id] = m.name;
            }
          });

          const invalidMembers = memberIds.filter(
            (id) => id !== user.id && !memberNames[id] && !userIdToName[id]
          );
          if (invalidMembers.length > 0) {
            logger.error("Membros de split inválidos detectados:", invalidMembers);
            throw new Error("Um ou mais membros selecionados para divisão não são válidos.");
          }
        }

        const transactionsForRpc = [];
        let allocatedAmount = 0;

        for (let i = 0; i < installmentsToCreate; i++) {
          const currentInstNum = startingInstallment + i;
          const installmentDate = dateUtils.addMonthsToDate(baseDate, i);
          const formattedDate = dateUtils.formatDate(installmentDate);
          const competenceDate = calculateCompetence(formattedDate);
          const isSharedNow = (finalSplits && finalSplits.length > 0) || input.domain === "SHARED";

          let currentAmount = installmentAmount;
          if (i === installmentsToCreate - 1) {
            currentAmount = SafeFinancialCalculator.subtract(input.amount, allocatedAmount);
          } else {
            allocatedAmount = SafeFinancialCalculator.add(allocatedAmount, currentAmount);
          }

          // Build embedded splits for this installment
          let embeddedSplits: Record<string, unknown>[] = [];
          if (finalSplits && finalSplits.length > 0) {
            const splitResults = calculateTransactionSplits(currentAmount, finalSplits, user.id);
            embeddedSplits = splitResults.map((split) => {
              const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
              return {
                member_id: isUserId ? userIdToMemberId[split.member_id] : split.member_id,
                user_id: isUserId ? split.member_id : memberUserIds[split.member_id],
                percentage: split.percentage,
                amount: split.amount,
                name:
                  (isUserId ? userIdToName[split.member_id] : memberNames[split.member_id]) ||
                  "Membro",
              };
            });
          }

          transactionsForRpc.push({
            ...transactionData,
            amount: currentAmount,
            date: formattedDate,
            competence_date: competenceDate,
            description: `${input.description} (${currentInstNum}/${input.total_installments})`,
            current_installment: currentInstNum,
            series_id: seriesId,
            is_shared: isSharedNow,
            domain: input.trip_id ? "TRAVEL" : isSharedNow ? "SHARED" : input.domain || "PERSONAL",
            payer_id: input.payer_id,
            splits: embeddedSplits,
          });
        }

        const { data: rpcData, error } = await supabase.rpc("create_installment_series", {
          p_transactions: transactionsForRpc,
        });

        if (error) {
          logger.error("Erro ao criar parcelas (RPC atômica):", error);
          throw error;
        }

        if (finalSplits && finalSplits.length > 0) {
          try {
            const otherUserIds = Array.from(
              new Set(
                finalSplits
                  .map((s) => {
                    const isUserId = !memberNames[s.member_id] && userIdToName[s.member_id];
                    return isUserId ? s.member_id : memberUserIds[s.member_id];
                  })
                  .filter((uid): uid is string => !!uid && uid !== user?.id)
              )
            );

            Promise.all(
              otherUserIds.map((otherUserId) =>
                createNotification({
                  user_id: otherUserId,
                  type: "SHARED_EXPENSE",
                  title: "Novas Transações Compartilhadas",
                  message: `${user?.user_metadata?.name || user?.email || "Alguém"} criou uma transação parcelada compartilhada "${input.description}".`,
                  icon: "🤝",
                  priority: "NORMAL",
                }).catch((e) =>
                  logger.error("Erro ao criar notificação de parcelamento compartilhado:", e)
                )
              )
            );
          } catch (notificationError) {
            logger.error(
              "Erro ao notificar criação de parcelamento compartilhado:",
              notificationError
            );
          }
        }

        return rpcData;
      }

      // Transação única
      let categoryId = input.category_id;

      if (!categoryId && (input.type === "EXPENSE" || input.type === "INCOME")) {
        try {
          const prediction = await CategoryPredictionService.predictCategory(
            input.description,
            user.id,
            input.type.toLowerCase() as "expense" | "income"
          );

          if (prediction && prediction.confidence > 0.5) {
            categoryId = prediction.categoryId;
            logger.debug("Categorização automática aplicada", {
              description: input.description,
              categoryId,
              confidence: prediction.confidence,
              reason: prediction.reason,
            });
          }
        } catch (error) {
          logger.warn("Categorização automática falhou, continuando sem categoria", { error });
        }
      }

      // Auto-share: verificar regras configuradas pelo usuário
      if (input.type === "EXPENSE" && (!finalSplits || finalSplits.length === 0)) {
        try {
          const { data: autoRules } = await supabase
            .from("transaction_auto_share_rules")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true);

          if (autoRules && autoRules.length > 0) {
            const matched = matchAutoShareRule(autoRules as any, categoryId, input.description);
            if (matched) {
              const otherPct = matched.split_ratio * 100;
              finalSplits.push({
                member_id: matched.member_id,
                percentage: otherPct,
              });
              // Criador também precisa de split explícito — senão o último split
              // (que é o outro membro) absorve 100% em calculateTransactionSplits
              finalSplits.push({
                member_id: user.id,
                percentage: 100 - otherPct,
              });
            }
          }
        } catch {
          // silencioso: auto-share não deve bloquear criação
        }
      }

      const isSharedNow = (finalSplits && finalSplits.length > 0) || input.domain === "SHARED";

      // Transação única — usa RPC atômica se tiver splits (ARC-01)
      const txPayload = {
        competence_date: input.competence_date || calculateCompetence(input.date),
        ...transactionData,
        category_id: categoryId,
        is_shared: isSharedNow,
        domain: input.trip_id ? "TRAVEL" : isSharedNow ? "SHARED" : input.domain || "PERSONAL",
        payer_id: input.payer_id,
        is_recurring: input.is_recurring || false,
        recurrence_pattern: input.frequency || null,
        recurrence_day: input.recurrence_day || null,
      };

      let data: Transaction | null;

      if (finalSplits && finalSplits.length > 0) {
        const memberIds = finalSplits.map((s) => s.member_id);
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

        const splitResults = calculateTransactionSplits(input.amount, finalSplits, user.id);
        const splitsPayload = splitResults.map((split) => {
          const isUserId = !memberNames[split.member_id] && userIdToName[split.member_id];
          return {
            member_id: isUserId ? userIdToMemberId[split.member_id] : split.member_id,
            user_id: isUserId ? split.member_id : memberUserIds[split.member_id],
            percentage: split.percentage,
            amount: split.amount,
            name:
              (isUserId ? userIdToName[split.member_id] : memberNames[split.member_id]) || "Membro",
            is_settled: false,
          };
        });

        const { data: rpcResult, error } = await supabase.rpc("create_transaction_with_splits", {
          p_transaction: txPayload,
          p_splits: splitsPayload,
        });

        if (error) {
          logger.error("Erro ao criar transação+splits (RPC atômica):", error);
          throw error;
        }

        data = rpcResult;
      } else {
        const { data: inserted, error } = await supabase
          .from("transactions")
          .insert({ user_id: user.id, creator_user_id: user.id, ...txPayload })
          .select()
          .single();

        if (error) {
          logger.error("Erro ao criar transação:", error);
          throw error;
        }

        data = inserted;
      }

      const isTransactionShared =
        (finalSplits && finalSplits.length > 0) ||
        data?.domain === "SHARED" ||
        input.domain === "SHARED";
      if (data && isTransactionShared) {
        try {
          const { data: splitsData } = await supabase
            .from("transaction_splits")
            .select("user_id")
            .eq("transaction_id", data.id);

          if (splitsData && splitsData.length > 0) {
            const otherUserIds = Array.from(
              new Set(splitsData.map((s) => s.user_id).filter((uid) => uid && uid !== user?.id))
            );
            Promise.all(
              otherUserIds.map((otherUserId) =>
                createNotification({
                  user_id: otherUserId,
                  type: "SHARED_EXPENSE",
                  title: "Nova Transação Compartilhada",
                  message: `${user?.user_metadata?.name || user?.email || "Alguém"} criou a transação compartilhada "${data.description}".`,
                  icon: "🤝",
                  priority: "NORMAL",
                }).catch((e) =>
                  logger.error("Erro ao criar notificação de criação compartilhada:", e)
                )
              )
            );
          }
        } catch (notificationError) {
          logger.error("Erro ao notificar criação de compartilhada:", notificationError);
        }
      }

      return data as Transaction;
    },
    onSuccess: async (_data, variables) => {
      showActionFeedback("success");

      if (user?.id) {
        if (variables?.type === "TRANSFER" && variables?.destination_account_id) {
          // Fire and forget
          dismissRelatedNotifications(
            user.id,
            variables.destination_account_id,
            "credit_card"
          ).catch((e) => logger.error("Erro dismiss", e));
        }
        // Fire and forget
        generateAllNotifications(user.id).catch((e) =>
          logger.error("Erro ao gerar notificações pós-transação", e)
        );
      }
    },
    onError: (
      error,
      _newTx,
      context: { previousTransactions: [unknown, unknown][] } | undefined
    ) => {
      // Rollback da cache em caso de erro
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(
            queryKey as Parameters<typeof queryClient.setQueryData>[0],
            data
          );
        });
      }
      showActionFeedback("error");
    },
    onSettled: () => {
      // Ao finalizar (sucesso ou erro), revalidamos os dados finais
      invalidateFinancialQueries(queryClient);
      invalidateSharedQueries(queryClient);
      invalidateTripQueries(queryClient);
    },
  });
}
