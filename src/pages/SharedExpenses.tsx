import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
import { useSharedFinances, InvoiceItem } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SharedTab>("REGULAR");
  const { currentDate } = useMonth();
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [settleType, setSettleType] = useState<"PAY" | "RECEIVE">("PAY");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Undo settlement state
  const [undoConfirm, setUndoConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });

  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: accounts = [] } = useAccounts();
  const { data: trips = [] } = useTrips();
  const createTransaction = useCreateTransaction();

  const { invoices, getFilteredInvoice, getTotals, isLoading: sharedLoading, refetch, transactions } = useSharedFinances({
    currentDate,
    activeTab,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
    setSettleAmount(amount.toFixed(2).replace(".", ","));
    setSelectedItems([]);
    setShowSettleDialog(true);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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

      // VERIFICAR SE ALGUM ITEM JÁ FOI PAGO (prevenir duplicidade)
      const alreadyPaidItems = itemsToSettle.filter(i => i.isPaid);
      if (alreadyPaidItems.length > 0) {
        toast.error(`${alreadyPaidItems.length} item(ns) já foram pagos anteriormente!`);
        setIsSettling(false);
        return;
      }

      // Verificar no banco se os splits já estão marcados como pagos
      const splitIds = itemsToSettle.filter(i => i.splitId).map(i => i.splitId);
      if (splitIds.length > 0) {
        const { data: existingSplits } = await supabase
          .from('transaction_splits')
          .select('id, is_settled')
          .in('id', splitIds);
        
        const alreadySettled = existingSplits?.filter(s => s.is_settled) || [];
        if (alreadySettled.length > 0) {
          toast.error(`${alreadySettled.length} item(ns) já foram pagos no banco de dados!`);
          setIsSettling(false);
          refetch();
          return;
        }
      }

      const amount = parseFloat(settleAmount.replace(".", "").replace(",", "."));
      if (isNaN(amount) || amount <= 0) {
        toast.error("Valor inválido");
        setIsSettling(false);
        return;
      }

      // Calculate total of selected items
      const itemsTotal = itemsToSettle.reduce((sum, item) => {
        if (item.type === "CREDIT") return sum + item.amount;
        return sum - item.amount;
      }, 0);
      
      // Considerar pagamento completo se o valor for >= 99% do total
      const isPartialSettlement = amount < Math.abs(itemsTotal) * 0.99;

      const desc = settleType === "PAY"
        ? `Pagamento ${isPartialSettlement ? 'Parcial ' : ''}Acerto - ${member?.name}`
        : `Recebimento ${isPartialSettlement ? 'Parcial ' : ''}Acerto - ${member?.name}`;

      // Create settlement transaction
      const result = await createTransaction.mutateAsync({
        amount,
        description: desc,
        date: new Date().toISOString().split("T")[0],
        type: settleType === "PAY" ? "EXPENSE" : "INCOME",
        account_id: settleAccountId,
        domain: "SHARED",
        is_shared: false,
        related_member_id: selectedMember,
      });

      const settlementTxId = Array.isArray(result) ? result[0]?.id : result?.id;

      // SEMPRE marcar items como settled
      let updateErrors: string[] = [];
      let successCount = 0;
      
      console.log('🔍 [handleSettle] Iniciando atualização de itens:', {
        totalItems: itemsToSettle.length,
        settlementTxId,
        items: itemsToSettle.map(i => ({
          id: i.id,
          type: i.type,
          splitId: i.splitId,
          originalTxId: i.originalTxId,
          amount: i.amount,
          description: i.description
        }))
      });
      
      for (const item of itemsToSettle) {
        console.log('🔍 [handleSettle] Processando item:', {
          id: item.id,
          type: item.type,
          splitId: item.splitId,
          originalTxId: item.originalTxId,
          amount: item.amount,
          description: item.description
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
      setSelectedItems([]);
      
      // Aguardar refetch para atualizar a UI
      await refetch();
      
      toast.success(`Acerto de ${formatCurrency(amount)} realizado!`);
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

  // Calculate totals
  let totalOwedToMe = 0;
  let totalIOwe = 0;

  members.forEach(member => {
    const items = getFilteredInvoice(member.id);
    const totals = getTotals(items);
    const net = totals["BRL"]?.net || 0;
    if (net > 0) totalOwedToMe += net;
    else totalIOwe += Math.abs(net);
  });

  const myBalance = totalOwedToMe - totalIOwe;

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
    const net = totals["BRL"]?.net || 0;
    const isExpanded = true; // Sempre expandido
    const groupedItems = getGroupedItems(member.id);
    const pendingCount = items.filter(i => !i.isPaid).length;
    const paidCount = items.filter(i => i.isPaid).length;
    const totalPaidAmount = items.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);

    // Não mostrar membros sem itens
    if (items.length === 0) {
      return null;
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
              {/* Valor total */}
              <div className="text-right">
                {isHistory ? (
                  <>
                    <p className="font-mono font-bold text-xl text-gray-600 dark:text-gray-400">
                      {formatCurrency(totalPaidAmount)}
                    </p>
                    <p className="text-xs font-medium text-gray-500">
                      Total acertado
                    </p>
                  </>
                ) : (
                  <>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      net === 0 ? "text-muted-foreground" : 
                      iOwe ? "text-red-600 dark:text-red-400" : 
                      "text-green-600 dark:text-green-400"
                    )}>
                      {net === 0 ? "Em dia" : formatCurrency(Math.abs(net))}
                    </p>
                    {net !== 0 && (
                      <p className={cn(
                        "text-xs font-medium",
                        iOwe ? "text-red-500" : "text-green-500"
                      )}>
                        {iOwe ? "Você deve" : "Devem a você"}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Botão de acertar - só mostra se não for histórico */}
              {!isHistory && net !== 0 && (
                <Button
                  variant={iOwe ? "destructive" : "default"}
                  size="sm"
                  className={cn(
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
                  <Wallet className="h-4 w-4 mr-2" />
                  {iOwe ? "Pagar" : "Receber"}
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
                    const isCredit = item.type === "CREDIT";
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

                        {/* Descrição */}
                        <div className="col-span-5">
                          <p className={cn(
                            "text-sm font-medium",
                            item.isPaid && "line-through text-muted-foreground"
                          )}>
                            {item.description}
                          </p>
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
                            {formatCurrency(item.amount)}
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

                          {item.isPaid && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setUndoConfirm({ isOpen: true, item })}
                                >
                                  <Undo2 className="h-4 w-4 mr-2" />
                                  Desfazer acerto
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
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
                    {formatCurrency(Math.abs(net))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Compartilhados</h1>
          <p className="text-muted-foreground mt-1">Despesas divididas com família</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Importar Parcelas
          </Button>
        </div>
      </div>

      {/* Balance Evolution Chart */}
      <SharedBalanceChart 
        transactions={transactions} 
        invoices={invoices} 
        currentDate={currentDate} 
      />

      {/* Summary Cards - Estilo Fatura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meu Saldo */}
        <div className={cn(
          "p-6 rounded-xl border-2",
          myBalance >= 0 
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50" 
            : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className={cn(
              "h-5 w-5",
              myBalance >= 0 ? "text-green-600" : "text-red-600"
            )} />
            <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
          </div>
          <p className={cn(
            "font-mono text-3xl font-bold",
            myBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {myBalance >= 0 ? "+" : ""}{formatCurrency(myBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {myBalance >= 0 ? "Saldo positivo" : "Saldo devedor"}
          </p>
        </div>

        {/* A Receber */}
        <div className="p-6 rounded-xl border-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-5 w-5 text-green-600 rotate-180" />
            <p className="text-sm font-medium text-muted-foreground">A Receber</p>
          </div>
          <p className="font-mono text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalOwedToMe)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Me devem</p>
        </div>

        {/* A Pagar */}
        <div className="p-6 rounded-xl border-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">A Pagar</p>
          </div>
          <p className="font-mono text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalIOwe)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Eu devo</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SharedTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="REGULAR" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            Regular
          </TabsTrigger>
          <TabsTrigger value="TRAVEL" className="flex-1 gap-2">
            <Plane className="h-4 w-4" />
            Viagens
          </TabsTrigger>
          <TabsTrigger value="HISTORY" className="flex-1 gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {members.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-xl">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-semibold text-lg mb-2">Nenhum membro</h3>
              <p className="text-muted-foreground mb-6">Adicione membros na página Família</p>
              <Button variant="outline" onClick={() => navigate("/familia")}>
                Gerenciar Família
              </Button>
            </div>
          ) : (
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

              {/* Lista de membros estilo fatura */}
              {members.map(member => renderMemberInvoiceCard(member))}

              {/* Mensagem se não houver itens */}
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
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Itens para acertar</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-xs h-7"
                      >
                        {selectedItems.length === pendingMemberItems.length 
                          ? "Desmarcar todos" 
                          : "Selecionar todos (pagar tudo)"}
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
                                // Atualizar valor após toggle
                                setTimeout(updateSettleAmountFromSelection, 0);
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
                  <div className="space-y-2">
                    <Label>Valor do acerto ({settlementCurrency})</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {getCurrencySymbol(settlementCurrency)}
                      </span>
                      <Input
                        type="text"
                        value={settleAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const cents = parseInt(val) / 100;
                          setSettleAmount(cents.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }));
                        }}
                        className="font-mono text-lg pl-10"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Altere o valor para fazer um acerto parcial
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
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhuma conta em {settlementCurrency} disponível
                          </div>
                        ) : (
                          filteredSettleAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                {account.name}
                                {account.is_international && (
                                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                    {account.currency}
                                  </span>
                                )}
                              </div>
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
    </div>
  );
}