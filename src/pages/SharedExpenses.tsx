import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Users,
  Plus,
  Plane,
  History,
  Wallet,
  Loader2,
  MoreHorizontal,
  Undo2,
  Layers,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useTrips } from "@/hooks/useTrips";
import { useSharedFinances, InvoiceItem } from "@/hooks/useSharedFinances";
import { useMonth } from "@/contexts/MonthContext";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SharedInstallmentImport } from "@/components/shared/SharedInstallmentImport";
import { SharedBalanceChart } from "@/components/shared/SharedBalanceChart";

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";

export function SharedExpenses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SharedTab>("REGULAR");
  const { currentDate } = useMonth();
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
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
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
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
    } else {
      setSelectedItems(items.map(i => i.id));
    }
  };

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
      const isPartialSettlement = amount < Math.abs(itemsTotal);

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

      // Mark items as settled (only if full settlement)
      if (!isPartialSettlement) {
        for (const item of itemsToSettle) {
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
      }

      toast.success(`Acerto de ${formatCurrency(amount)} realizado!`);
      setShowSettleDialog(false);
      setSelectedMember(null);
      setSettleAmount("");
      setSettleAccountId("");
      setSelectedItems([]);
      refetch();
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

      toast.success("Acerto desfeito com sucesso!");
      setUndoConfirm({ isOpen: false, item: null });
      refetch();
    } catch (error) {
      console.error('Undo error:', error);
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
          <Button onClick={() => navigate("/transacoes/nova")}>
            <Plus className="h-5 w-5 mr-2" />
            Nova despesa
          </Button>
        </div>
      </div>

      {/* Balance Evolution Chart */}
      <SharedBalanceChart 
        transactions={transactions} 
        invoices={invoices} 
        currentDate={currentDate} 
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 py-4 px-6 rounded-xl bg-muted/50 border border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Meu saldo</p>
          <p className={cn(
            "font-mono text-2xl font-bold",
            myBalance >= 0 ? "text-positive" : "text-negative"
          )}>
            {myBalance >= 0 ? "+" : ""}{formatCurrency(myBalance)}
          </p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Me devem</p>
          <p className="font-mono text-lg font-medium text-positive">{formatCurrency(totalOwedToMe)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Eu devo</p>
          <p className="font-mono text-lg font-medium text-negative">{formatCurrency(totalIOwe)}</p>
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
              {members.map(member => {
                const items = getFilteredInvoice(member.id);
                const totals = getTotals(items);
                const net = totals["BRL"]?.net || 0;
                const isExpanded = expandedMembers.has(member.id);
                const groupedItems = getGroupedItems(member.id);

                if (items.length === 0 && activeTab !== "HISTORY") {
                  return null;
                }

                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-border overflow-hidden"
                  >
                    {/* Member Header */}
                    <div
                      className="p-5 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleMemberExpand(member.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-foreground/80 to-foreground text-background flex items-center justify-center font-medium">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="font-display font-semibold text-lg">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {items.filter(i => !i.isPaid).length} {items.filter(i => !i.isPaid).length === 1 ? "item" : "itens"} pendentes
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={cn(
                              "font-mono font-semibold text-lg",
                              net === 0 ? "text-muted-foreground" : net > 0 ? "text-positive" : "text-negative"
                            )}>
                              {net >= 0 ? "+" : ""}{formatCurrency(net)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {net === 0 ? "em dia" : net > 0 ? "a receber" : "a pagar"}
                            </p>
                          </div>
                          {net !== 0 && activeTab !== "HISTORY" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSettleDialog(
                                  member.id,
                                  net > 0 ? "RECEIVE" : "PAY",
                                  Math.abs(net)
                                );
                              }}
                            >
                              <Wallet className="h-4 w-4 mr-2" />
                              Acertar
                            </Button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Items */}
                    {isExpanded && items.length > 0 && (
                      <div className="border-t border-border">
                        {Object.entries(groupedItems).map(([tripKey, group]) => (
                          <div key={tripKey}>
                            {/* Trip Header (if applicable) */}
                            {group.tripName && (
                              <div className="px-5 py-2 bg-muted/50 border-b border-border">
                                <div className="flex items-center gap-2">
                                  <Plane className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">{group.tripName}</span>
                                </div>
                              </div>
                            )}

                            {/* Items */}
                            <div className="divide-y divide-border">
                              {group.items.map(item => (
                                <div
                                  key={item.id}
                                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/20"
                                >
                                  <div className="flex items-center gap-3">
                                    {item.isPaid ? (
                                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        item.type === "CREDIT" ? "bg-positive" : "bg-negative"
                                      )} />
                                    )}
                                    <div>
                                      <p className={cn(
                                        "text-sm font-medium",
                                        item.isPaid && "text-muted-foreground line-through"
                                      )}>
                                        {item.description}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(item.date), "dd MMM yyyy", { locale: ptBR })}
                                        {item.totalInstallments && item.totalInstallments > 1 && (
                                          <> · {item.installmentNumber}/{item.totalInstallments}</>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "font-mono text-sm",
                                      item.isPaid
                                        ? "text-muted-foreground"
                                        : item.type === "CREDIT" ? "text-positive" : "text-negative"
                                    )}>
                                      {item.type === "CREDIT" ? "+" : "-"}{formatCurrency(item.amount)}
                                    </span>
                                    {item.isPaid && activeTab === "HISTORY" && (
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
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settle Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acertar Conta</DialogTitle>
            <DialogDescription>
              Selecione os itens para acertar ou acerte o saldo total
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="py-4 space-y-6">
              {/* Visual representation */}
              <div className="flex items-center justify-center gap-6 p-4 bg-muted/50 rounded-xl">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-medium mx-auto">
                    {settleType === "PAY" ? "EU" : getInitials(members.find(m => m.id === selectedMember)?.name || "")}
                  </div>
                  <p className="text-sm mt-2">{settleType === "PAY" ? "Eu" : members.find(m => m.id === selectedMember)?.name}</p>
                </div>
                <div className="text-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <p className="font-mono font-semibold mt-1">
                    {formatCurrency(parseFloat(settleAmount.replace(".", "").replace(",", ".")) || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center font-medium mx-auto">
                    {settleType === "RECEIVE" ? "EU" : getInitials(members.find(m => m.id === selectedMember)?.name || "")}
                  </div>
                  <p className="text-sm mt-2">{settleType === "RECEIVE" ? "Eu" : members.find(m => m.id === selectedMember)?.name}</p>
                </div>
              </div>

              {/* Items selection */}
              {pendingMemberItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Selecionar itens para acertar</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs h-7"
                    >
                      {selectedItems.length === pendingMemberItems.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {pendingMemberItems.map(item => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <span className="flex-1 text-sm truncate">{item.description}</span>
                        <span className={cn(
                          "font-mono text-xs",
                          item.type === "CREDIT" ? "text-positive" : "text-negative"
                        )}>
                          {formatCurrency(item.amount)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedItems.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Total selecionado: {formatCurrency(Math.abs(getSelectedTotal()))}
                    </p>
                  )}
                </div>
              )}

              {/* Amount and account */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Valor do acerto</Label>
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
                    className="font-mono text-lg"
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você pode alterar o valor para fazer um acerto parcial
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={settleAccountId} onValueChange={setSettleAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.type !== "CREDIT_CARD").map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSettle}
              disabled={isSettling || !settleAccountId}
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Acerto
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
    </div>
  );
}