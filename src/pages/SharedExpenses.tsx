import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Plane,
  History,
  Wallet,
  Loader2,
  MoreHorizontal,
  Undo2,
  Layers,
  CheckCircle2,
  ArrowRight,
  Globe,
  CreditCard,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
import { useSharedFinances, InvoiceItem } from "@/hooks/useSharedFinances";
import { useSettleWithPayment, useUnsettleWithReversal } from "@/hooks/useSettlement";
import { useMonth } from "@/contexts/MonthContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SharedInstallmentImport } from "@/components/shared/SharedInstallmentImport";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";

export function SharedExpenses() {
  console.log('🔵 [SharedExpenses] ========== COMPONENTE INICIANDO ==========');

  const navigate = useNavigate();
  const { user } = useAuth();
  console.log('🔵 [SharedExpenses] User:', user?.id);

  const [activeTab, setActiveTab] = useState<SharedTab>("REGULAR");
  const { currentDate } = useMonth();
  console.log('🔵 [SharedExpenses] CurrentDate:', currentDate);

  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [settleType, setSettleType] = useState<"PAY" | "RECEIVE">("PAY");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleDate, setSettleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [undoAllConfirm, setUndoAllConfirm] = useState(false);
  const [isUndoingAll, setIsUndoingAll] = useState(false);

  console.log('🔵 [SharedExpenses] Estados inicializados com sucesso');

  // Undo settlement state
  const [undoConfirm, setUndoConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });

  // Delete transaction state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });

  // Delete series state
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });

  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  console.log('🔵 [SharedExpenses] ✅ Members carregados:', { count: members?.length, membersLoading });

  const { data: accounts = [] } = useAccounts();
  console.log('🔵 [SharedExpenses] ✅ Accounts carregadas:', { count: accounts?.length });

  const { data: trips = [] } = useTrips();
  console.log('🔵 [SharedExpenses] ✅ Trips carregadas:', { count: trips?.length });

  const createTransaction = useCreateTransaction();

  console.log('🔵 [SharedExpenses] 🔄 Chamando useSharedFinances...');
  const { invoices, getFilteredInvoice, getTotals, isLoading: sharedLoading, refetch, transactions } = useSharedFinances({
    currentDate,
    activeTab,
  });
  console.log('🔵 [SharedExpenses] ✅ useSharedFinances retornou:', {
    invoicesCount: Object.keys(invoices || {}).length,
    transactionsCount: transactions?.length,
    sharedLoading
  });

  const formatCurrency = (value: number, currency: string = "BRL") => {
    if (currency === "BRL") {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    // Para outras moedas, usar símbolo + valor formatado
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const toggleMemberExpand = (memberId: string) => {
    // Não faz nada - membros sempre expandidos
  };

  const openSettleDialog = (memberId: string, type: "PAY" | "RECEIVE", amount: number) => {
    setSelectedMember(memberId);
    setSettleType(type);

    // Auto-select ALL items by default
    const items = getFilteredInvoice(memberId).filter(i => !i.isPaid);
    setSelectedItems(items.map(i => i.id));

    // Auto-fill total amount
    const total = items.reduce((sum, item) => {
      // Logic: if I'm paying (PAY), I pay for DEBIT items (my debt).
      // wait, getFilteredInvoice returns items from my perspective relative to the member.
      // If type is PAY, I owe this member. So I sum my DEBITS.
      // If type is RECEIVE, they owe me. So I sum my CREDITS (or their debits depending on view).

      // Actually, standard logic in handleSelectAll matches this 'amount' passed in.
      // The 'amount' param passed to this function is already the calculated 'iOwe' or 'owedToMe' from 'totalsByCurrency'.
      // So we can just trust 'amount' for the initial value.
      return sum; // unused
    }, 0);

    setSettleAmount(amount.toFixed(2).replace(".", ","));
    setSettleDate(format(new Date(), 'yyyy-MM-dd')); // Resetar para hoje
    setShowSettleDialog(true);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      // Determine new selection state first
      const isSelected = prev.includes(itemId);
      const newItems = isSelected
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

      // Calculate total for NEW selection immediately
      if (selectedMember) {
        const items = getFilteredInvoice(selectedMember);
        const selectedTotal = items
          .filter(i => newItems.includes(i.id))
          .reduce((sum, item) => {
            // Use same logic as getSelectedTotal
            if (item.type === "CREDIT") return sum + item.amount;
            return sum - item.amount;
          }, 0);

        // Update the input field with the new total (absolute value)
        setSettleAmount(Math.abs(selectedTotal).toFixed(2).replace(".", ","));
      }

      return newItems;
    });
  };

  const getSelectedTotal = () => {
    if (!selectedMember) return 0;
    const items = getFilteredInvoice(selectedMember);
    return items
      .filter(i => selectedItems.includes(i.id))
      .reduce((sum, item) => {
        if (item.type === "CREDIT") return sum + item.amount;
        return sum - item.amount;
      }, 0);
  };

  const handleSelectAll = () => {
    if (!selectedMember) return;
    const items = getFilteredInvoice(selectedMember).filter(i => !i.isPaid);
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
      setSettleAmount("0,00");
    } else {
      setSelectedItems(items.map(i => i.id));
      // Quando seleciona todos, atualiza o valor para o total
      const total = items.reduce((sum, item) => {
        if (item.type === "CREDIT") return sum + item.amount;
        return sum - item.amount;
      }, 0);
      setSettleAmount(Math.abs(total).toFixed(2).replace(".", ","));
    }
  };

  // Atualizar valor quando itens são selecionados
  const updateSettleAmountFromSelection = () => {
    if (!selectedMember) return;
    const items = getFilteredInvoice(selectedMember);
    const selectedTotal = items
      .filter(i => selectedItems.includes(i.id))
      .reduce((sum, item) => {
        if (item.type === "CREDIT") return sum + item.amount;
        return sum - item.amount;
      }, 0);
    setSettleAmount(Math.abs(selectedTotal).toFixed(2).replace(".", ","));
  };

  const handleSettle = async () => {
    if (!selectedMember || !settleAccountId) {
      toast.error("Selecione uma conta");
      return;
    }

    console.log('🔍 [handleSettle] Iniciando acerto:', {
      selectedMember,
      settleAccountId,
      settleType,
      settleAmount,
      selectedItems: selectedItems.length
    });

    setIsSettling(true);
    try {
      const member = members.find(m => m.id === selectedMember);
      const items = getFilteredInvoice(selectedMember);

      console.log('🔍 [handleSettle] Dados do membro:', {
        member,
        totalItems: items.length,
        items: items.map(i => ({
          id: i.id,
          type: i.type,
          splitId: i.splitId,
          originalTxId: i.originalTxId,
          isPaid: i.isPaid,
          amount: i.amount,
          description: i.description
        }))
      });

      const itemsToSettle = selectedItems.length > 0
        ? items.filter(i => selectedItems.includes(i.id))
        : items.filter(i => !i.isPaid);

      console.log('🔍 [handleSettle] Itens para acertar:', {
        totalItems: itemsToSettle.length,
        items: itemsToSettle.map(i => ({
          id: i.id,
          type: i.type,
          splitId: i.splitId,
          originalTxId: i.originalTxId,
          isPaid: i.isPaid,
          amount: i.amount,
          description: i.description
        }))
      });

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

        console.log('🔍 [handleSettle] Criando acerto:', {
          originalTxId: item.originalTxId,
          settleDateSelected: settleDate,
          competenceDate,
          description
        });

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
      let updateErrors: string[] = [];
      let successCount = 0;

      console.log('🔍 [handleSettle] Iniciando atualização de itens:', {
        totalItems: itemsToSettle.length,
        settlementTxIds,
        items: itemsToSettle.map(i => ({
          id: i.id,
          type: i.type,
          splitId: i.splitId,
          originalTxId: i.originalTxId,
          amount: i.amount,
          description: i.description
        }))
      });

      for (let i = 0; i < itemsToSettle.length; i++) {
        const item = itemsToSettle[i];
        const settlementTxId = settlementTxIds[i]; // Usar o ID correspondente

        console.log('🔍 [handleSettle] Processando item:', {
          id: item.id,
          type: item.type,
          splitId: item.splitId,
          originalTxId: item.originalTxId,
          amount: item.amount,
          description: item.description,
          settlementTxId
        });

        // CORREÇÃO CRÍTICA: Para AMBOS os tipos (CREDIT e DEBIT), 
        // devemos atualizar o SPLIT se ele existir!
        // O split representa a dívida/crédito do usuário

        if (item.splitId) {
          // Verificar se o split existe antes de atualizar
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

          // Verificar se já foi marcado como pago pelo lado correto
          const alreadySettled = settleType === 'PAY'
            ? existingSplit.settled_by_debtor
            : existingSplit.settled_by_creditor;

          if (alreadySettled) {
            console.warn('⚠️ [handleSettle] Split já está settled por este lado:', item.splitId);
            continue;
          }

          console.log('✅ [handleSettle] Split encontrado, atualizando:', existingSplit);

          // Determinar qual flag atualizar baseado no tipo de acerto
          const updateFields: any = {
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
            console.log('✅ [handleSettle] Split atualizado com sucesso:', data);
            successCount++;
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
            console.log('✅ [handleSettle] Transaction atualizada com sucesso:', data);
            successCount++;
          }
        } else {
          console.error('❌ [handleSettle] Item sem splitId nem originalTxId:', item);
          updateErrors.push(`Item ${item.id}: Missing splitId and originalTxId`);
        }
      }

      console.log('📊 [handleSettle] Resultado final:', {
        totalItems: itemsToSettle.length,
        successCount,
        errorCount: updateErrors.length,
        errors: updateErrors
      });

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
        console.log('✅ [handleSettle] Todos os itens atualizados com sucesso!');
      }

      // Fechar dialog e limpar estado
      setShowSettleDialog(false);
      setSelectedMember(null);
      setSettleAmount("");
      setSettleAccountId("");
      setSettleDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedItems([]);

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

  const handleUndoSettlement = async () => {
    const item = undoConfirm.item;
    if (!item) return;

    try {
      console.log('🔍 [handleUndoSettlement] Desfazendo acerto:', item);

      if (item.splitId) {
        // Buscar o split para pegar os IDs das transações de acerto
        const { data: split, error: fetchError } = await supabase
          .from('transaction_splits')
          .select('settled_by_debtor, settled_by_creditor, debtor_settlement_tx_id, creditor_settlement_tx_id')
          .eq('id', item.splitId)
          .single();

        if (fetchError) throw fetchError;

        console.log('🔍 [handleUndoSettlement] Split encontrado:', split);

        // Determinar qual lado está desfazendo
        const isDebtor = item.type === 'DEBIT';
        const settlementTxId = isDebtor ? split.debtor_settlement_tx_id : split.creditor_settlement_tx_id;

        // Deletar a transação de acerto
        if (settlementTxId) {
          console.log('🔍 [handleUndoSettlement] Deletando transação de acerto:', settlementTxId);
          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', settlementTxId);

          if (deleteError) {
            console.error('❌ [handleUndoSettlement] Erro ao deletar transação:', deleteError);
            throw deleteError;
          }
          console.log('✅ [handleUndoSettlement] Transação deletada com sucesso');
        }

        // Atualizar o split
        const updateFields: any = {
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

        console.log('🔍 [handleUndoSettlement] Atualizando split:', updateFields);

        const { error: updateError } = await supabase
          .from('transaction_splits')
          .update(updateFields)
          .eq('id', item.splitId);

        if (updateError) throw updateError;

        console.log('✅ [handleUndoSettlement] Split atualizado com sucesso');
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

      // Aguardar um pouco e então atualizar
      await refetch();

      toast.success("Acerto desfeito com sucesso!");
    } catch (error) {
      console.error('❌ [handleUndoSettlement] Erro:', error);
      toast.error("Erro ao desfazer acerto");
    }
  };

  // Função para excluir transação única
  const handleDeleteTransaction = async () => {
    const item = deleteConfirm.item;
    if (!item || !item.originalTxId) return;

    try {
      console.log('🗑️ [handleDeleteTransaction] Excluindo transação:', item.originalTxId);

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

      console.log('✅ [handleDeleteTransaction] Transação excluída com sucesso');

      // Fechar dialog
      setDeleteConfirm({ isOpen: false, item: null });

      // Atualizar lista
      await refetch();

      toast.success("Transação excluída com sucesso!");
    } catch (error) {
      console.error('❌ [handleDeleteTransaction] Erro:', error);
      toast.error("Erro ao excluir transação");
    }
  };

  // Função para excluir série de parcelas
  const handleDeleteSeries = async () => {
    const item = deleteSeriesConfirm.item;
    if (!item || !item.seriesId) return;

    try {
      console.log('🗑️ [handleDeleteSeries] Excluindo série:', item.seriesId);

      // VALIDAÇÃO: Verificar se o usuário atual é o criador
      if (item.creatorUserId && item.creatorUserId !== user?.id) {
        toast.error("Apenas o criador da série pode excluí-la");
        setDeleteSeriesConfirm({ isOpen: false, item: null });
        return;
      }

      // Usar função RPC que garante exclusão completa
      const { data, error } = await supabase
        .rpc('delete_installment_series', { p_series_id: item.seriesId });

      if (error) throw error;

      const deletedCount = data?.[0]?.deleted_count || 0;

      console.log('✅ [handleDeleteSeries] Série excluída:', {
        seriesId: item.seriesId,
        deletedCount
      });

      if (deletedCount === 0) {
        throw new Error("Nenhuma parcela foi excluída. Verifique se a série existe.");
      }

      // Fechar dialog
      setDeleteSeriesConfirm({ isOpen: false, item: null });

      // Atualizar lista
      await refetch();

      toast.success(`${deletedCount} parcelas excluídas com sucesso!`);
    } catch (error: any) {
      console.error('❌ [handleDeleteSeries] Erro:', error);
      toast.error("Erro ao excluir série: " + error.message);
    }
  };

  const handleUndoAll = async () => {
    setIsUndoingAll(true);
    try {
      // Coletar todos os itens pagos de todos os membros (do mês atual)
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

      console.log('🔄 [handleUndoAll] Revertendo', allPaidItems.length, 'itens');

      let successCount = 0;
      let errorCount = 0;

      // USAR A MESMA LÓGICA DO INDIVIDUAL (handleUndoSettlement)
      // Processar cada item individualmente
      for (const item of allPaidItems) {
        try {
          console.log('🔍 [handleUndoAll] Desfazendo item:', item.id, item.splitId);

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

            console.log('🔍 [handleUndoAll] Split encontrado:', split);

            // Determinar qual lado está desfazendo
            const isDebtor = item.type === 'DEBIT';
            const settlementTxId = isDebtor ? split.debtor_settlement_tx_id : split.creditor_settlement_tx_id;

            // Deletar a transação de acerto
            if (settlementTxId) {
              console.log('🔍 [handleUndoAll] Deletando transação de acerto:', settlementTxId);
              const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', settlementTxId);

              if (deleteError) {
                console.error('❌ [handleUndoAll] Erro ao deletar transação:', deleteError);
                errorCount++;
                continue;
              }
              console.log('✅ [handleUndoAll] Transação deletada com sucesso');
            }

            // Atualizar o split
            const updateFields: any = {
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

            console.log('🔍 [handleUndoAll] Atualizando split:', updateFields);

            const { error: updateError } = await supabase
              .from('transaction_splits')
              .update(updateFields)
              .eq('id', item.splitId);

            if (updateError) {
              console.error('❌ [handleUndoAll] Erro ao atualizar split:', updateError);
              errorCount++;
              continue;
            }

            console.log('✅ [handleUndoAll] Split atualizado com sucesso');
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

      console.log('📊 [handleUndoAll] Resultado:', { successCount, errorCount, total: allPaidItems.length });

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

  // Group items by trip
  const getGroupedItems = (memberId: string) => {
    const items = getFilteredInvoice(memberId);
    const groups: Record<string, { tripName?: string; items: InvoiceItem[] }> = {};

    items.forEach(item => {
      const tripKey = item.tripId || 'no-trip';
      if (!groups[tripKey]) {
        const trip = trips.find(t => t.id === item.tripId);
        groups[tripKey] = {
          tripName: trip?.name,
          items: []
        };
      }
      groups[tripKey].items.push(item);
    });

    return groups;
  };

  // Calculate totals POR MOEDA E POR TIPO (REGULAR vs TRAVEL)
  // NUNCA somar moedas diferentes!
  // NUNCA somar REGULAR com TRAVEL!
  // INCLUIR valores já acertados (isPaid) nos cards de resumo
  const totalsByCurrency: Record<string, { owedToMe: number; iOwe: number; balance: number; settled: number }> = {};
  const travelTotalsByCurrency: Record<string, { owedToMe: number; iOwe: number; balance: number; settled: number }> = {};

  members.forEach(member => {
    const items = getFilteredInvoice(member.id);

    // Separar itens REGULAR (sem tripId) de TRAVEL (com tripId)
    const regularItems = items.filter(i => !i.tripId);
    const travelItems = items.filter(i => i.tripId);

    // Calcular totais REGULAR (incluindo acertados)
    regularItems.forEach(item => {
      const curr = item.currency || 'BRL';
      if (!totalsByCurrency[curr]) {
        totalsByCurrency[curr] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
      }

      if (item.isPaid) {
        // Valores já acertados
        totalsByCurrency[curr].settled += item.amount;
      } else {
        // Valores pendentes
        if (item.type === 'CREDIT') {
          totalsByCurrency[curr].owedToMe += item.amount;
        } else {
          totalsByCurrency[curr].iOwe += item.amount;
        }
      }
    });

    // Calcular totais TRAVEL (incluindo acertados)
    travelItems.forEach(item => {
      const curr = item.currency || 'BRL';
      if (!travelTotalsByCurrency[curr]) {
        travelTotalsByCurrency[curr] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
      }

      if (item.isPaid) {
        // Valores já acertados
        travelTotalsByCurrency[curr].settled += item.amount;
      } else {
        // Valores pendentes
        if (item.type === 'CREDIT') {
          travelTotalsByCurrency[curr].owedToMe += item.amount;
        } else {
          travelTotalsByCurrency[curr].iOwe += item.amount;
        }
      }
    });
  });

  // Calcular balance para cada moeda
  Object.keys(totalsByCurrency).forEach(curr => {
    totalsByCurrency[curr].balance = totalsByCurrency[curr].owedToMe - totalsByCurrency[curr].iOwe;
  });

  Object.keys(travelTotalsByCurrency).forEach(curr => {
    travelTotalsByCurrency[curr].balance = travelTotalsByCurrency[curr].owedToMe - travelTotalsByCurrency[curr].iOwe;
  });

  // Para compatibilidade com código existente, manter as variáveis antigas apenas para BRL REGULAR
  const totalOwedToMe = totalsByCurrency["BRL"]?.owedToMe || 0;
  const totalIOwe = totalsByCurrency["BRL"]?.iOwe || 0;
  const myBalance = totalsByCurrency["BRL"]?.balance || 0;

  if (membersLoading || sharedLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const pendingMemberItems = selectedMember
    ? getFilteredInvoice(selectedMember).filter(i => !i.isPaid)
    : [];

  // Função para renderizar card de membro estilo fatura
  const renderMemberInvoiceCard = (member: any) => {
    const items = getFilteredInvoice(member.id);
    const totals = getTotals(items);

    // CORREÇÃO: Na aba TRAVEL não renderizar cards de membros (será por viagem)
    // Nas abas REGULAR e HISTORY usar BRL
    if (activeTab === 'TRAVEL') {
      return undefined; // Não renderizar na aba TRAVEL - será filtrado
    }

    const primaryCurrency = 'BRL';

    const net = totals[primaryCurrency]?.net || 0;
    const isExpanded = true; // Sempre expandido
    const groupedItems = getGroupedItems(member.id);
    const pendingCount = items.filter(i => !i.isPaid).length;
    const paidCount = items.filter(i => i.isPaid).length;

    // CORREÇÃO CRÍTICA: Calcular totalPaidAmount POR MOEDA (nunca somar moedas diferentes!)
    const paidItemsByCurrency: Record<string, number> = {};
    items.filter(i => i.isPaid).forEach(i => {
      const curr = i.currency || 'BRL';
      paidItemsByCurrency[curr] = (paidItemsByCurrency[curr] || 0) + i.amount;
    });

    // Para HISTORY, usar apenas BRL
    const totalPaidAmount = paidItemsByCurrency[primaryCurrency] || 0;

    // Não mostrar membros sem itens
    if (items.length === 0) {
      return undefined; // Será filtrado pelo .filter(Boolean)
    }

    // Determinar se eu devo (PAGAR - vermelho) ou me devem (RECEBER - verde)
    const iOwe = net < 0; // net negativo = eu devo
    const theyOweMe = net > 0; // net positivo = me devem
    const isHistory = activeTab === "HISTORY";

    return (
      <div
        key={member.id}
        className={cn(
          "rounded-xl border-2 overflow-hidden transition-all",
          isHistory ? "border-gray-200 dark:border-gray-800" :
            iOwe ? "border-red-200 dark:border-red-900/50" :
              theyOweMe ? "border-green-200 dark:border-green-900/50" :
                "border-border"
        )}
      >
        {/* Header estilo fatura */}
        <div
          className={cn(
            "p-4",
            isHistory ? "bg-gray-50 dark:bg-gray-950/20" :
              iOwe ? "bg-red-50 dark:bg-red-950/20" :
                theyOweMe ? "bg-green-50 dark:bg-green-950/20" :
                  "bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white",
                isHistory ? "bg-gray-500" :
                  iOwe ? "bg-red-500" : theyOweMe ? "bg-green-500" : "bg-gray-400"
              )}>
                {getInitials(member.name)}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-lg">{member.name}</p>
                  {/* Badge de status */}
                  {isHistory ? (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium border-gray-300 text-gray-700 bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-900/50"
                    >
                      HISTÓRICO
                    </Badge>
                  ) : net !== 0 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        iOwe ? "border-red-300 text-red-700 bg-red-100 dark:border-red-800 dark:text-red-300 dark:bg-red-950/50" :
                          "border-green-300 text-green-700 bg-green-100 dark:border-green-800 dark:text-green-300 dark:bg-green-950/50"
                      )}
                    >
                      {iOwe ? "PAGAR" : "RECEBER"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isHistory
                    ? `${paidCount} ${paidCount === 1 ? "item acertado" : "itens acertados"}`
                    : `${pendingCount} ${pendingCount === 1 ? "item pendente" : "itens pendentes"}`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Valor total - Removido do histórico, agora aparece nos cards de resumo */}
              {!isHistory && (
                <div className="text-right">
                  <p className={cn(
                    "font-mono font-bold text-xl",
                    net === 0 ? "text-muted-foreground" :
                      iOwe ? "text-red-600 dark:text-red-400" :
                        "text-green-600 dark:text-green-400"
                  )}>
                    {net === 0 ? "Em dia" : formatCurrency(Math.abs(net), primaryCurrency)}
                  </p>
                  {net !== 0 && (
                    <p className={cn(
                      "text-xs font-medium",
                      iOwe ? "text-red-500" : "text-green-500"
                    )}>
                      {iOwe ? "Você deve" : "Devem a você"}
                    </p>
                  )}
                </div>
              )}

              {/* Botão de acertar - só mostra se não for histórico */}
              {!isHistory && net !== 0 && (
                <Button
                  variant={iOwe ? "destructive" : "default"}
                  size="sm"
                  className={cn(
                    "h-11 md:h-9",
                    !iOwe && "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    openSettleDialog(
                      member.id,
                      iOwe ? "PAY" : "RECEIVE",
                      Math.abs(net)
                    );
                  }}
                >
                  <Wallet className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{iOwe ? "Pagar" : "Receber"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de itens expandida - estilo extrato de fatura */}
        {isExpanded && items.length > 0 && (
          <div className="border-t border-border">
            {/* Cabeçalho da lista */}
            <div className="px-4 py-2 bg-muted/50 border-b border-border grid grid-cols-12 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">Status</div>
              <div className="col-span-5">Descrição</div>
              <div className="col-span-2">Data</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Tipo</div>
            </div>

            {Object.entries(groupedItems).map(([tripKey, group]) => (
              <div key={tripKey}>
                {/* Trip Header (if applicable) */}
                {group.tripName && (
                  <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {group.tripName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="divide-y divide-border">
                  {group.items.map(item => {
                    console.log('🔵 [SharedExpenses] 🔄 Renderizando item:', {
                      id: item.id,
                      description: item.description,
                      type: item.type,
                      isPaid: item.isPaid,
                      creatorUserId: item.creatorUserId,
                      currentUserId: user?.id
                    });

                    try {
                      const isCredit = item.type === "CREDIT";
                      const hasActions = item.isPaid || item.creatorUserId === user?.id;
                      console.log('🔵 [SharedExpenses] Item hasActions:', hasActions);

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "px-4 py-3 grid grid-cols-12 items-center hover:bg-muted/20 transition-colors",
                            item.isPaid && "opacity-60"
                          )}
                        >
                          {/* Status */}
                          <div className="col-span-1">
                            {item.isPaid ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className={cn(
                                "w-3 h-3 rounded-full",
                                isCredit ? "bg-green-500" : "bg-red-500"
                              )} />
                            )}
                          </div>

                          {/* Descrição e Categoria */}
                          <div className="col-span-5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn(
                                "text-sm font-medium",
                                item.isPaid && "line-through text-muted-foreground"
                              )}>
                                {item.description}
                              </p>
                              {item.creatorName && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                  💳 {item.creatorName}
                                </span>
                              )}
                            </div>
                            {item.category && (
                              <p className="text-xs text-muted-foreground">
                                📁 {item.category}
                              </p>
                            )}
                            {item.totalInstallments && item.totalInstallments > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Parcela {item.installmentNumber}/{item.totalInstallments}
                              </p>
                            )}
                          </div>

                          {/* Data */}
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>

                          {/* Valor */}
                          <div className="col-span-2 text-right">
                            <span className={cn(
                              "font-mono text-sm font-medium",
                              item.isPaid ? "text-muted-foreground" :
                                isCredit ? "text-green-600 dark:text-green-400" :
                                  "text-red-600 dark:text-red-400"
                            )}>
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                          </div>

                          {/* Tipo + Ações */}
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            {/* Tag PAGO - mais visível */}
                            {item.isPaid && (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50"
                              >
                                PAGO
                              </Badge>
                            )}

                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-bold",
                                item.isPaid ? "border-gray-300 text-gray-500" :
                                  isCredit ? "border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30" :
                                    "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                              )}
                            >
                              {isCredit ? "CRÉDITO" : "DÉBITO"}
                            </Badge>

                            {/* Menu de ações - só mostrar se houver ações disponíveis */}
                            {(item.isPaid || item.creatorUserId === user?.id) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-11 w-11 md:h-8 md:w-8">
                                    <MoreHorizontal className="h-5 w-5 md:h-4 md:w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {item.isPaid && (
                                    <DropdownMenuItem
                                      onClick={() => setUndoConfirm({ isOpen: true, item })}
                                    >
                                      <Undo2 className="h-4 w-4 mr-2" />
                                      Desfazer acerto
                                    </DropdownMenuItem>
                                  )}
                                  {/* Apenas o criador pode excluir */}
                                  {item.creatorUserId === user?.id && (
                                    <>
                                      {item.totalInstallments && item.totalInstallments > 1 ? (
                                        <DropdownMenuItem
                                          onClick={() => setDeleteSeriesConfirm({ isOpen: true, item })}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir série ({item.totalInstallments}x)
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => setDeleteConfirm({ isOpen: true, item })}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir transação
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error('❌ [SharedExpenses] ERRO ao renderizar item REGULAR:', error);
                      console.error('❌ Item data:', item);
                      console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
                      return (
                        <div key={item.id} className="px-4 py-3 bg-red-50 dark:bg-red-950/20">
                          <p className="text-sm text-red-600">Erro ao renderizar item: {item.description}</p>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}

            {/* Resumo no rodapé */}
            {!isHistory && items.filter(i => !i.isPaid).length > 0 && (
              <div className={cn(
                "px-4 py-3 border-t-2",
                iOwe ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" :
                  theyOweMe ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" :
                    "bg-muted/50 border-border"
              )}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Pendente</span>
                  <span className={cn(
                    "font-mono font-bold text-lg",
                    iOwe ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                  )}>
                    {formatCurrency(Math.abs(net), primaryCurrency)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Função para renderizar card de viagem (usado na aba TRAVEL)
  const renderTripCard = (trip: any) => {
    // Buscar todos os itens desta viagem de todos os membros
    const tripItems: InvoiceItem[] = [];
    members.forEach(member => {
      const memberItems = getFilteredInvoice(member.id).filter(i => i.tripId === trip.id);
      tripItems.push(...memberItems);
    });

    if (tripItems.length === 0) return undefined; // Será filtrado pelo .filter(Boolean)

    // Calcular totais por moeda
    const totals = getTotals(tripItems);
    const tripCurrency = trip.currency || 'BRL';
    const net = totals[tripCurrency]?.net || 0;

    // Agrupar itens por membro
    const itemsByMember: Record<string, InvoiceItem[]> = {};
    tripItems.forEach(item => {
      if (!itemsByMember[item.memberId]) {
        itemsByMember[item.memberId] = [];
      }
      itemsByMember[item.memberId].push(item);
    });

    const pendingCount = tripItems.filter(i => !i.isPaid).length;
    const paidCount = tripItems.filter(i => i.isPaid).length;

    return (
      <div
        key={trip.id}
        className="rounded-xl border-2 border-blue-200 dark:border-blue-900/50 overflow-hidden transition-all"
      >
        {/* Header da viagem */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Ícone da viagem */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white bg-blue-500">
                <Plane className="h-6 w-6" />
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-lg">{trip.name}</p>
                  <Badge
                    variant="outline"
                    className="text-xs font-medium border-blue-300 text-blue-700 bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/50"
                  >
                    {tripCurrency}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} {pendingCount === 1 ? "item pendente" : "itens pendentes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Valor total */}
              <div className="text-right">
                <p className={cn(
                  "font-mono font-bold text-xl",
                  net === 0 ? "text-muted-foreground" :
                    net < 0 ? "text-red-600 dark:text-red-400" :
                      "text-green-600 dark:text-green-400"
                )}>
                  {net === 0 ? "Em dia" : formatCurrency(Math.abs(net), tripCurrency)}
                </p>
                {net !== 0 && (
                  <p className={cn(
                    "text-xs font-medium",
                    net < 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {net < 0 ? "Você deve" : "Devem a você"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de itens por membro */}
        <div className="border-t border-border">
          {Object.entries(itemsByMember).map(([memberId, memberItems]) => {
            const member = members.find(m => m.id === memberId);
            if (!member) return undefined; // Será filtrado

            const memberTotals = getTotals(memberItems);
            const memberNet = memberTotals[tripCurrency]?.net || 0;

            return (
              <div key={memberId} className="border-b border-border last:border-0">
                {/* Header do membro */}
                <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white bg-gray-500 text-sm">
                      {getInitials(member.name)}
                    </div>
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <span className={cn(
                    "font-mono font-semibold",
                    memberNet === 0 ? "text-muted-foreground" :
                      memberNet < 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(Math.abs(memberNet), tripCurrency)}
                  </span>
                </div>

                {/* Itens do membro */}
                <div className="divide-y divide-border">
                  {memberItems.map(item => {
                    console.log('🔵 [SharedExpenses] 🔄 Renderizando item TRAVEL:', {
                      id: item.id,
                      description: item.description,
                      type: item.type,
                      isPaid: item.isPaid,
                      creatorUserId: item.creatorUserId,
                      currentUserId: user?.id,
                      tripId: item.tripId
                    });

                    try {
                      const isCredit = item.type === 'CREDIT';
                      const hasActions = item.isPaid || item.creatorUserId === user?.id;
                      console.log('🔵 [SharedExpenses] Item TRAVEL hasActions:', hasActions);

                      return (
                        <div
                          key={item.id}
                          className="px-4 py-3 hover:bg-muted/30 transition-colors grid grid-cols-12 gap-2 items-center text-sm"
                        >
                          {/* Status */}
                          <div className="col-span-1">
                            {item.isPaid ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className={cn(
                                "h-5 w-5 rounded-full border-2",
                                isCredit ? "border-green-500" : "border-red-500"
                              )} />
                            )}
                          </div>

                          {/* Descrição */}
                          <div className="col-span-5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn(
                                "font-medium",
                                item.isPaid && "text-muted-foreground line-through"
                              )}>
                                {item.description}
                              </p>
                              {item.creatorName && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                  💳 {item.creatorName}
                                </span>
                              )}
                            </div>
                            {item.category && (
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            )}
                          </div>

                          {/* Data */}
                          <div className="col-span-2 text-muted-foreground">
                            {format(new Date(item.date), "dd/MM/yyyy")}
                          </div>

                          {/* Valor */}
                          <div className="col-span-2 text-right">
                            <span className={cn(
                              "font-mono text-sm font-medium",
                              item.isPaid ? "text-muted-foreground" :
                                isCredit ? "text-green-600 dark:text-green-400" :
                                  "text-red-600 dark:text-red-400"
                            )}>
                              {formatCurrency(item.amount, tripCurrency)}
                            </span>
                          </div>

                          {/* Tipo */}
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            {item.isPaid && (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50"
                              >
                                PAGO
                              </Badge>
                            )}

                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-bold",
                                item.isPaid ? "border-gray-300 text-gray-500" :
                                  isCredit ? "border-green-300 text-green-700 bg-green-50" :
                                    "border-red-300 text-red-700 bg-red-50"
                              )}
                            >
                              {isCredit ? "CRÉDITO" : "DÉBITO"}
                            </Badge>

                            {/* Menu de ações - só mostrar se houver ações disponíveis */}
                            {(item.isPaid || item.creatorUserId === user?.id) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-11 w-11 md:h-8 md:w-8">
                                    <MoreHorizontal className="h-5 w-5 md:h-4 md:w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {item.isPaid && (
                                    <DropdownMenuItem
                                      onClick={() => setUndoConfirm({ isOpen: true, item })}
                                    >
                                      <Undo2 className="h-4 w-4 mr-2" />
                                      Desfazer acerto
                                    </DropdownMenuItem>
                                  )}
                                  {/* Apenas o criador pode excluir */}
                                  {item.creatorUserId === user?.id && (
                                    <>
                                      {item.totalInstallments && item.totalInstallments > 1 ? (
                                        <DropdownMenuItem
                                          onClick={() => setDeleteSeriesConfirm({ isOpen: true, item })}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir série ({item.totalInstallments}x)
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => setDeleteConfirm({ isOpen: true, item })}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir transação
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error('❌ [SharedExpenses] ERRO ao renderizar item TRAVEL:', error);
                      console.error('❌ Item data:', item);
                      console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
                      return (
                        <div key={item.id} className="px-4 py-3 bg-red-50 dark:bg-red-950/20">
                          <p className="text-sm text-red-600">Erro ao renderizar item: {item.description}</p>
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Botão de acertar para este membro nesta viagem */}
                {memberNet !== 0 && memberItems.filter(i => !i.isPaid).length > 0 && (
                  <div className="px-4 py-3 bg-muted/20 flex justify-end">
                    <Button
                      variant={memberNet < 0 ? "destructive" : "default"}
                      size="sm"
                      className={cn(
                        "h-11 md:h-9",
                        memberNet > 0 && "bg-green-600 hover:bg-green-700"
                      )}
                      onClick={() => {
                        setSelectedMember(memberId);
                        openSettleDialog(
                          memberId,
                          memberNet < 0 ? "PAY" : "RECEIVE",
                          Math.abs(memberNet)
                        );
                      }}
                    >
                      <Wallet className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">{memberNet < 0 ? "Pagar" : "Receber"}</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  console.log('🔵 [SharedExpenses] Antes do return principal');
  console.log('🔵 [SharedExpenses] ========== PREPARANDO RENDER ==========');
  console.log('🔵 [SharedExpenses] membersLoading:', membersLoading, 'sharedLoading:', sharedLoading);
  console.log('🔵 [SharedExpenses] members:', members?.length, 'accounts:', accounts?.length, 'trips:', trips?.length);
  console.log('🔵 [SharedExpenses] invoices keys:', Object.keys(invoices || {}));
  console.log('🔵 [SharedExpenses] transactions:', transactions?.length);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Compartilhados</h1>
          <p className="text-muted-foreground mt-1">Despesas divididas com família</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="h-11 md:h-9">
            <Layers className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Importar Parcelas</span>
            <span className="md:hidden">Importar</span>
          </Button>
        </div>
      </div>

      {/* Balance Evolution Chart */}
      {(() => {
        console.log('🔵 [SharedExpenses] 📊 Renderizando SharedBalanceChart...');
        try {
          const chart = (
            <SharedBalanceChart
              transactions={transactions}
              invoices={invoices}
              currentDate={currentDate}
            />
          );
          console.log('🔵 [SharedExpenses] ✅ SharedBalanceChart renderizado com sucesso');
          return chart;
        } catch (error) {
          console.error('❌ [SharedExpenses] ERRO no SharedBalanceChart:', error);
          console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
          return (
            <Alert variant="destructive">
              <AlertDescription>
                Erro ao carregar gráfico: {error instanceof Error ? error.message : 'Erro desconhecido'}
              </AlertDescription>
            </Alert>
          );
        }
      })()}

      {/* Summary Cards - Separado por moeda E por tipo (REGULAR vs TRAVEL) */}
      {(() => {
        console.log('🔵 [SharedExpenses] 📊 Renderizando Summary Cards...');
        try {
          return (
            <div className="space-y-4">
              {/* Cards REGULAR */}
              {Object.keys(totalsByCurrency).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Regular</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Meu Saldo - REGULAR */}
                    <div className="p-6 rounded-xl border-2 bg-muted/30 border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(totalsByCurrency).map(([currency, data]) => (
                          <div key={currency}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                              <p className={cn(
                                "font-mono text-lg font-bold",
                                data.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {data.balance >= 0 ? "+" : ""}{formatCurrency(data.balance, currency)}
                              </p>
                            </div>
                            {data.settled > 0 && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-muted-foreground">Acertado</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {formatCurrency(data.settled, currency)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* A Receber - REGULAR */}
                    <div className="p-6 rounded-xl border-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRight className="h-5 w-5 text-green-600 rotate-180" />
                        <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(totalsByCurrency)
                          .filter(([_, data]) => data.owedToMe > 0)
                          .map(([currency, data]) => (
                            <div key={currency} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                              <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(data.owedToMe, currency)}
                              </p>
                            </div>
                          ))}
                        {Object.values(totalsByCurrency).every(d => d.owedToMe === 0) && (
                          <p className="text-muted-foreground text-center text-sm">R$ 0,00</p>
                        )}
                      </div>
                    </div>

                    {/* A Pagar - REGULAR */}
                    <div className="p-6 rounded-xl border-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRight className="h-5 w-5 text-red-600" />
                        <p className="text-sm font-medium text-muted-foreground">A Pagar</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(totalsByCurrency)
                          .filter(([_, data]) => data.iOwe > 0)
                          .map(([currency, data]) => (
                            <div key={currency} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                              <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(data.iOwe, currency)}
                              </p>
                            </div>
                          ))}
                        {Object.values(totalsByCurrency).every(d => d.iOwe === 0) && (
                          <p className="text-muted-foreground text-center text-sm">R$ 0,00</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cards TRAVEL */}
              {Object.keys(travelTotalsByCurrency).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Viagens
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Meu Saldo - TRAVEL */}
                    <div className="p-6 rounded-xl border-2 bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(travelTotalsByCurrency).map(([currency, data]) => (
                          <div key={currency}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                              <p className={cn(
                                "font-mono text-lg font-bold",
                                data.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {data.balance >= 0 ? "+" : ""}{formatCurrency(data.balance, currency)}
                              </p>
                            </div>
                            {data.settled > 0 && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-muted-foreground">Acertado</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {formatCurrency(data.settled, currency)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* A Receber - TRAVEL */}
                    <div className="p-6 rounded-xl border-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRight className="h-5 w-5 text-green-600 rotate-180" />
                        <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(travelTotalsByCurrency)
                          .filter(([_, data]) => data.owedToMe > 0)
                          .map(([currency, data]) => (
                            <div key={currency} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                              <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(data.owedToMe, currency)}
                              </p>
                            </div>
                          ))}
                        {Object.values(travelTotalsByCurrency).every(d => d.owedToMe === 0) && (
                          <p className="text-muted-foreground text-center text-sm">$ 0.00</p>
                        )}
                      </div>
                    </div>

                    {/* A Pagar - TRAVEL */}
                    <div className="p-6 rounded-xl border-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRight className="h-5 w-5 text-red-600" />
                        <p className="text-sm font-medium text-muted-foreground">A Pagar</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(travelTotalsByCurrency)
                          .filter(([_, data]) => data.iOwe > 0)
                          .map(([currency, data]) => (
                            <div key={currency} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                              <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(data.iOwe, currency)}
                              </p>
                            </div>
                          ))}
                        {Object.values(travelTotalsByCurrency).every(d => d.iOwe === 0) && (
                          <p className="text-muted-foreground text-center text-sm">$ 0.00</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        } catch (error) {
          console.error('❌ [SharedExpenses] ERRO nos Summary Cards:', error);
          console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
          return null;
        }
      })()}

      {/* Tabs */}
      {(() => {
        console.log('🔵 [SharedExpenses] 📑 Renderizando Tabs...');
        try {
          return (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SharedTab)}>
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                <TabsList className="inline-flex w-auto min-w-full md:w-full">
                  <TabsTrigger value="REGULAR" className="flex-1 min-w-[100px] gap-2">
                    <Users className="h-4 w-4" />
                    Regular
                  </TabsTrigger>
                  <TabsTrigger value="TRAVEL" className="flex-1 min-w-[100px] gap-2">
                    <Plane className="h-4 w-4" />
                    Viagens
                  </TabsTrigger>
                  <TabsTrigger value="HISTORY" className="flex-1 min-w-[100px] gap-2">
                    <History className="h-4 w-4" />
                    Histórico
                  </TabsTrigger>
                </TabsList>
              </div>

              {(() => {
                console.log('🔵 [SharedExpenses] 🚨 ANTES DE RENDERIZAR TabsContent');
                console.log('🔵 [SharedExpenses] activeTab:', activeTab);
                console.log('🔵 [SharedExpenses] members.length:', members.length);
                console.log('🔵 [SharedExpenses] members:', members);

                const tabsContentProps = {
                  value: activeTab,
                  className: "mt-6"
                };
                console.log('🔵 [SharedExpenses] TabsContent props:', tabsContentProps);

                return (
                  <TabsContent {...tabsContentProps}>
                    {(() => {
                      console.log('🔵 [SharedExpenses] 🚨 DENTRO DO TabsContent - renderizando children');
                      if (members.length === 0) {
                        console.log('🔵 [SharedExpenses] Renderizando: Nenhum membro');
                        return (
                          <div className="py-16 text-center border border-dashed border-border rounded-xl">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-display font-semibold text-lg mb-2">Nenhum membro</h3>
                            <p className="text-muted-foreground mb-6">Adicione membros na página Família</p>
                            <Button variant="outline" onClick={() => navigate("/familia")} className="h-11 md:h-9">
                              <span className="hidden sm:inline">Gerenciar Família</span>
                              <span className="sm:hidden">Família</span>
                            </Button>
                          </div>
                        );
                      }

                      console.log('🔵 [SharedExpenses] Renderizando: Com membros');
                      return (
                        <div className="space-y-4">
                          {/* Legenda */}
                          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span>Pagar (você deve)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span>Receber (devem a você)</span>
                            </div>
                          </div>

                          {/* Actions Bar for History */}
                          {activeTab === 'HISTORY' && members.some(m => getFilteredInvoice(m.id).some(i => i.isPaid)) && (
                            <div className="flex justify-end mb-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setUndoAllConfirm(true)}
                                className="gap-2"
                              >
                                <Undo2 className="h-4 w-4" />
                                Desfazer Todos os Acertos
                              </Button>
                            </div>
                          )}

                          {/* Lista de membros estilo fatura (REGULAR e HISTORY) */}
                          {(() => {
                            console.log('🔵 [SharedExpenses] 🔄 Renderizando lista de membros...', { activeTab, membersCount: members.length });
                            if (activeTab !== 'TRAVEL' && members.length > 0) {
                              const memberCards = members.map(member => {
                                console.log('🔵 [SharedExpenses] 🔄 Processando membro:', member.name);
                                try {
                                  return renderMemberInvoiceCard(member);
                                } catch (error) {
                                  console.error('❌ [SharedExpenses] ERRO ao renderizar card do membro:', member.name, error);
                                  return undefined;
                                }
                              }).filter(Boolean);
                              console.log('🔵 [SharedExpenses] ✅ Cards filtrados:', memberCards.length);
                              return <>{memberCards}</>;
                            }
                            console.log('🔵 [SharedExpenses] ⏭️ Pulando lista de membros');
                            return <></>;
                          })()}

                          {/* Lista de viagens (TRAVEL) */}
                          {(() => {
                            console.log('🔵 [SharedExpenses] 🔄 Renderizando lista de viagens...', { activeTab });
                            if (activeTab === 'TRAVEL') {
                              const filteredTrips = trips.filter(trip => {
                                // Verificar se há itens desta viagem no mês atual
                                return members.some(member => {
                                  const memberItems = getFilteredInvoice(member.id).filter(i => i.tripId === trip.id);
                                  return memberItems.length > 0;
                                });
                              });
                              console.log('🔵 [SharedExpenses] ✅ Viagens filtradas:', filteredTrips.length);
                              if (filteredTrips.length > 0) {
                                const tripCards = filteredTrips.map(trip => {
                                  console.log('🔵 [SharedExpenses] 🔄 Renderizando trip:', trip.name);
                                  try {
                                    return renderTripCard(trip);
                                  } catch (error) {
                                    console.error('❌ [SharedExpenses] ERRO ao renderizar card de viagem:', trip.name, error);
                                    return undefined;
                                  }
                                }).filter(Boolean);
                                return <>{tripCards}</>;
                              }
                            }
                            console.log('🔵 [SharedExpenses] ⏭️ Pulando lista de viagens');
                            return <></>;
                          })()}

                          {/* Mensagem se não houver itens */}
                          {activeTab === 'TRAVEL' ? (
                            <>
                              {trips.filter(trip => members.some(member => getFilteredInvoice(member.id).filter(i => i.tripId === trip.id).length > 0)).length === 0 && (
                                <div className="py-12 text-center border border-dashed border-border rounded-xl">
                                  <Plane className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                                  <h3 className="font-display font-semibold text-lg mb-2">Nenhuma viagem</h3>
                                  <p className="text-muted-foreground">
                                    Não há despesas de viagens neste período
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {members.every(m => getFilteredInvoice(m.id).length === 0) && (
                                <div className="py-12 text-center border border-dashed border-border rounded-xl">
                                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                  <h3 className="font-display font-semibold text-lg mb-2">
                                    {activeTab === "HISTORY" ? "Nenhum histórico" : "Tudo em dia!"}
                                  </h3>
                                  <p className="text-muted-foreground">
                                    {activeTab === "HISTORY"
                                      ? "Nenhum acerto foi realizado ainda"
                                      : "Não há despesas pendentes neste período"}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>
                );
              })()}
            </Tabs>
          );
        } catch (error) {
          console.error('❌ [SharedExpenses] ERRO nas Tabs:', error);
          console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
          return (
            <Alert variant="destructive">
              <AlertDescription>
                Erro ao carregar abas: {error instanceof Error ? error.message : 'Erro desconhecido'}
              </AlertDescription>
            </Alert>
          );
        }
      })()}

      {/* Settle Dialog - Estilo Fatura */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {settleType === "PAY" ? "Pagar Conta" : "Receber Pagamento"}
            </DialogTitle>
            <DialogDescription>
              {settleType === "PAY"
                ? "Registre o pagamento da sua dívida"
                : "Registre o recebimento do valor devido"}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (() => {
            const member = members.find(m => m.id === selectedMember);
            const itemsToConsider = selectedItems.length > 0
              ? pendingMemberItems.filter(i => selectedItems.includes(i.id))
              : pendingMemberItems;

            const tripIds = [...new Set(itemsToConsider.filter(i => i.tripId).map(i => i.tripId))];
            const internationalTrip = tripIds.length > 0
              ? trips.find(t => tripIds.includes(t.id) && t.currency !== "BRL")
              : null;

            const settlementCurrency = internationalTrip?.currency || "BRL";
            const isInternationalSettlement = settlementCurrency !== "BRL";

            const filteredSettleAccounts = (accounts || []).filter(a => {
              if (a.type === "CREDIT_CARD") return false;
              if (isInternationalSettlement) {
                return a.is_international && a.currency === settlementCurrency;
              }
              return !a.is_international;
            });

            return (
              <div className="py-4 space-y-6">
                {/* Alerta internacional */}
                {isInternationalSettlement && (
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                      Acerto de viagem internacional em <span className="font-semibold">{settlementCurrency}</span>.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Visual de transferência */}
                <div className={cn(
                  "flex items-center justify-center gap-6 p-4 rounded-xl",
                  settleType === "PAY"
                    ? "bg-red-50 dark:bg-red-950/20"
                    : "bg-green-50 dark:bg-green-950/20"
                )}>
                  <div className="text-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-medium mx-auto text-white",
                      settleType === "PAY" ? "bg-red-500" : "bg-muted"
                    )}>
                      {settleType === "PAY" ? "EU" : getInitials(member?.name || "")}
                    </div>
                    <p className="text-sm mt-2">{settleType === "PAY" ? "Eu" : member?.name}</p>
                  </div>
                  <div className="text-center">
                    <ArrowRight className={cn(
                      "h-5 w-5",
                      settleType === "PAY" ? "text-red-500" : "text-green-500"
                    )} />
                    <p className={cn(
                      "font-mono font-bold mt-1",
                      settleType === "PAY" ? "text-red-600" : "text-green-600"
                    )}>
                      {getCurrencySymbol(settlementCurrency)} {settleAmount || "0,00"}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-medium mx-auto text-white",
                      settleType === "RECEIVE" ? "bg-green-500" : "bg-muted"
                    )}>
                      {settleType === "RECEIVE" ? "EU" : getInitials(member?.name || "")}
                    </div>
                    <p className="text-sm mt-2">{settleType === "RECEIVE" ? "Eu" : member?.name}</p>
                  </div>
                </div>

                {/* Seleção de itens */}
                {pendingMemberItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm font-medium">Itens para acertar</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-xs h-7 shrink-0"
                      >
                        {selectedItems.length === pendingMemberItems.length
                          ? "Desmarcar"
                          : <><span className="hidden sm:inline">Selecionar todos</span><span className="sm:hidden">Todos</span></>}
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                      {pendingMemberItems.map(item => {
                        const itemTrip = item.tripId ? trips.find(t => t.id === item.tripId) : null;
                        const itemCurrency = itemTrip?.currency || "BRL";
                        const isCredit = item.type === "CREDIT";
                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => {
                                toggleItem(item.id);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{item.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(item.date), "dd/MM/yyyy")}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "font-mono text-sm font-medium",
                                isCredit ? "text-green-600" : "text-red-600"
                              )}>
                                {getCurrencySymbol(itemCurrency)} {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                              {itemCurrency !== "BRL" && (
                                <p className="text-[10px] text-blue-600">{itemCurrency}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedItems.length > 0 && (
                      <div className={cn(
                        "p-2 rounded-lg text-sm",
                        settleType === "PAY" ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"
                      )}>
                        <div className="flex justify-between">
                          <span>Itens selecionados:</span>
                          <span className="font-medium">{selectedItems.length}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span className={cn(
                            "font-mono",
                            settleType === "PAY" ? "text-red-600" : "text-green-600"
                          )}>
                            {getCurrencySymbol(settlementCurrency)} {Math.abs(getSelectedTotal()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Valor e conta */}
                <div className="grid gap-4">
                  {/* Data do pagamento */}
                  <div className="space-y-2">
                    <Label>Data do {settleType === "PAY" ? "Pagamento" : "Recebimento"}</Label>
                    <Input
                      type="date"
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                    <p className="text-xs text-muted-foreground">
                      📅 O acerto aparecerá no mês desta data
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Conta {isInternationalSettlement && `(${settlementCurrency})`}</Label>
                    <Select value={settleAccountId} onValueChange={setSettleAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSettleAccounts.length === 0 ? (
                          <SelectItem value="no-accounts" disabled>
                            Nenhuma conta em {settlementCurrency} disponível
                          </SelectItem>
                        ) : (
                          filteredSettleAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                              {account.is_international && ` (${account.currency})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {isInternationalSettlement && filteredSettleAccounts.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Crie uma conta em {settlementCurrency} para fazer este acerto
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSettle}
              disabled={isSettling || !settleAccountId}
              className={cn(
                settleType === "PAY"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {settleType === "PAY" ? "Confirmar Pagamento" : "Confirmar Recebimento"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Settlement Confirm */}
      <AlertDialog open={undoConfirm.isOpen} onOpenChange={(open) => !open && setUndoConfirm({ isOpen: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer Acerto</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja desfazer o acerto de "{undoConfirm.item?.description}"? Ele voltará a aparecer como pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndoSettlement}>
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Transaction Confirm */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir a transação "{deleteConfirm.item?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Series Confirm */}
      <AlertDialog open={deleteSeriesConfirm.isOpen} onOpenChange={(open) => !open && setDeleteSeriesConfirm({ isOpen: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Série de Parcelas</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir toda a série de parcelas "{deleteSeriesConfirm.item?.description}"?
              Todas as {deleteSeriesConfirm.item?.totalInstallments} parcelas serão excluídas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeries}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Série
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <SharedInstallmentImport
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        members={members}
        onSuccess={() => refetch()}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />
      <AlertDialog open={undoAllConfirm} onOpenChange={setUndoAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer TODOS os acertos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá reverter <strong>todos</strong> os itens marcados como pagos neste mês/período para todos os membros.
              <br /><br />
              As transações de pagamento vinculadas serão excluídas e os saldos das contas serão revertidos.
              <br /><br />
              Esta ação não pode ser desfeita automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUndoAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isUndoingAll}
            >
              {isUndoingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revertendo...
                </>
              ) : (
                "Sim, desfazer tudo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
