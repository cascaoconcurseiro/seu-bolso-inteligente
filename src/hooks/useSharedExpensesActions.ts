import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ERROR_MESSAGES, SettlementErrorCode } from "@/services/settlementValidation";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { User } from "@supabase/supabase-js";
import { createNotification } from "@/services/notificationService";

import { FamilyMember } from "@/hooks/useFamily";
import { moneyUtils } from "@/utils/money";
import { logger } from "@/utils/logger";

interface SharedExpensesActionsProps {
  selectedMember: string | null;
  settleAccountId: string;
  settleType: "PAY" | "RECEIVE";
  settleAmount: string;
  selectedItems: string[];
  settleDate: string;
  members: FamilyMember[];
  getFilteredInvoice: (memberId: string) => InvoiceItem[];
  createTransaction: any; // Facilitando a integração de tipos complexos do Tanstack Query
  queryClient?: any; /* any */
  user: User | null;
  invalidateRelated: (txId: string) => Promise<void>;
  refetch: () => Promise<void | any>;
  undoConfirm: { isOpen: boolean; item: InvoiceItem | null };
  setUndoConfirm: (val: { isOpen: boolean; item: InvoiceItem | null }) => void;
  deleteConfirm: { isOpen: boolean; item: InvoiceItem | null };
  setDeleteConfirm: (val: { isOpen: boolean; item: InvoiceItem | null }) => void;
  deleteSeriesConfirm: { isOpen: boolean; item: InvoiceItem | null };
  setDeleteSeriesConfirm: (val: { isOpen: boolean; item: InvoiceItem | null }) => void;
  setIsUndoingAll: (val: boolean) => void;
  setUndoAllConfirm: (val: boolean) => void;
  setIsSettling: (val: boolean) => void;
  setShowSettleDialog: (val: boolean) => void;
  setSelectedMember: (val: string | null) => void;
  setSettleAmount: (val: string) => void;
  setSettleAccountId: (val: string) => void;
  setSelectedItems: (val: string[]) => void;
  formatCurrency: (amount: number, currency: string) => string;
  exchangeRate?: string;
  accounts: any[];
}

