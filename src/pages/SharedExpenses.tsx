import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
import { useSharedExpensesActions } from "@/hooks/useSharedExpensesActions";
import { useSharedFinances, InvoiceItem } from "@/hooks/useSharedFinances";
import { useSettleWithPayment, useUnsettleWithReversal } from "@/hooks/useSettlement";
import { useMonth } from "@/contexts/MonthContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SharedInstallmentImport } from "@/components/shared/SharedInstallmentImport";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { useTransactionSync } from "@/hooks/useTransactionSync";
import { ERROR_MESSAGES, SettlementErrorCode } from "@/services/settlementValidation";
import { AnticipateInstallmentsDialog } from "@/components/dialogs/AnticipateInstallmentsDialog";
import { 
  logSettlementCreated, 
  logSettlementUndone, 
  logOperationBlocked,
  logTransactionDeleted,
  logSeriesDeleted
} from "@/services/auditLog";

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";

export function SharedExpenses() {


  const navigate = useNavigate();
  const { user } = useAuth();


  const [activeTab, setActiveTab] = useState<SharedTab>("REGULAR");
  const { currentDate } = useMonth();


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

  // Anticipate installments state
  const [anticipateDialog, setAnticipateDialog] = useState<{
    isOpen: boolean;
    seriesId: string | null;
    currentInstallment: number;
    totalInstallments: number;
  }>({
    isOpen: false,
    seriesId: null,
    currentInstallment: 0,
    totalInstallments: 0,
  });

  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: profile } = useUserProfile();


  const { data: accounts = [] } = useAccounts();


  const { data: trips = [] } = useTrips();


  const createTransaction = useCreateTransaction();

  // Initialize transaction sync hook
  const { invalidateRelated, isSyncing } = useTransactionSync();


  const { invoices, getFilteredInvoice, getTotals, isLoading: sharedLoading, refetch, transactions } = useSharedFinances({
    currentDate,
    activeTab,
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

  const {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll
  } = useSharedExpensesActions({
    selectedMember, settleAccountId, settleType, settleAmount, selectedItems, settleDate,
    members, getFilteredInvoice, createTransaction, user, invalidateRelated, refetch,
    undoConfirm, setUndoConfirm, deleteConfirm, setDeleteConfirm, deleteSeriesConfirm,
    setDeleteSeriesConfirm, setIsUndoingAll, setUndoAllConfirm, setIsSettling,
    setShowSettleDialog, setSelectedMember, setSettleAmount, setSettleAccountId,
    setSettleDate, setSelectedItems, formatCurrency
  });

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
  const renderMemberInvoiceCard = (member: unknown) => {
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
              <UserAvatar 
                name={member.name}
                avatarUrl={member.avatar_url}
                colorId={member.avatar_color || "green"}
                iconId={member.avatar_icon || "avatar_1"}
                size="lg"
              />

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
                    "h-11 md:h-9 min-w-[100px] md:min-w-[120px]",
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
                  <span>{iOwe ? "Pagar" : "Receber"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de itens expandida - estilo extrato de fatura */}
        {isExpanded && items.length > 0 && (
          <div className="border-t border-border">
            {/* Cabeçalho da lista - apenas desktop */}
            <div className="hidden md:grid px-4 py-2 bg-muted/50 border-b border-border grid-cols-12 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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


                    try {
                      const isCredit = item.type === "CREDIT";
                      const hasActions = item.isPaid || item.creatorUserId === user?.id;


                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "px-3 md:px-4 py-3 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-0 md:items-center hover:bg-muted/20 transition-colors",
                            item.isPaid && "opacity-60 bg-green-50/30 dark:bg-green-950/10"
                          )}
                        >
                          {/* Mobile: Layout em coluna */}
                          <div className="flex md:hidden items-start gap-3">
                            {/* Status */}
                            <div className="shrink-0 pt-0.5">
                              {item.isPaid ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  isCredit ? "bg-green-500" : "bg-red-500"
                                )} />
                              )}
                            </div>

                            {/* Conteúdo principal */}
                            <div className="flex-1 min-w-0">
                              {/* Linha 1: Descrição e badges */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    item.isPaid && "line-through text-muted-foreground"
                                  )}>
                                    {item.description}
                                  </p>
                                  {item.creatorName && (() => {
                                    const creator = members.find(m => m.linked_user_id === item.creatorUserId);

                                    return (
                                      <div className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded mt-1">
                                        <div className="w-4 h-4">
                                          <UserAvatar
                                            name={item.creatorName}
                                            avatarUrl={creator?.avatar_url}
                                            colorId={creator?.avatar_color || "green"}
                                            iconId={creator?.avatar_icon || "avatar_1"}
                                            size="sm"
                                            className="!w-4 !h-4 !text-[8px]"
                                          />
                                        </div>
                                        <span className="text-[9px] uppercase tracking-wider font-medium">
                                          {item.creatorName}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* Valor - destaque no mobile */}
                                <span className={cn(
                                  "font-mono text-sm font-bold shrink-0 whitespace-nowrap",
                                  item.isPaid ? "text-muted-foreground" :
                                    isCredit ? "text-green-600 dark:text-green-400" :
                                      "text-red-600 dark:text-red-400"
                                )}>
                                  {formatCurrency(item.amount, item.currency)}
                                </span>
                              </div>

                              {/* Linha 2: Categoria e data */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {item.category && (
                                  <span className="truncate">📁 {item.category}</span>
                                )}
                                <span className="whitespace-nowrap">
                                  {format(new Date(item.date + 'T12:00:00'), "dd/MM/yy", { locale: ptBR })}
                                </span>
                                {item.totalInstallments && item.totalInstallments > 1 && (
                                  <span className="whitespace-nowrap">
                                    {item.installmentNumber}/{item.totalInstallments}
                                  </span>
                                )}
                              </div>

                              {/* Linha 3: Badges de status */}
                              <div className="flex items-center gap-1.5 mt-2">
                                {item.isPaid && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50"
                                  >
                                    PAGO
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold",
                                    item.isPaid ? "border-gray-300 text-gray-500" :
                                      isCredit ? "border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30" :
                                        "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                                  )}
                                >
                                  {isCredit ? "CRÉDITO" : "DÉBITO"}
                                </Badge>

                                {/* Menu de ações */}
                                {(item.isPaid || item.creatorUserId === user?.id || (item.totalInstallments && item.totalInstallments > 1 && !item.isPaid && item.canAnticipate)) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                                        <MoreHorizontal className="h-4 w-4" />
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
                                      {!item.isPaid && item.totalInstallments && item.totalInstallments > 1 && item.seriesId && item.canAnticipate && (
                                        <DropdownMenuItem
                                          onClick={() => setAnticipateDialog({
                                            isOpen: true,
                                            seriesId: item.seriesId,
                                            currentInstallment: item.installmentNumber || 0,
                                            totalInstallments: item.totalInstallments
                                          })}
                                          className="text-blue-600 focus:text-blue-600"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Antecipar Parcelas
                                        </DropdownMenuItem>
                                      )}
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
                          </div>

                          {/* Desktop: Layout em grid (original) */}
                          <div className="hidden md:contents">
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
                                {item.creatorName && (() => {
                                  const creator = members.find(m => m.linked_user_id === item.creatorUserId);

                                  return (
                                    <div className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                      <div className="w-4 h-4">
                                        <UserAvatar
                                          name={item.creatorName}
                                          avatarUrl={creator?.avatar_url}
                                          colorId={creator?.avatar_color || "green"}
                                          iconId={creator?.avatar_icon || "avatar_1"}
                                          size="sm"
                                          className="!w-4 !h-4 !text-[8px]"
                                        />
                                      </div>
                                      <span className="text-[10px] uppercase tracking-wider font-medium">
                                        {item.creatorName}
                                      </span>
                                    </div>
                                  );
                                })()}
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
                                {format(new Date(item.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
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

                              {(item.isPaid || item.creatorUserId === user?.id || (item.totalInstallments && item.totalInstallments > 1 && !item.isPaid && item.canAnticipate)) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
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
                                      {!item.isPaid && item.totalInstallments && item.totalInstallments > 1 && item.seriesId && item.canAnticipate && (
                                        <DropdownMenuItem
                                          onClick={() => setAnticipateDialog({
                                            isOpen: true,
                                            seriesId: item.seriesId,
                                            currentInstallment: item.installmentNumber || 0,
                                            totalInstallments: item.totalInstallments
                                          })}
                                          className="text-blue-600 focus:text-blue-600"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Antecipar Parcelas
                                        </DropdownMenuItem>
                                      )}
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
  const renderTripCard = (trip: unknown) => {
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
                    <UserAvatar
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      size="sm"
                    />
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


                    try {
                      const isCredit = item.type === 'CREDIT';
                      const hasActions = item.isPaid || item.creatorUserId === user?.id;


                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "px-3 md:px-4 py-3 hover:bg-muted/30 transition-colors flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-2 md:items-center text-sm",
                            item.isPaid && "opacity-60 bg-green-50/30 dark:bg-green-950/10"
                          )}
                        >
                          {/* Mobile: Layout em coluna */}
                          <div className="flex md:hidden items-start gap-3">
                            {/* Status */}
                            <div className="shrink-0 pt-0.5">
                              {item.isPaid ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <div className={cn(
                                  "h-5 w-5 rounded-full border-2",
                                  isCredit ? "border-green-500" : "border-red-500"
                                )} />
                              )}
                            </div>

                            {/* Conteúdo principal */}
                            <div className="flex-1 min-w-0">
                              {/* Linha 1: Descrição e valor */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    item.isPaid && "text-muted-foreground line-through"
                                  )}>
                                    {item.description}
                                  </p>
                                  {item.creatorName && (
                                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded uppercase tracking-wider font-medium inline-block mt-1">
                                      💳 {item.creatorName}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Valor */}
                                <span className={cn(
                                  "font-mono text-sm font-bold shrink-0 whitespace-nowrap",
                                  item.isPaid ? "text-muted-foreground" :
                                    isCredit ? "text-green-600 dark:text-green-400" :
                                      "text-red-600 dark:text-red-400"
                                )}>
                                  {formatCurrency(item.amount, item.currency)}
                                </span>
                              </div>

                              {/* Linha 2: Categoria e data */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {item.category && (
                                  <span className="truncate">{item.category}</span>
                                )}
                                <span className="whitespace-nowrap">
                                  {format(new Date(item.date + 'T12:00:00'), "dd/MM/yy")}
                                </span>
                              </div>

                              {/* Linha 3: Badges */}
                              <div className="flex items-center gap-1.5 mt-2">
                                {item.isPaid && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50"
                                  >
                                    PAGO
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold",
                                    item.isPaid ? "border-gray-300 text-gray-500" :
                                      isCredit ? "border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30" :
                                        "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                                  )}
                                >
                                  {isCredit ? "CRÉDITO" : "DÉBITO"}
                                </Badge>

                                {/* Menu de ações */}
                                {(item.isPaid || item.creatorUserId === user?.id || (item.totalInstallments && item.totalInstallments > 1 && !item.isPaid && item.canAnticipate)) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                                        <MoreHorizontal className="h-4 w-4" />
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
                                      {!item.isPaid && item.totalInstallments && item.totalInstallments > 1 && item.seriesId && item.canAnticipate && (
                                        <DropdownMenuItem
                                          onClick={() => setAnticipateDialog({
                                            isOpen: true,
                                            seriesId: item.seriesId,
                                            currentInstallment: item.installmentNumber || 0,
                                            totalInstallments: item.totalInstallments
                                          })}
                                          className="text-blue-600 focus:text-blue-600"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Antecipar Parcelas
                                        </DropdownMenuItem>
                                      )}
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
                          </div>

                          {/* Desktop: Layout em grid (original) */}
                          <div className="hidden md:contents">
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
                              {format(new Date(item.date + 'T12:00:00'), "dd/MM/yyyy")}
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

                            {(item.isPaid || item.creatorUserId === user?.id || (item.totalInstallments && item.totalInstallments > 1 && !item.isPaid && item.canAnticipate)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
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
                                      {!item.isPaid && item.totalInstallments && item.totalInstallments > 1 && item.seriesId && item.canAnticipate && (
                                        <DropdownMenuItem
                                          onClick={() => setAnticipateDialog({
                                            isOpen: true,
                                            seriesId: item.seriesId,
                                            currentInstallment: item.installmentNumber || 0,
                                            totalInstallments: item.totalInstallments
                                          })}
                                          className="text-blue-600 focus:text-blue-600"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Antecipar Parcelas
                                        </DropdownMenuItem>
                                      )}
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
                        "h-11 md:h-9 w-full md:w-auto",
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
                      <Wallet className="h-4 w-4 mr-2" />
                      <span>{memberNet < 0 ? "Pagar" : "Receber"}</span>
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








  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Compartilhados</h1>
          <p className="text-muted-foreground mt-1">Despesas divididas com família</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="h-11 md:h-9 w-full sm:w-auto">
            <Layers className="h-4 w-4 mr-2" />
            <span>Importar Parcelas</span>
          </Button>
        </div>
      </div>

      {/* Balance Evolution Chart */}
      {(() => {

        try {
          const chart = (
            <SharedBalanceChart
              transactions={transactions}
              invoices={invoices}
              currentDate={currentDate}
            />
          );

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





                const tabsContentProps = {
                  value: activeTab,
                  className: "mt-6"
                };


                return (
                  <TabsContent {...tabsContentProps}>
                    {(() => {

                      if (members.length === 0) {

                        return (
                          <div className="py-16 text-center border border-dashed border-border rounded-xl">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-display font-semibold text-lg mb-2">Nenhum membro</h3>
                            <p className="text-muted-foreground mb-6">Adicione membros na página Família</p>
                            <Button variant="outline" onClick={() => navigate("/familia")} className="h-11 md:h-9 w-full sm:w-auto">
                              <span className="hidden sm:inline">Gerenciar Família</span>
                              <span className="sm:hidden">Família</span>
                            </Button>
                          </div>
                        );
                      }


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

                            if (activeTab !== 'TRAVEL' && members.length > 0) {
                              const memberCards = members.map(member => {

                                try {
                                  return renderMemberInvoiceCard(member);
                                } catch (error) {
                                  console.error('❌ [SharedExpenses] ERRO ao renderizar card do membro:', member.name, error);
                                  return undefined;
                                }
                              }).filter(Boolean);

                              return <>{memberCards}</>;
                            }

                            return <></>;
                          })()}

                          {/* Lista de viagens (TRAVEL) */}
                          {(() => {

                            if (activeTab === 'TRAVEL') {
                              const filteredTrips = trips.filter(trip => {
                                // Verificar se há itens desta viagem no mês atual
                                return members.some(member => {
                                  const memberItems = getFilteredInvoice(member.id).filter(i => i.tripId === trip.id);
                                  return memberItems.length > 0;
                                });
                              });

                              if (filteredTrips.length > 0) {
                                const tripCards = filteredTrips.map(trip => {

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
                    {settleType === "PAY" ? (
                      <div className="mx-auto w-12 h-12">
                        <UserAvatar
                          name={profile?.full_name || user?.email || "Eu"}
                          avatarUrl={profile?.avatar_url}
                          colorId={profile?.avatar_color || "green"}
                          iconId={profile?.avatar_icon || "avatar_1"}
                          size="md"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto w-12 h-12">
                        <UserAvatar
                          name={member?.name || ""}
                          avatarUrl={member?.avatar_url}
                          size="md"
                        />
                      </div>
                    )}
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
                    {settleType === "RECEIVE" ? (
                      <div className="mx-auto w-12 h-12">
                        <UserAvatar
                          name={profile?.full_name || user?.email || "Eu"}
                          avatarUrl={profile?.avatar_url}
                          colorId={profile?.avatar_color || "green"}
                          iconId={profile?.avatar_icon || "avatar_1"}
                          size="md"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto w-12 h-12">
                        <UserAvatar
                          name={member?.name || ""}
                          avatarUrl={member?.avatar_url}
                          size="md"
                        />
                      </div>
                    )}
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
                                {format(new Date(item.date + 'T12:00:00'), "dd/MM/yyyy")}
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

      {/* Anticipate Installments Dialog */}
      {anticipateDialog.seriesId && (
        <AnticipateInstallmentsDialog
          isOpen={anticipateDialog.isOpen}
          onClose={() => setAnticipateDialog({
            isOpen: false,
            seriesId: null,
            currentInstallment: 0,
            totalInstallments: 0
          })}
          seriesId={anticipateDialog.seriesId}
          currentInstallment={anticipateDialog.currentInstallment}
          totalInstallments={anticipateDialog.totalInstallments}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
