import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ERROR_MESSAGES, SettlementErrorCode } from "@/services/settlementValidation";
import { InvoiceItem } from "@/hooks/useSharedFinances";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { User } from "@supabase/supabase-js";
import { 
  createSettlementRequestNotification, 
  createPaymentConfirmedNotification, 
  createSettlementRejectedNotification,
  createNotification,
  createDebtorSettlementRequestNotification
} from "@/services/notificationService";

import { FamilyMember } from "@/hooks/useFamily";
import { moneyUtils } from "@/utils/money";
import { logger } from '@/utils/logger';


interface SharedExpensesActionsProps {
  selectedMember: string | null;
  settleAccountId: string;
  settleType: 'PAY' | 'RECEIVE';
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
  onConfirmReceipt?: (items: InvoiceItem[], accountId: string, date: string) => Promise<void>;
  onRejectSettlement?: (item: InvoiceItem, reason: string) => Promise<void>;
}

export function useSharedExpensesActions(props: SharedExpensesActionsProps) {
  const {
    selectedMember, settleAccountId, settleAmount, selectedItems,
    settleDate, members, getFilteredInvoice, user,
    invalidateRelated, refetch, undoConfirm, setUndoConfirm, deleteConfirm,
    setDeleteConfirm, deleteSeriesConfirm, setDeleteSeriesConfirm, setIsUndoingAll,
    setUndoAllConfirm, setIsSettling, setShowSettleDialog, setSelectedMember,
    setSettleAmount, setSettleAccountId, setSelectedItems,
    formatCurrency, queryClient
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
      const member = members.find(m => m.id === selectedMember);
      const items = getFilteredInvoice(selectedMember);

      const itemsToSettle = selectedItems.length > 0
        ? items.filter(i => selectedItems.includes(i.id))
        : items.filter(i => !i.isPaid);

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

      const settlementCurrency = itemsToSettle[0]?.currency || 'BRL';

      const itemsTotal = itemsToSettle.reduce((sum, item) => {
        if (item.type === "CREDIT") return SafeFinancialCalculator.add(sum, item.amount);
        return SafeFinancialCalculator.subtract(sum, item.amount);
      }, 0);

      const absoluteTotalDue = Math.abs(itemsTotal);

      if (amount > absoluteTotalDue + 0.01) {
        toast.error(`O valor do acerto (${SafeFinancialCalculator.formatCurrency(amount, settlementCurrency)}) não pode ser maior que o total devido (${SafeFinancialCalculator.formatCurrency(absoluteTotalDue, settlementCurrency)})`);
        setIsSettling(false);
        return;
      }

      const splitIds = itemsToSettle.map(i => i.splitId).filter((id): id is string => !!id);
      const txId: string | null = null;

      const hasCredits = itemsToSettle.some(i => i.type === 'CREDIT');
      const hasDebits = itemsToSettle.some(i => i.type === 'DEBIT');
      const isCompensated = hasCredits && hasDebits;

      // ATUALIZAÇÃO OTIMISTA
      setShowSettleDialog(false);
      const previousState = queryClient ? queryClient.getQueryData(['shared-transactions-consolidated']) : null;
      if (queryClient) {
        queryClient.setQueryData(['shared-transactions-consolidated'], (old: any /* any */) => {
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
                      settled_by_debtor: user?.id === split.debtor_id ? true : split.settled_by_debtor,
                      settled_by_creditor: user?.id === split.creditor_id ? true : split.settled_by_creditor,
                      is_settled: isPerfectComp ? true : split.is_settled
                    };
                  }
                  return split;
                })
              };
            }
            return tx;
          });
        });
      }

      const uniqueTripIds = [...new Set(itemsToSettle.map(i => i.tripId).filter(Boolean))];
      const tripId = uniqueTripIds.length === 1 ? uniqueTripIds[0] : null;
      const domain = tripId ? 'TRAVEL' : 'PERSONAL';

      // 1. Caso de compensação perfeita (valores iguais se anulam)
      if (Math.abs(itemsTotal) < 0.01) {
        const { error: updateError } = await supabase
          .from('transaction_splits')
          .update({
            settled_by_debtor: true,
            settled_by_creditor: true,
            is_settled: true,
            settled_at: new Date().toISOString()
          })
          .in('id', splitIds);

        if (updateError) throw updateError;
        
        // Notificar o outro usuário de que as dívidas foram compensadas perfeitamente
        const otherUserId = member?.linked_user_id || itemsToSettle[0]?.creatorUserId;
        if (otherUserId && otherUserId !== user.id) {
          import('@/services/notificationService').then(({ createPerfectCompensationNotification }) => {
            createPerfectCompensationNotification(
              otherUserId,
              user?.user_metadata?.name || user?.email || 'Alguém',
              itemsToSettle.length
            ).catch(err => logger.error("Error creating perfect compensation notification:", err));
          });
        }

        toast.success("Compensação realizada com sucesso! As despesas mútuas se anularam.");
      }
      // 2. O usuário é o credor líquido (recebendo o valor compensado)
      else if (itemsTotal > 0) {
        const { data, error } = await supabase.rpc('request_settlement', {
          p_split_ids: splitIds,
          p_account_id: settleAccountId,
          p_user_id: user.id,
          p_is_payment: false
        });

        if (error) throw error;
        
        // Notificar devedor para vincular a conta de onde o dinheiro saiu
        const debtorUserId = member?.linked_user_id;
        if (debtorUserId && debtorUserId !== user.id) {
          await createDebtorSettlementRequestNotification(
            debtorUserId,
            user?.user_metadata?.name || user?.email || 'O credor',
            amount,
            settlementCurrency,
            splitIds,
            (data as any)?.transaction_id,
            isCompensated
          );
        }
        
        toast.success(`Solicitação de confirmação de conta enviada para ${member?.name || 'o devedor'}!`);
      }
      // 3. O usuário é o devedor líquido (pagando o saldo compensado)
      else {
        const { data, error } = await supabase.rpc('request_settlement', {
          p_split_ids: splitIds,
          p_account_id: settleAccountId,
          p_user_id: user.id,
          p_is_payment: true
        });

        if (error) throw error;

        // Enviar notificação de acerto para o credor confirmar
        const creditorUserId = member?.linked_user_id || itemsToSettle[0]?.creatorUserId;
        if (creditorUserId && creditorUserId !== user.id) {
          await createSettlementRequestNotification(
            creditorUserId,
            user?.user_metadata?.name || user?.email || 'Alguém',
            amount,
            settlementCurrency,
            splitIds[0],
            isCompensated
          );
        }
      }

      setSelectedMember(null);
      setSettleAmount("");
      setSettleAccountId("");
      setSelectedItems([]);

      if (itemsToSettle[0]?.originalTxId) {
        await invalidateRelated(itemsToSettle[0].originalTxId);
      }
      refetch(); // Sem await para não travar a UI
      
      if (Math.abs(itemsTotal) >= 0.01) {
        toast.success(`Acerto de ${formatCurrency(amount, settlementCurrency)} processado com sucesso!`);
      }
    } catch (error) {
      logger.error('Settlement error', error);
      if (queryClient && props.queryClient?.getQueryData) {
        // Rollback optimistic update
        queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      }
      toast.error("Erro ao realizar acerto");
    } finally {
      setIsSettling(false);
    }
  };

  const handleUndoSettlement = async () => {
    const item = undoConfirm.item;
    if (!item || !item.splitId) return;

    try {
      const { data, error } = await supabase.rpc('undo_settlement', {
        p_split_id: item.splitId,
        p_user_id: user?.id
      });

      if (error) {
        logger.error('Erro no RPC undo_settlement:', error);
        throw error;
      }

      const result = data as { success?: boolean; error?: string };
      if (result && result.success === false) {
        toast.error(result.error || "Erro ao desfazer acerto");
        return;
      }

      setUndoConfirm({ isOpen: false, item: null });

      if (item.originalTxId) {
        await invalidateRelated(item.originalTxId);
      }
      await refetch();

      const otherUserId = item.memberId === user?.id ? item.creatorUserId : members.find(m => m.id === item.memberId)?.linked_user_id;
      if (otherUserId && otherUserId !== user?.id) {
        await createSettlementRejectedNotification(
          otherUserId,
          user?.user_metadata?.name || user?.email || 'Alguém',
          item.description
        );
      }

      toast.success("Acerto desfeito com sucesso!");
    } catch (error) {
      logger.error('Erro ao desfazer acerto', error);
      toast.error("Erro ao desfazer acerto");
    }
  };

  const handleDeleteTransaction = async () => {
    const item = deleteConfirm.item;
    if (!item || !item.originalTxId) return;

    try {
      if (!item.canDelete) {
        const errorMsg = item.blockReason || ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED];
        const errorMessage = typeof errorMsg === 'string' ? errorMsg : errorMsg.message;
        toast.error(errorMessage);
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }

      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da transação pode excluí-la");
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', item.originalTxId);

      if (error) throw error;

      setDeleteConfirm({ isOpen: false, item: null });
      await invalidateRelated(item.originalTxId);
      await refetch();

      const otherUserId = members.find(m => m.id === item.memberId)?.linked_user_id;
      if (otherUserId && otherUserId !== user?.id) {
        await createNotification({
          user_id: otherUserId,
          type: 'SHARED_EXPENSE',
          title: 'Transação Removida',
          message: `${user?.user_metadata?.name || user?.email || 'Alguém'} excluiu a transação compartilhada "${item.description}".`,
          icon: '🗑️',
          priority: 'NORMAL'
        });
      }

      toast.success("Transação excluída com sucesso!");
    } catch (error) {
      logger.error('Erro ao excluir transação', error);
      toast.error("Erro ao excluir transação");
    }
  };

  const handleDeleteSeries = async () => {
    const item = deleteSeriesConfirm.item;
    if (!item || !item.seriesId) return;

    try {
      if (!item.canDelete) {
        const errorMsg = item.blockReason || ERROR_MESSAGES[SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS];
        const errorMessage = typeof errorMsg === 'string' ? errorMsg : errorMsg.message;
        toast.error(errorMessage);
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da série pode excluí-la");
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      const { data, error } = await supabase.rpc('delete_installment_series' as any, { p_series_id: item.seriesId });
      if (error) throw error;

      const deletedCount = data?.[0]?.deleted_count || 0;
      if (deletedCount === 0) throw new Error("Nenhuma parcela foi excluída.");
      
      setDeleteSeriesConfirm({ isOpen: false, item: null });
      if (item.originalTxId) await invalidateRelated(item.originalTxId);
      await refetch();

      const otherUserId = members.find(m => m.id === item.memberId)?.linked_user_id;
      if (otherUserId && otherUserId !== user?.id) {
        await createNotification({
          user_id: otherUserId,
          type: 'SHARED_EXPENSE',
          title: 'Série de Parcelas Removida',
          message: `${user?.user_metadata?.name || user?.email || 'Alguém'} excluiu uma série de ${item.totalInstallments} parcelas compartilhadas ("${item.description}").`,
          icon: '🗑️',
          priority: 'NORMAL'
        });
      }

      toast.success(`${deletedCount} parcelas excluídas com sucesso!`);
    } catch (error) {
      logger.error('Erro ao excluir série', error);
      toast.error("Erro ao excluir série");
    }
  };

  const handleUndoAll = async () => {
    setIsUndoingAll(true);
    try {
      const allPaidItems: InvoiceItem[] = [];
      members.forEach(member => {
        const items = getFilteredInvoice(member.id);
        const paidItems = items.filter(i => i.isPaid && i.splitId);
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
            const { error } = await supabase.rpc('undo_settlement', {
              p_split_id: item.splitId,
              p_user_id: user?.id
            });
            
            if (error) {
              logger.error(`Erro ao desfazer split ${item.splitId}:`, error);
              continue;
            }
            
            successCount++;
          }
        } catch (err) {
          logger.error('Erro ao desfazer item no Undo All', err);
        }
      }

      setUndoAllConfirm(false);
      await refetch();
      toast.success(`${successCount} acerto(s) desfeito(s) com sucesso!`);
    } catch (error) {
      logger.error('Erro ao desfazer todos os acertos', error);
      toast.error("Erro ao desfazer os acertos");
    } finally {
      setIsUndoingAll(false);
      setUndoAllConfirm(false);
    }
  };

  const handleConfirmReceipt = async (items: InvoiceItem[], accountId: string, date: string, exchangeRate?: number) => {
    if (!user?.id) return;
    setIsSettling(true);
    try {
      const hasCredit = items.some(i => i.type === 'CREDIT');
      const hasDebit = items.some(i => i.type === 'DEBIT');
      const isNetting = hasCredit && hasDebit;

      // ATUALIZAÇÃO OTIMISTA
      if (queryClient) {
        queryClient.setQueryData(['shared-transactions-consolidated'], (old: any /* any */) => {
          if (!old) return old;
          return old.map((tx: any /* any */) => {
            if (tx.transaction_splits && Array.isArray(tx.transaction_splits)) {
              return {
                ...tx,
                transaction_splits: tx.transaction_splits.map((split: any /* any */) => {
                  if (items.some(i => i.splitId === split.id)) {
                    return { ...split, settled_by_creditor: true, is_settled: true };
                  }
                  return split;
                })
              };
            }
            return tx;
          });
        });
      }

      if (isNetting) {
        // Netting confirmation: handle custom netting transaction and split update
        const netTotal = items.reduce((sum, item) => {
          if (item.type === "CREDIT") return SafeFinancialCalculator.add(sum, item.amount);
          return SafeFinancialCalculator.subtract(sum, item.amount);
        }, 0);

        const amount = Math.abs(netTotal);
        const settlementCurrency = items[0]?.currency || 'BRL';
        let txId: string | null = null;

        const uniqueTripIds = [...new Set(items.map(i => i.tripId).filter(Boolean))];
        const tripId = uniqueTripIds.length === 1 ? uniqueTripIds[0] : null;
        const domain = tripId ? 'TRAVEL' : 'PERSONAL';

        if (amount > 0.01) {
          const isIncome = netTotal > 0;
          const { data: txData, error: txError } = await supabase.from('transactions').insert({
            user_id: user.id,
            creator_user_id: user.id,
            account_id: accountId,
            amount: amount,
            type: isIncome ? 'INCOME' : 'EXPENSE',
            description: `Recebimento de acerto por compensação`,
            date: date,
            competence_date: date,
            domain: domain,
            trip_id: tripId,
            is_shared: false,
            is_settled: true,
            currency: settlementCurrency
          }).select('id').single();

          if (txError) throw txError;
          txId = txData.id;
        }

        // Update all splits to mark them as fully settled
        const splitIds = items.map(i => i.splitId).filter((id): id is string => !!id);
        const { error: updateError } = await supabase
          .from('transaction_splits')
          .update({
            settled_by_creditor: true,
            settled_by_debtor: true,
            is_settled: true,
            settled_at: new Date().toISOString(),
            settled_transaction_id: txId || undefined
          })
          .in('id', splitIds);

        if (updateError) throw updateError;

        toast.success("Acerto por compensação confirmado com sucesso!");
      } else {
        // Standard non-netted confirmation: use standard RPC
        const splitIds = items.map(i => i.splitId).filter((id): id is string => !!id);
        const { data, error } = await supabase.rpc('confirm_settlement', {
          p_split_ids: splitIds,
          p_account_id: accountId,
          p_user_id: user.id,
          p_is_receiving: true
        });

        if (error) throw error;
        
        // Link created transaction to trip if applicable
        const uniqueTripIds = [...new Set(items.map(i => i.tripId).filter(Boolean))];
        const tripId = uniqueTripIds.length === 1 ? uniqueTripIds[0] : null;
        if (tripId) {
            const txId = (data as any)?.transaction_id;
            if (txId) {
               await supabase.from('transactions').update({ trip_id: tripId, domain: 'TRAVEL' }).eq('id', txId);
            }
        }
        
        const result = data as unknown as { success?: boolean; error?: string };
        if (result && result.success === false) {
          toast.error(result.error || "Erro ao confirmar recebimento");
          setIsSettling(false);
          return;
        }

        toast.success("Recebimento confirmado!");
      }

      refetch(); // Sem await

      const debtorId = items[0]?.memberId === user?.id ? items[0]?.creatorUserId : items[0]?.memberId;
      const debtorUserId = members.find(m => m.id === debtorId)?.linked_user_id;

      if (debtorUserId && debtorUserId !== user?.id) {
        await createPaymentConfirmedNotification(
          debtorUserId,
          user?.user_metadata?.name || user?.email || 'O credor'
        );
      }
    } catch (error) {
      logger.error('Erro ao confirmar recebimento', error);
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      }
      toast.error("Erro ao confirmar recebimento");
    } finally {
      setIsSettling(false);
    }
  };

  const handleRejectSettlement = async (item: InvoiceItem, reason: string) => {
    if (!user?.id || !item.splitId) return;
    try {
      const { error } = await supabase.rpc('reject_settlement_request', {
        p_split_id: item.splitId,
        p_reason: reason
      });
      if (error) throw error;
      toast.success("Acerto recusado.");
      await refetch();

      const debtorUserId = members.find(m => m.id === item.memberId)?.linked_user_id;
      if (debtorUserId && debtorUserId !== user?.id) {
        await createSettlementRejectedNotification(
          debtorUserId,
          user?.user_metadata?.name || user?.email || 'O credor',
          item.description,
          reason
        );
      }
    } catch (error) {
      logger.error('Erro ao recusar acerto', error);
      toast.error("Erro ao recusar acerto");
    }
  };

  const handleConfirmPayment = async (items: InvoiceItem[], accountId: string, date: string, exchangeRate?: number) => {
    if (!user?.id) return;
    setIsSettling(true);
    try {
      const amount = items.reduce((sum, item) => SafeFinancialCalculator.add(sum, item.amount), 0);
      const settlementCurrency = items[0]?.currency || 'BRL';

      const uniqueTripIds = [...new Set(items.map(i => i.tripId).filter(Boolean))];
      const tripId = uniqueTripIds.length === 1 ? uniqueTripIds[0] : null;
      const domain = tripId ? 'TRAVEL' : 'PERSONAL';

      const splitIds = items.map(i => i.splitId).filter((id): id is string => !!id);
      
      // ATUALIZAÇÃO OTIMISTA
      if (queryClient) {
        queryClient.setQueryData(['shared-transactions-consolidated'], (old: any /* any */) => {
          if (!old) return old;
          return old.map((tx: any /* any */) => {
            if (tx.transaction_splits && Array.isArray(tx.transaction_splits)) {
              return {
                ...tx,
                transaction_splits: tx.transaction_splits.map((split: any /* any */) => {
                  if (splitIds.includes(split.id)) {
                    return { ...split, settled_by_debtor: true };
                  }
                  return split;
                })
              };
            }
            return tx;
          });
        });
      }
      
      const { data, error } = await supabase.rpc('confirm_settlement', {
        p_split_ids: splitIds,
        p_account_id: accountId,
        p_user_id: user.id,
        p_is_receiving: false
      });

      if (error) throw error;
      
      // Link created transaction to trip if applicable
      if (tripId) {
          const txId = (data as any)?.transaction_id;
          if (txId) {
             await supabase.from('transactions').update({ trip_id: tripId, domain: 'TRAVEL' }).eq('id', txId);
          }
      }

      // 3. Notificar o credor de que a conta foi vinculada e o acerto foi liquidado bilateralmente!
      const creditorUserId = items[0]?.creatorUserId;
      if (creditorUserId && creditorUserId !== user.id) {
        await createPaymentConfirmedNotification(
          creditorUserId,
          user?.user_metadata?.name || user?.email || 'O devedor'
        );
      }

      toast.success("Pagamento e conta vinculada confirmados com sucesso! Acerto finalizado.");
      refetch(); // Sem await
    } catch (error) {
      logger.error('Erro ao confirmar pagamento', error);
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      }
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setIsSettling(false);
    }
  };

  const handleRejectDebtorSettlement = async (items: InvoiceItem[], reason: string) => {
    if (!user?.id || items.length === 0) return;
    try {
      // 1. Buscar a transação do credor associada
      const splitIds = items.map(i => i.splitId).filter((id): id is string => !!id);
      const { data: splitsData, error: splitsError } = await supabase
        .from('transaction_splits')
        .select('creditor_settlement_tx_id')
        .in('id', splitIds)
        .not('creditor_settlement_tx_id', 'is', null);

      if (splitsError) throw splitsError;

      const creditorTxId = splitsData?.[0]?.creditor_settlement_tx_id;

      // 2. Se houver transação do credor, excluir para estornar o crédito temporário
      if (creditorTxId) {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', creditorTxId);
      }

      // 3. Resetar os splits para pendentes
      const { error: updateError } = await supabase
        .from('transaction_splits')
        .update({
          settled_by_creditor: false,
          creditor_settlement_tx_id: null,
          settled_by_debtor: false,
          debtor_settlement_tx_id: null,
          is_settled: false,
          settled_at: null
        })
        .in('id', splitIds);

      if (updateError) throw updateError;

      toast.success("Acerto recusado. A transação do credor foi desfeita e os lançamentos voltaram a ficar pendentes.");
      await refetch();

      // 4. Notificar credor
      const creditorUserId = items[0]?.creatorUserId;
      if (creditorUserId && creditorUserId !== user?.id) {
        await createSettlementRejectedNotification(
          creditorUserId,
          user?.user_metadata?.name || user?.email || 'O devedor',
          items[0].description,
          reason
        );
      }
    } catch (error) {
      logger.error('Erro ao recusar acerto do credor', error);
      toast.error("Erro ao recusar acerto");
    }
  };

  return {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll,
    handleConfirmReceipt,
    handleRejectSettlement,
    handleConfirmPayment,
    handleRejectDebtorSettlement
  };
}