export function useSharedExpensesActions(props: SharedExpensesActionsProps) {
  const {
    selectedMember,
    settleAccountId,
    settleAmount,
    selectedItems,
    settleDate,
    members,
    getFilteredInvoice,
    user,
    invalidateRelated,
    refetch,
    undoConfirm,
    setUndoConfirm,
    deleteConfirm,
    setDeleteConfirm,
    deleteSeriesConfirm,
    setDeleteSeriesConfirm,
    setIsUndoingAll,
    setUndoAllConfirm,
    setIsSettling,
    setShowSettleDialog,
    setSelectedMember,
    setSettleAmount,
    setSettleAccountId,
    setSelectedItems,
    formatCurrency,
    queryClient,
  } = props;

  const handleSettle = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (!selectedMember || !settleAccountId) {
      toast.error("Selecione uma conta");
      return;
    }

    setIsSettling(true);
    try {
      const member = members.find((m) => m.id === selectedMember);
      const items = getFilteredInvoice(selectedMember);

      const itemsToSettle =
        selectedItems.length > 0
          ? items.filter((i) => selectedItems.includes(i.id))
          : items.filter((i) => !i.isPaid);

      if (itemsToSettle.length === 0) {
        toast.error("Nenhum item para acertar");
        setIsSettling(false);
        return;
      }

      const amount = moneyUtils.parse(settleAmount.replace(".", "").replace(",", "."));
      if (isNaN(amount) || amount < 0) {
        toast.error("Valor inválido");
        setIsSettling(false);
        return;
      }

      const settlementCurrency = itemsToSettle[0]?.currency || "BRL";

      const itemsTotal = itemsToSettle
        .reduce(
          (sum, item) =>
            item.type === "CREDIT"
              ? SafeFinancialCalculator.add(sum, item.amount)
              : SafeFinancialCalculator.subtract(sum, item.amount),
          SafeFinancialCalculator.ZERO
        )
        .toNumber();

      const absoluteTotalDue = Math.abs(itemsTotal);

      if (amount > absoluteTotalDue + 0.01) {
        toast.error(
          `O valor do acerto (${SafeFinancialCalculator.formatCurrency(amount, settlementCurrency)}) não pode ser maior que o total devido (${SafeFinancialCalculator.formatCurrency(absoluteTotalDue, settlementCurrency)})`
        );
        setIsSettling(false);
        return;
      }

      const splitIds = itemsToSettle.map((i) => i.splitId).filter((id): id is string => !!id);
      const txId: string | null = null;

      // SEC-004: bloquear liquidação de itens de domínios distintos na mesma operação
      const uniqueTripIdsCheck = [...new Set(itemsToSettle.map((i) => i.tripId ?? null))];
      const domainsInBatch = new Set(itemsToSettle.map((i) => (i.tripId ? "TRAVEL" : "PERSONAL")));
      if (domainsInBatch.size > 1 || uniqueTripIdsCheck.filter(Boolean).length > 1) {
        toast.error(
          "Não é possível acertar itens de viagens diferentes em uma única operação. Selecione apenas itens da mesma origem."
        );
        setIsSettling(false);
        return;
      }

      const hasCredits = itemsToSettle.some((i) => i.type === "CREDIT");
      const hasDebits = itemsToSettle.some((i) => i.type === "DEBIT");
      const isCompensated = hasCredits && hasDebits;

      // ATUALIZAÇÃO OTIMISTA
      setShowSettleDialog(false);
      const previousState = queryClient
        ? queryClient.getQueryData(["shared-transactions-consolidated"])
        : null;
      if (queryClient) {
        queryClient.setQueryData(["shared-transactions-consolidated"], (old: any /* any */) => {
          if (!old) return old;
          return old.map((tx: any /* any */) => {
            if (tx.transaction_splits && Array.isArray(tx.transaction_splits)) {
              return {
                ...tx,
                transaction_splits: tx.transaction_splits.map((split: any /* any */) => {
                  if (splitIds.includes(split.id)) {
                    const isPerfectComp = Math.abs(itemsTotal) < 0.01;
                    return {
                      ...split,
                      settled_by_debtor:
                        user?.id === split.debtor_id ? true : split.settled_by_debtor,
                      settled_by_creditor:
                        user?.id === split.creditor_id ? true : split.settled_by_creditor,
                      is_settled: isPerfectComp ? true : split.is_settled,
                    };
                  }
                  return split;
                }),
              };
            }
            return tx;
          });
        });
      }

      const uniqueTripIds = [...new Set(itemsToSettle.map((i) => i.tripId).filter(Boolean))];
      const tripId = uniqueTripIds.length === 1 ? uniqueTripIds[0] : null;
      const domain = tripId ? "TRAVEL" : "SHARED";

      // 1. Caso de compensação perfeita (valores iguais se anulam)
      if (Math.abs(itemsTotal) < 0.01) {
        const { error: updateError } = await supabase
          .from("transaction_splits")
          .update({
            settled_by_debtor: true,
            settled_by_creditor: true,
            is_settled: true,
            settled_at: new Date().toISOString(),
          })
          .in("id", splitIds);

        if (updateError) throw updateError;

        toast.success("Compensação realizada com sucesso! As despesas mútuas se anularam.");
      }
      // 2. O usuário é o credor líquido (recebendo o valor compensado)
      else if (itemsTotal > 0) {
        const { error } = await supabase.rpc("request_settlement", {
          p_split_ids: splitIds,
          p_account_id: settleAccountId,
          p_user_id: user.id,
          p_is_payment: false,
          p_amount: amount,
        });

        if (error) throw error;

        toast.success("Acerto registrado com sucesso!");
      }
      // 3. O usuário é o devedor líquido (pagando o saldo compensado)
      else {
        const { error } = await supabase.rpc("request_settlement", {
          p_split_ids: splitIds,
          p_account_id: settleAccountId,
          p_user_id: user.id,
          p_is_payment: true,
          p_amount: amount,
        });

        if (error) throw error;

        toast.success("Acerto registrado com sucesso!");
      }

      setSelectedMember(null);
      setSettleAmount("");
      setSettleAccountId("");
      setSelectedItems([]);

      if (itemsToSettle[0]?.originalTxId) {
        await invalidateRelated(itemsToSettle[0].originalTxId);
      }
      // Força invalidação do saldo compartilhado (dashboard FamilyBalancePanel)
      queryClient?.invalidateQueries({ queryKey: ["shared-balances"] });
      refetch(); // Sem await para não travar a UI
    } catch (error) {
      logger.error("Settlement error", error);
      // Rollback imediato do optimistic update
      if (queryClient && previousState) {
        queryClient.setQueryData(["shared-transactions-consolidated"], previousState);
      }
      queryClient?.invalidateQueries({ queryKey: ["shared-transactions-consolidated"] });
      queryClient?.invalidateQueries({ queryKey: ["shared-balances"] });
      toast.error("Erro ao realizar acerto");
    } finally {
      setIsSettling(false);
    }
  };

  const handleUndoSettlement = async () => {
    const item = undoConfirm.item;
    if (!item || !item.splitId) return;

    try {
      const { data, error } = await supabase.rpc("undo_settlement", {
        p_split_id: item.splitId,
        p_user_id: user?.id,
      });

      if (error) {
        logger.error("Erro no RPC undo_settlement:", error);
        throw error;
      }

      const result = data as { success?: boolean; error?: string };
      if (result && result.success === false) {
        toast.error(result.error || "Erro ao desfazer acerto");
        return;
      }

      showActionFeedback("success");
      setTimeout(() => {
        setUndoConfirm({ isOpen: false, item: null });
      }, 80);

      if (item.originalTxId) {
        await invalidateRelated(item.originalTxId);
      }
      await refetch();
      queryClient?.invalidateQueries({ queryKey: ["shared-balances"] });

      // Identificar o outro usuário corretamente: memberId é family_members.id,
      // user?.id é auth.users.id — comparar via linked_user_id
      const myMember = members.find((m) => m.linked_user_id === user?.id);
      const isMe = myMember && item.memberId === myMember.id;
      const otherUserId = isMe
        ? item.creatorUserId
        : members.find((m) => m.id === item.memberId)?.linked_user_id;
      if (otherUserId && otherUserId !== user?.id) {
        await createSettlementRejectedNotification(
          otherUserId,
          user?.user_metadata?.name || user?.email || "Alguém",
          item.description
        );
      }

      toast.success("Acerto desfeito com sucesso!");
    } catch (error) {
      logger.error("Erro ao desfazer acerto", error);
      toast.error("Erro ao desfazer acerto");
    }
  };

  const handleDeleteTransaction = async () => {
    const item = deleteConfirm.item;
    if (!item || !item.originalTxId) return;

    try {
      if (!item.canDelete) {
        const errorMsg =
          item.blockReason || ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED];
        const errorMessage = typeof errorMsg === "string" ? errorMsg : errorMsg.message;
        toast.error(errorMessage);
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }

      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da transação pode excluí-la");
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }

      const { error } = await supabase.from("transactions").delete().eq("id", item.originalTxId);

      if (error) throw error;

      showActionFeedback("success");
      setTimeout(() => {
        setDeleteConfirm({ isOpen: false, item: null });
      }, 80);

      await invalidateRelated(item.originalTxId);
      await refetch();
      queryClient?.invalidateQueries({ queryKey: ["shared-balances"] });

      const otherUserId = members.find((m) => m.id === item.memberId)?.linked_user_id;
      if (otherUserId && otherUserId !== user?.id) {
        await createNotification({
          user_id: otherUserId,
          type: "SHARED_EXPENSE",
          title: "Transação Removida",
          message: `${user?.user_metadata?.name || user?.email || "Alguém"} excluiu a transação compartilhada "${item.description}".`,
          icon: "🗑️",
          priority: "NORMAL",
        });
      }
    } catch (error) {
      logger.error("Erro ao excluir transação", error);
      showActionFeedback("error");
      toast.error("Erro ao excluir transação");
    }
  };

  const handleDeleteSeries = async () => {
    const item = deleteSeriesConfirm.item;
    if (!item || !item.seriesId) return;

    try {
      if (!item.canDelete) {
        const errorMsg =
          item.blockReason || ERROR_MESSAGES[SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS];
        const errorMessage = typeof errorMsg === "string" ? errorMsg : errorMsg.message;
        toast.error(errorMessage);
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da série pode excluí-la");
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      const { data, error } = await supabase.rpc("delete_installment_series" as any, {
        p_series_id: item.seriesId,
      });
      if (error) throw error;

      const deletedCount = data?.[0]?.deleted_count || 0;
      if (deletedCount === 0) throw new Error("Nenhuma parcela foi excluída.");

      showActionFeedback("success");
      setTimeout(() => {
        setDeleteSeriesConfirm({ isOpen: false, item: null });
      }, 80);
      if (item.originalTxId) await invalidateRelated(item.originalTxId);
      await refetch();
      queryClient?.invalidateQueries({ queryKey: ["shared-balances"] });

      const otherUserId = members.find((m) => m.id === item.memberId)?.linked_user_id;
      if (otherUserId && otherUserId !== user?.id) {
        await createNotification({
          user_id: otherUserId,
          type: "SHARED_EXPENSE",
          title: "Série de Parcelas Removida",
          message: `${user?.user_metadata?.name || user?.email || "Alguém"} excluiu uma série de ${item.totalInstallments} parcelas compartilhadas ("${item.description}").`,
          icon: "🗑️",
          priority: "NORMAL",
        });
      }
    } catch (error) {
      logger.error("Erro ao excluir série", error);
      toast.error("Erro ao excluir série");
    }
  };

  const handleUndoAll = async () => {
    setIsUndoingAll(true);
    try {
      const allPaidItems: InvoiceItem[] = [];
      members.forEach((member) => {
        const items = getFilteredInvoice(member.id);
        const paidItems = items.filter((i) => i.isPaid && i.splitId);
        allPaidItems.push(...paidItems);
      });

      if (allPaidItems.length === 0) {
        toast.info("Não há itens acertados para desfazer neste período.");
        setUndoAllConfirm(false);
        setIsUndoingAll(false);
        return;
      }

      let successCount = 0;
      for (const item of allPaidItems) {
        try {
          if (item.splitId) {
            const { error } = await supabase.rpc("undo_settlement", {
              p_split_id: item.splitId,
              p_user_id: user?.id,
            });

            if (error) {
              logger.error(`Erro ao desfazer split ${item.splitId}:`, error);
              continue;
            }

            successCount++;
          }
        } catch (err) {
          logger.error("Erro ao desfazer item no Undo All", err);
        }
      }

      setUndoAllConfirm(false);
      await refetch();
      queryClient?.invalidateQueries({ queryKey: ["shared-balances"] });
      toast.success(`${successCount} acerto(s) desfeito(s) com sucesso!`);
    } catch (error) {
      logger.error("Erro ao desfazer todos os acertos", error);
      toast.error("Erro ao desfazer os acertos");
    } finally {
      setIsUndoingAll(false);
      setUndoAllConfirm(false);
    }
  };

  return {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll,
  };
}
