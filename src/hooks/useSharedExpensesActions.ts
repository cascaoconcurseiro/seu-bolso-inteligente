import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  logSettlementCreated, 
  logSettlementUndone, 
  logOperationBlocked,
  logTransactionDeleted,
  logSeriesDeleted
} from "@/services/auditLog";
import { ERROR_MESSAGES, SettlementErrorCode } from "@/services/settlementValidation";
import { InvoiceItem } from "@/hooks/useSharedFinances";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSharedExpensesActions(props: any) {
  const {
    selectedMember, settleAccountId, settleType, settleAmount, selectedItems, settleDate,
    members, getFilteredInvoice, createTransaction, user, invalidateRelated, refetch,
    undoConfirm, setUndoConfirm, deleteConfirm, setDeleteConfirm, deleteSeriesConfirm,
    setDeleteSeriesConfirm, setIsUndoingAll, setUndoAllConfirm, setIsSettling,
    setShowSettleDialog, setSelectedMember, setSettleAmount, setSettleAccountId,
    setSettleDate, setSelectedItems, formatCurrency
  } = props;

  const handleSettle = async () => {
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

      // NOTA: Não verificamos isPaid aqui porque cada pessoa tem seu próprio controle
      // Wesley pode marcar como pago (settled_by_debtor) e Fran pode marcar separadamente (settled_by_creditor)
      // A verificação específica por lado é feita mais abaixo no loop de processamento

      const amount = parseFloat(settleAmount.replace(".", "").replace(",", "."));
      if (isNaN(amount) || amount <= 0) {
        toast.error("Valor inválido");
        setIsSettling(false);
        return;
      }

      // Determinar a moeda do acerto (usar a moeda dos itens)
      const settlementCurrency = itemsToSettle[0]?.currency || 'BRL';

      // Calculate total of selected items
      const itemsTotal = itemsToSettle.reduce((sum, item) => {
        if (item.type === "CREDIT") return sum + item.amount;
        return sum - item.amount;
      }, 0);

      // Considerar pagamento completo se o valor for >= 99% do total
      const isPartialSettlement = amount < Math.abs(itemsTotal) * 0.99;

      // NOVA ABORDAGEM: Criar transações individuais para cada item
      // Ao invés de criar um "Acerto - Wesley" consolidado,
      // criar transações individuais com descrição e categoria originais
      // Isso mantém a integridade contábil e permite desfazer sem inconsistências

      // Buscar transações originais para obter descrição, categoria E DATA DE COMPETÊNCIA
      const originalTxIds = itemsToSettle
        .map(i => i.originalTxId)
        .filter((id): id is string => !!id);

      const { data: originalTransactions } = await supabase
        .from('transactions')
        .select('id, description, category_id, competence_date, category:categories(id, name, icon)')
        .in('id', originalTxIds);

      // Criar mapa de transações originais
      const originalTxMap = new Map(
        originalTransactions?.map(tx => [tx.id, tx]) || []
      );

      // Criar transações individuais para cada item
      const settlementTxIds: string[] = [];

      for (const item of itemsToSettle) {
        const originalTx = originalTxMap.get(item.originalTxId || '');

        // Usar descrição e categoria da transação original
        const description = originalTx?.description || item.description;
        const categoryId = originalTx?.category_id;
        
        // CORREÇÃO CRÍTICA: Usar a data selecionada pelo usuário no formulário
        // O acerto deve aparecer no mês escolhido pelo usuário
        // Calcular competence_date a partir da data selecionada (sempre dia 1º do mês)
        const [year, month] = settleDate.split('-').map(Number);
        const competenceDate = `${year}-${String(month).padStart(2, '0')}-01`;



        // Criar transação individual
        const result = await createTransaction.mutateAsync({
          amount: item.amount,
          description: description,
          date: settleDate, // Data escolhida pelo usuário
          type: settleType === "PAY" ? "EXPENSE" : "INCOME",
          account_id: settleAccountId,
          category_id: categoryId,
          domain: "SHARED",
          is_shared: false,
          related_member_id: selectedMember,
          notes: `Acerto de: ${description} (${member?.name})`,
        });

        const settlementTxId = Array.isArray(result) ? result[0]?.id : result?.id;
        if (settlementTxId) {
          settlementTxIds.push(settlementTxId);
        }
      }

      // SEMPRE marcar items como settled
      const updateErrors: string[] = [];
      let successCount = 0;



      for (let i = 0; i < itemsToSettle.length; i++) {
        const item = itemsToSettle[i];
        const settlementTxId = settlementTxIds[i]; // Usar o ID correspondente



        // TASK 15: Validação de duplicação - verificar se já existe settlement
        if (item.splitId) {
          const { data: existingSplit, error: checkError } = await supabase
            .from('transaction_splits')
            .select('id, is_settled, settled_by_debtor, settled_by_creditor, user_id')
            .eq('id', item.splitId)
            .single();

          if (checkError) {
            console.error('❌ [handleSettle] Erro ao verificar split:', checkError);
            updateErrors.push(`Split ${item.splitId}: ${checkError.message}`);
            continue;
          }

          if (!existingSplit) {
            console.error('❌ [handleSettle] Split não encontrado:', item.splitId);
            updateErrors.push(`Split ${item.splitId}: Not found`);
            continue;
          }

          // TASK 15: Verificar se já foi marcado como pago pelo lado correto (prevenção de duplicação)
          const alreadySettled = settleType === 'PAY'
            ? existingSplit.settled_by_debtor
            : existingSplit.settled_by_creditor;

          if (alreadySettled) {
            console.warn('⚠️ [handleSettle] DUPLICAÇÃO DETECTADA - Split já está settled por este lado:', item.splitId);
            const errorMsg = ERROR_MESSAGES[SettlementErrorCode.DUPLICATE_SETTLEMENT];
            toast.error(`${errorMsg.message}: ${item.description}`);
            updateErrors.push(`Split ${item.splitId}: Duplicate settlement`);
            continue;
          }



          // Determinar qual flag atualizar baseado no tipo de acerto
          const updateFields: unknown = {
            settled_at: new Date().toISOString(),
          };

          if (settleType === 'PAY') {
            // Devedor está pagando
            updateFields.settled_by_debtor = true;
            updateFields.debtor_settlement_tx_id = settlementTxId;
          } else {
            // Credor está recebendo
            updateFields.settled_by_creditor = true;
            updateFields.creditor_settlement_tx_id = settlementTxId;
          }

          // Manter is_settled como true se ambos marcaram
          if (settleType === 'PAY' && existingSplit.settled_by_creditor) {
            updateFields.is_settled = true;
          } else if (settleType === 'RECEIVE' && existingSplit.settled_by_debtor) {
            updateFields.is_settled = true;
          }

          // Atualizar o split
          const { error, data } = await supabase
            .from('transaction_splits')
            .update(updateFields)
            .eq('id', item.splitId)
            .select();

          if (error) {
            console.error('❌ [handleSettle] Erro ao atualizar split:', error);
            updateErrors.push(`Split ${item.splitId}: ${error.message}`);
          } else if (!data || data.length === 0) {
            console.error('❌ [handleSettle] Nenhuma linha atualizada (RLS?):', item.splitId);
            updateErrors.push(`Split ${item.splitId}: No rows updated (RLS or permission issue)`);
          } else {

            successCount++;
            
            // TASK 20: Log settlement creation
            if (user?.id) {
              await logSettlementCreated(
                user.id,
                item.originalTxId || '',
                item.splitId,
                item.amount,
                item.currency || 'BRL',
                {
                  settleType,
                  description: item.description,
                  memberName: member?.name
                }
              );
            }
          }
        } else if (item.type === 'DEBIT' && item.originalTxId) {
          // Fallback: Se não tem splitId mas tem originalTxId, tentar atualizar a transaction
          // (caso antigo, não deveria acontecer mais)
          console.warn('⚠️ [handleSettle] Item DEBIT sem splitId, tentando atualizar transaction:', item.originalTxId);

          const { error, data } = await supabase
            .from('transactions')
            .update({
              is_settled: true,
              settled_at: new Date().toISOString()
            })
            .eq('id', item.originalTxId)
            .select();

          if (error) {
            console.error('❌ [handleSettle] Erro ao atualizar transaction:', error);
            updateErrors.push(`Transaction ${item.originalTxId}: ${error.message}`);
          } else if (!data || data.length === 0) {
            console.warn('⚠️ [handleSettle] Nenhuma linha atualizada (pode pertencer a outro usuário)');
            updateErrors.push(`Transaction ${item.originalTxId}: No rows updated (may belong to another user)`);
          } else {

            successCount++;
          }
        } else {
          console.error('❌ [handleSettle] Item sem splitId nem originalTxId:', item);
          updateErrors.push(`Item ${item.id}: Missing splitId and originalTxId`);
        }
      }



      if (updateErrors.length > 0) {
        console.error('❌ [handleSettle] Erros de atualização:', updateErrors);
        toast.error(`Alguns itens não foram atualizados: ${updateErrors.length} erros. Verifique o console para detalhes.`);

        // Mesmo com erros, se algum item foi atualizado, considerar sucesso parcial
        if (successCount > 0) {
          toast.success(`${successCount} item(ns) atualizado(s) com sucesso!`);
        }
      } else if (successCount === 0) {
        console.error('❌ [handleSettle] Nenhum item foi atualizado!');
        toast.error('Nenhum item foi atualizado. Verifique o console para detalhes.');
        setIsSettling(false);
        return;
      } else {

      }

      // Fechar dialog e limpar estado
      setShowSettleDialog(false);
      setSelectedMember(null);
      setSettleAmount("");
      setSettleAccountId("");
      setSettleDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedItems([]);

      // Invalidar queries relacionadas para sincronizar
      for (const item of itemsToSettle) {
        if (item.originalTxId) {
          await invalidateRelated(item.originalTxId);
        }
      }

      // Aguardar refetch para atualizar a UI
      await refetch();

      toast.success(`Acerto de ${formatCurrency(amount, settlementCurrency)} realizado!`);
    } catch (error) {
      console.error('Settlement error:', error);
      toast.error("Erro ao realizar acerto");
    } finally {
      setIsSettling(false);
    }
  };

  // TASK 14: Desfazer Acerto com Integridade
  // Garante que:
  // - Deleta settlement transaction corretamente
  // - Recalcula is_settled baseado em settlements restantes
  // - Invalida queries relacionadas para sincronização
  const handleUndoSettlement = async () => {
    const item = undoConfirm.item;
    if (!item) return;

    try {


      if (item.splitId) {
        // Buscar o split para pegar os IDs das transações de acerto
        const { data: split, error: fetchError } = await supabase
          .from('transaction_splits')
          .select('settled_by_debtor, settled_by_creditor, debtor_settlement_tx_id, creditor_settlement_tx_id')
          .eq('id', item.splitId)
          .single();

        if (fetchError) throw fetchError;



        // Determinar qual lado está desfazendo
        const isDebtor = item.type === 'DEBIT';
        const settlementTxId = isDebtor ? split.debtor_settlement_tx_id : split.creditor_settlement_tx_id;

        // TASK 14.1: Deletar a transação de acerto
        if (settlementTxId) {

          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', settlementTxId);

          if (deleteError) {
            console.error('❌ [handleUndoSettlement] Erro ao deletar transação:', deleteError);
            throw deleteError;
          }

        }

        // TASK 14.2: Atualizar flags do split
        const updateFields: unknown = {
          settled_at: null,
        };

        if (isDebtor) {
          updateFields.settled_by_debtor = false;
          updateFields.debtor_settlement_tx_id = null;
          // TASK 14.3: Recalcular is_settled baseado em settlements restantes
          // Se o credor também não marcou, desmarcar is_settled
          if (!split.settled_by_creditor) {
            updateFields.is_settled = false;
            updateFields.settled_transaction_id = null;
          }
        } else {
          updateFields.settled_by_creditor = false;
          updateFields.creditor_settlement_tx_id = null;
          // TASK 14.3: Recalcular is_settled baseado em settlements restantes
          // Se o devedor também não marcou, desmarcar is_settled
          if (!split.settled_by_debtor) {
            updateFields.is_settled = false;
            updateFields.settled_transaction_id = null;
          }
        }



        const { error: updateError } = await supabase
          .from('transaction_splits')
          .update(updateFields)
          .eq('id', item.splitId);

        if (updateError) throw updateError;


      
      // TASK 20: Log settlement undo
      if (user?.id && item.originalTxId && item.splitId) {
        await logSettlementUndone(
          user.id,
          item.originalTxId,
          item.splitId,
          'User requested undo',
          {
            description: item.description,
            amount: item.amount,
            currency: item.currency
          }
        );
      }
      } else if (item.type === 'DEBIT' && item.originalTxId) {
        // Fallback para caso antigo
        const { error } = await supabase
          .from('transactions')
          .update({
            is_settled: false,
            settled_at: null
          })
          .eq('id', item.originalTxId);

        if (error) throw error;
      }

      // Fechar dialog primeiro
      setUndoConfirm({ isOpen: false, item: null });

      // TASK 14.4: Invalidar queries relacionadas para sincronização
      if (item.originalTxId) {

        await invalidateRelated(item.originalTxId);
      }

      // Aguardar um pouco e então atualizar
      await refetch();

      toast.success("Acerto desfeito com sucesso!");

    } catch (error) {
      console.error('❌ [handleUndoSettlement] Erro:', error);
      toast.error("Erro ao desfazer acerto");
    }
  };

  // TASK 11: Bloqueio de Exclusão de Transações Acertadas
  // Garante que transações acertadas não podem ser excluídas
  // Mostra mensagens de erro detalhadas
  const handleDeleteTransaction = async () => {
    const item = deleteConfirm.item;
    if (!item || !item.originalTxId) return;

    try {


      // TASK 11.1: Validar settlement status antes de excluir
      if (!item.canDelete) {
        const errorMsg = item.blockReason || ERROR_MESSAGES[SettlementErrorCode.TRANSACTION_SETTLED];
        const errorMessage = typeof errorMsg === 'string' ? errorMsg : errorMsg.message;
        const errorAction = typeof errorMsg === 'string' ? undefined : errorMsg.action;

        console.warn('⚠️ [handleDeleteTransaction] TASK 11: Exclusão bloqueada:', errorMessage);
        
        // TASK 20: Log blocked operation
        if (user?.id && item.originalTxId) {
          await logOperationBlocked(
            user.id,
            item.originalTxId,
            SettlementErrorCode.TRANSACTION_SETTLED,
            errorMessage,
            {
              operation: 'delete',
              description: item.description
            }
          );
        }
        
        toast.error(errorMessage);
        if (errorAction) {
          toast.info(errorAction);
        }
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }

      // VALIDAÇÃO: Verificar se o usuário atual é o criador
      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da transação pode excluí-la");
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }

      // Excluir a transação (cascade vai excluir splits automaticamente)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', item.originalTxId);

      if (error) throw error;


      
      // TASK 20: Log transaction deletion
      if (user?.id) {
        await logTransactionDeleted(
          user.id,
          item.originalTxId,
          {
            description: item.description,
            amount: item.amount,
            currency: item.currency
          }
        );
      }

      // Fechar dialog
      setDeleteConfirm({ isOpen: false, item: null });

      // Invalidar queries relacionadas para sincronizar
      await invalidateRelated(item.originalTxId);

      // Atualizar lista
      await refetch();

      toast.success("Transação excluída com sucesso!");
    } catch (error) {
      console.error('❌ [handleDeleteTransaction] Erro:', error);
      toast.error("Erro ao excluir transação");
    }
  };

  // TASK 12: Bloqueio de Exclusão de Séries com Parcelas Acertadas
  // Garante que séries com parcelas acertadas não podem ser excluídas
  // Mostra lista de parcelas acertadas quando aplicável
  const handleDeleteSeries = async () => {
    const item = deleteSeriesConfirm.item;
    if (!item || !item.seriesId) return;

    try {


      // TASK 12.1: Validar settlement status da série antes de excluir
      if (!item.canDelete) {
        const errorMsg = item.blockReason || ERROR_MESSAGES[SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS];
        const errorMessage = typeof errorMsg === 'string' ? errorMsg : errorMsg.message;
        const errorAction = typeof errorMsg === 'string' ? undefined : errorMsg.action;

        console.warn('⚠️ [handleDeleteSeries] TASK 12: Exclusão bloqueada:', errorMessage);
        
        // TASK 20: Log blocked operation
        if (user?.id && item.seriesId) {
          await logOperationBlocked(
            user.id,
            item.originalTxId || '',
            SettlementErrorCode.SERIES_HAS_SETTLED_INSTALLMENTS,
            errorMessage,
            {
              operation: 'delete_series',
              seriesId: item.seriesId,
              description: item.description
            }
          );
        }
        
        toast.error(errorMessage);
        if (errorAction) {
          toast.info(errorAction);
        }
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      // VALIDAÇÃO: Verificar se o usuário atual é o criador
      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da série pode excluí-la");
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      // Usar função RPC que garante exclusão completa
      const { data, error } = await (supabase.rpc as unknown)('delete_installment_series', { p_series_id: item.seriesId });

      if (error) throw error;

      const deletedCount = data?.[0]?.deleted_count || 0;



      if (deletedCount === 0) {
        throw new Error("Nenhuma parcela foi excluída. Verifique se a série existe.");
      }
      
      // TASK 20: Log series deletion
      if (user?.id && item.seriesId) {
        await logSeriesDeleted(
          user.id,
          item.seriesId,
          {
            deletedCount,
            description: item.description,
            totalInstallments: item.totalInstallments
          }
        );
      }

      // Fechar dialog
      setDeleteSeriesConfirm({ isOpen: false, item: null });

      // Invalidar queries relacionadas para sincronizar
      if (item.originalTxId) {
        await invalidateRelated(item.originalTxId);
      }

      // Atualizar lista
      await refetch();

      toast.success(`${deletedCount} parcelas excluídas com sucesso!`);
    } catch (error: unknown) {
      console.error('❌ [handleDeleteSeries] Erro:', error);
      toast.error("Erro ao excluir série: " + error.message);
    }
  };

  const handleUndoAll = async () => {
    setIsUndoingAll(true);
    try {
      // Coletar todos os itens pagos de todos os membros (do mês VISUALIZADO, não apenas atual)
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
      let errorCount = 0;

      // USAR A MESMA LÓGICA DO INDIVIDUAL (handleUndoSettlement)
      // Processar cada item individualmente
      for (const item of allPaidItems) {
        try {


          if (item.splitId) {
            // Buscar o split para pegar os IDs das transações de acerto
            const { data: split, error: fetchError } = await supabase
              .from('transaction_splits')
              .select('settled_by_debtor, settled_by_creditor, debtor_settlement_tx_id, creditor_settlement_tx_id')
              .eq('id', item.splitId)
              .single();

            if (fetchError) {
              console.error('❌ [handleUndoAll] Erro ao buscar split:', fetchError);
              errorCount++;
              continue;
            }



            // Determinar qual lado está desfazendo
            const isDebtor = item.type === 'DEBIT';
            const settlementTxId = isDebtor ? split.debtor_settlement_tx_id : split.creditor_settlement_tx_id;

            // Deletar a transação de acerto
            if (settlementTxId) {

              const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', settlementTxId);

              if (deleteError) {
                console.error('❌ [handleUndoAll] Erro ao deletar transação:', deleteError);
                errorCount++;
                continue;
              }

            }

            // Atualizar o split
            const updateFields: unknown = {
              settled_at: null,
            };

            if (isDebtor) {
              updateFields.settled_by_debtor = false;
              updateFields.debtor_settlement_tx_id = null;
              // Se o credor também não marcou, desmarcar is_settled
              if (!split.settled_by_creditor) {
                updateFields.is_settled = false;
                updateFields.settled_transaction_id = null;
              }
            } else {
              updateFields.settled_by_creditor = false;
              updateFields.creditor_settlement_tx_id = null;
              // Se o devedor também não marcou, desmarcar is_settled
              if (!split.settled_by_debtor) {
                updateFields.is_settled = false;
                updateFields.settled_transaction_id = null;
              }
            }



            const { error: updateError } = await supabase
              .from('transaction_splits')
              .update(updateFields)
              .eq('id', item.splitId);

            if (updateError) {
              console.error('❌ [handleUndoAll] Erro ao atualizar split:', updateError);
              errorCount++;
              continue;
            }


            successCount++;
          } else if (item.type === 'DEBIT' && item.originalTxId) {
            // Fallback para caso antigo
            const { error } = await supabase
              .from('transactions')
              .update({
                is_settled: false,
                settled_at: null
              })
              .eq('id', item.originalTxId);

            if (error) {
              console.error('❌ [handleUndoAll] Erro ao atualizar transaction:', error);
              errorCount++;
              continue;
            }

            successCount++;
          }
        } catch (error) {
          console.error('❌ [handleUndoAll] Erro ao processar item:', error);
          errorCount++;
        }
      }



      // Fechar dialog
      setUndoAllConfirm(false);

      // Atualizar lista
      await refetch();

      if (successCount > 0) {
        toast.success(`${successCount} acerto(s) desfeito(s) com sucesso!`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} erro(s) ao desfazer acertos. Verifique o console.`);
      }
    } catch (error) {
      console.error('❌ [handleUndoAll] Erro geral:', error);
      toast.error("Erro ao desfazer acertos");
      setUndoAllConfirm(false);
    } finally {
      setIsUndoingAll(false);
    }
  };



  return {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll
  };
}
