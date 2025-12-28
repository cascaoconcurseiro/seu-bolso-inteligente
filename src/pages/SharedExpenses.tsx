import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plane,
  History,
  Wallet,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Undo2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useCreateTransaction, useDeleteTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
import { useSharedFinances, InvoiceItem } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TransactionModal } from "@/components/modals/TransactionModal";

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";
type ViewMode = "list" | "detail";

export function SharedExpenses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SharedTab>("REGULAR");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { currentDate } = useMonth();
  
  // Dialog states
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payAccountId, setPayAccountId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Transaction modal
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });
  
  // Undo settlement
  const [undoConfirm, setUndoConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });

  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: accounts = [] } = useAccounts();
  const { data: trips = [] } = useTrips();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const { invoices, getFilteredInvoice, getTotals, isLoading: sharedLoading, refetch } = useSharedFinances({
    currentDate,
    activeTab,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Get member invoice data
  const getMemberInvoice = (memberId: string) => {
    const items = getFilteredInvoice(memberId);
    const totals = getTotals(items);
    const net = totals["BRL"]?.net || 0;
    return { 
      total: Math.abs(net), 
      net,
      itemCount: items.filter(i => !i.isPaid).length,
      items
    };
  };

  // Selected member data
  const selectedMemberData = selectedMember ? members.find(m => m.id === selectedMember) : null;
  const selectedInvoice = selectedMember ? getMemberInvoice(selectedMember) : null;

  // Calculate totals for summary
  let totalToReceive = 0;
  let totalToPay = 0;
  members.forEach(member => {
    const invoice = getMemberInvoice(member.id);
    if (invoice.net > 0) totalToReceive += invoice.net;
    else totalToPay += Math.abs(invoice.net);
  });

  const openMemberDetail = (memberId: string) => {
    setSelectedMember(memberId);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedMember(null);
  };

  // Pay/Receive handler
  const handlePay = async () => {
    if (!selectedMember || !payAccountId || !selectedInvoice) return;

    setIsProcessing(true);
    try {
      const member = members.find(m => m.id === selectedMember);
      const items = selectedInvoice.items.filter(i => !i.isPaid);
      const amount = selectedInvoice.total;
      const iOwe = selectedInvoice.net < 0;

      if (items.length === 0) {
        toast.error("Nenhum item pendente");
        setIsProcessing(false);
        return;
      }

      // Verificar se splits já foram pagos
      const splitIds = items.filter(i => i.splitId).map(i => i.splitId);
      if (splitIds.length > 0) {
        const { data: existingSplits } = await supabase
          .from('transaction_splits')
          .select('id, is_settled')
          .in('id', splitIds);
        
        const alreadySettled = existingSplits?.filter(s => s.is_settled) || [];
        if (alreadySettled.length > 0) {
          toast.error(`${alreadySettled.length} item(ns) já foram pagos!`);
          setIsProcessing(false);
          refetch();
          return;
        }
      }

      const desc = iOwe
        ? `Pagamento Acerto - ${member?.name}`
        : `Recebimento Acerto - ${member?.name}`;

      // Create settlement transaction
      const result = await createTransaction.mutateAsync({
        amount,
        description: desc,
        date: new Date().toISOString().split("T")[0],
        type: iOwe ? "EXPENSE" : "INCOME",
        account_id: payAccountId,
        domain: "SHARED",
        is_shared: false,
        related_member_id: selectedMember,
      });

      const settlementTxId = Array.isArray(result) ? result[0]?.id : result?.id;

      // Mark all items as settled
      for (const item of items) {
        if (item.type === 'CREDIT' && item.splitId) {
          await supabase
            .from('transaction_splits')
            .update({
              is_settled: true,
              settled_at: new Date().toISOString(),
              settled_transaction_id: settlementTxId
            })
            .eq('id', item.splitId);
        } else if (item.type === 'DEBIT') {
          await supabase
            .from('transactions')
            .update({
              is_settled: true,
              settled_at: new Date().toISOString()
            })
            .eq('id', item.originalTxId);
        }
      }

      toast.success(`Acerto de ${formatCurrency(amount)} realizado!`);
      setShowPayDialog(false);
      setPayAccountId("");
      refetch();
    } catch (error) {
      console.error('Settlement error:', error);
      toast.error("Erro ao realizar acerto");
    } finally {
      setIsProcessing(false);
    }
  };

  // Undo settlement
  const handleUndoSettlement = async () => {
    const item = undoConfirm.item;
    if (!item) return;

    try {
      if (item.type === 'CREDIT' && item.splitId) {
        await supabase
          .from('transaction_splits')
          .update({
            is_settled: false,
            settled_at: null,
            settled_transaction_id: null
          })
          .eq('id', item.splitId);
      } else if (item.type === 'DEBIT') {
        await supabase
          .from('transactions')
          .update({
            is_settled: false,
            settled_at: null
          })
          .eq('id', item.originalTxId);
      }

      toast.success("Acerto desfeito!");
      setUndoConfirm({ isOpen: false, item: null });
      refetch();
    } catch (error) {
      toast.error("Erro ao desfazer acerto");
    }
  };

  // Delete transaction
  const handleDeleteItem = async () => {
    const item = deleteConfirm.item;
    if (!item) return;

    try {
      await deleteTransaction.mutateAsync(item.originalTxId);
      toast.success("Transação excluída!");
      setDeleteConfirm({ isOpen: false, item: null });
      refetch();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  // Loading state
  if (membersLoading || sharedLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // DETAIL VIEW - igual ao detalhe do cartão de crédito
  if (view === "detail" && selectedMemberData && selectedInvoice) {
    const iOwe = selectedInvoice.net < 0;
    const theyOweMe = selectedInvoice.net > 0;
    const items = selectedInvoice.items;
    const pendingItems = items.filter(i => !i.isPaid);
    const paidItems = items.filter(i => i.isPaid);

    // Cor do card baseada em quem deve
    const cardColor = iOwe ? "#ef4444" : theyOweMe ? "#22c55e" : "#6b7280";

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goBack} 
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: cardColor }}
            >
              {getInitials(selectedMemberData.name)}
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight">{selectedMemberData.name}</h1>
              <p className="text-muted-foreground">
                {activeTab === "TRAVEL" ? "Despesas de Viagem" : 
                 activeTab === "HISTORY" ? "Histórico" : "Despesas Compartilhadas"}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Card - igual ao cartão de crédito */}
        <div 
          className="p-6 rounded-2xl text-white transition-all hover:shadow-lg relative overflow-hidden"
          style={{ backgroundColor: cardColor }}
        >
          <p className="text-sm opacity-80 mb-1">
            {iOwe ? "Você deve" : theyOweMe ? "Devem a você" : "Saldo"}
          </p>
          <p className="font-display font-bold text-4xl tracking-tight">
            {formatCurrency(selectedInvoice.total)}
          </p>
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm opacity-80">
              {pendingItems.length} {pendingItems.length === 1 ? "item pendente" : "itens pendentes"}
            </p>
          </div>
          
          {/* Action Button - só aparece se tiver valor */}
          {selectedInvoice.total > 0 && activeTab !== "HISTORY" && (
            <div className="mt-6">
              <Button 
                variant="secondary" 
                size="sm" 
                className={cn(
                  "w-full border-0",
                  iOwe 
                    ? "bg-white/20 hover:bg-white/30 text-white" 
                    : "bg-white/20 hover:bg-white/30 text-white"
                )}
                onClick={() => setShowPayDialog(true)}
              >
                <Wallet className="h-4 w-4 mr-2" />
                {iOwe ? "Pagar" : "Receber"}
              </Button>
            </div>
          )}
        </div>

        {/* Transactions List - igual ao cartão de crédito */}
        {pendingItems.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Lançamentos ({pendingItems.length})
            </h2>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 rounded-xl border border-border transition-all duration-200 hover:border-foreground/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                        {item.totalInstallments && item.totalInstallments > 1 && (
                          <span className="ml-2 text-xs">
                            ({item.installmentNumber}/{item.totalInstallments})
                          </span>
                        )}
                        {item.tripId && trips.find(t => t.id === item.tripId) && (
                          <span className="ml-2 text-xs text-primary">
                            • {trips.find(t => t.id === item.tripId)?.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-mono font-semibold",
                        item.type === 'CREDIT' ? "text-positive" : "text-negative"
                      )}>
                        {item.type === 'CREDIT' ? '+' : '-'}{formatCurrency(item.amount)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingTransaction({ id: item.originalTxId });
                            setShowTransactionModal(true);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirm({ isOpen: true, item })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingItems.length === 0 && activeTab !== "HISTORY" && (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-positive" />
            <p className="text-muted-foreground">Tudo acertado!</p>
          </div>
        )}

        {/* History items - só no histórico */}
        {activeTab === "HISTORY" && paidItems.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Itens Acertados ({paidItems.length})
            </h2>
            <div className="space-y-2">
              {paidItems.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 rounded-xl border border-border bg-muted/30 opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-positive" />
                        <p className="font-medium truncate line-through">{item.description}</p>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setUndoConfirm({ isOpen: true, item })}>
                            <Undo2 className="h-4 w-4 mr-2" />
                            Desfazer acerto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "HISTORY" && paidItems.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum histórico</p>
          </div>
        )}

        {/* Pay Dialog */}
        <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedInvoice.net < 0 ? "Pagar" : "Receber"} - {selectedMemberData.name}
              </DialogTitle>
              <DialogDescription>
                {selectedInvoice.net < 0 
                  ? "Registre o pagamento da sua dívida" 
                  : "Registre o recebimento do valor"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor total</p>
                <p className="font-mono text-3xl font-bold">{formatCurrency(selectedInvoice.total)}</p>
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={payAccountId} onValueChange={setPayAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.type !== "CREDIT_CARD" && !a.is_international).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handlePay}
                disabled={isProcessing || !payAccountId}
                className={cn(
                  selectedInvoice.net < 0 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-green-600 hover:bg-green-700"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Empty state
  if (members.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">Compartilhados</h1>
            <p className="text-muted-foreground mt-1">Despesas divididas com família</p>
          </div>
        </div>

        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Nenhum membro</h3>
          <p className="text-muted-foreground mb-6">Adicione membros na página Família</p>
          <Button variant="outline" onClick={() => navigate("/familia")}>
            Gerenciar Família
          </Button>
        </div>
      </div>
    );
  }

  // LIST VIEW - igual à lista de cartões
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Compartilhados</h1>
          <p className="text-muted-foreground mt-1">Despesas divididas com família</p>
        </div>
      </div>

      {/* Summary - igual ao resumo de cartões */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">A receber</p>
          <p className="font-mono text-2xl font-bold text-positive">{formatCurrency(totalToReceive)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">A pagar</p>
          <p className="font-mono text-2xl font-bold text-negative">{formatCurrency(totalToPay)}</p>
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
          {/* Members List - igual à lista de cartões */}
          <div className="space-y-3">
            {members.map((member) => {
              const invoice = getMemberInvoice(member.id);
              const iOwe = invoice.net < 0;
              const theyOweMe = invoice.net > 0;
              
              // Não mostrar membros sem itens (exceto no histórico)
              if (invoice.items.length === 0 && activeTab !== "HISTORY") {
                return null;
              }

              return (
                <div
                  key={member.id}
                  onClick={() => openMemberDetail(member.id)}
                  className="group p-5 rounded-xl border border-border hover:border-foreground/20 
                             transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white transition-transform duration-200 group-hover:scale-110",
                          iOwe ? "bg-red-500" : theyOweMe ? "bg-green-500" : "bg-gray-400"
                        )}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <p className="font-display font-semibold text-lg">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.itemCount} {invoice.itemCount === 1 ? "item pendente" : "itens pendentes"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn(
                          "font-mono font-semibold",
                          iOwe ? "text-negative" : theyOweMe ? "text-positive" : "text-muted-foreground"
                        )}>
                          {invoice.total > 0 ? formatCurrency(invoice.total) : "Em dia"}
                        </p>
                        {invoice.total > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {iOwe ? "você deve" : "devem a você"}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground 
                                               transition-all group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mensagem se não houver membros com itens */}
            {members.every(m => getMemberInvoice(m.id).items.length === 0) && (
              <div className="py-12 text-center border border-dashed border-border rounded-xl">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-positive" />
                <h3 className="font-display font-semibold text-lg mb-2">
                  {activeTab === "HISTORY" ? "Nenhum histórico" : "Tudo em dia!"}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === "HISTORY" 
                    ? "Nenhum acerto foi realizado ainda" 
                    : "Não há despesas pendentes"}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm.item?.description}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Undo Settlement Dialog */}
      <AlertDialog open={undoConfirm.isOpen} onOpenChange={(open) => !open && setUndoConfirm({ isOpen: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer Acerto</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja desfazer o acerto de "{undoConfirm.item?.description}"?
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

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
          refetch();
        }}
        editTransaction={editingTransaction}
      />
    </div>
  );
}