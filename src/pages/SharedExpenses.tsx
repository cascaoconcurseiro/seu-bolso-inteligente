import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  ArrowRight,
  Check,
  Plus,
  Plane,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useTransactions, useCreateTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useSharedFinances, InvoiceItem } from "@/hooks/useSharedFinances";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

type SharedTab = "REGULAR" | "TRAVEL" | "HISTORY";

export function SharedExpenses() {
  const [activeTab, setActiveTab] = useState<SharedTab>("REGULAR");
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [settleType, setSettleType] = useState<"PAY" | "RECEIVE">("PAY");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");

  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: accounts = [] } = useAccounts();
  const createTransaction = useCreateTransaction();
  
  const { getFilteredInvoice, getTotals, getSummary, isLoading: sharedLoading, refetch } = useSharedFinances({
    currentDate: new Date(),
    activeTab,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const openSettleDialog = (memberId: string, type: "PAY" | "RECEIVE", amount: number) => {
    setSelectedMember(memberId);
    setSettleType(type);
    setSettleAmount(amount.toFixed(2));
    setShowSettleDialog(true);
  };

  const handleSettle = async () => {
    if (!selectedMember || !settleAccountId) return;

    try {
      const member = members.find(m => m.id === selectedMember);
      const desc = settleType === "PAY"
        ? `Pagamento Acerto - ${member?.name}`
        : `Recebimento Acerto - ${member?.name}`;

      await createTransaction.mutateAsync({
        amount: parseFloat(settleAmount),
        description: desc,
        date: new Date().toISOString().split("T")[0],
        type: settleType === "PAY" ? "EXPENSE" : "INCOME",
        account_id: settleAccountId,
        domain: "SHARED",
        is_shared: false,
        related_member_id: selectedMember,
      });

      // Mark splits/transactions as settled
      const items = getFilteredInvoice(selectedMember);
      for (const item of items.filter(i => !i.isPaid)) {
        if (item.type === 'CREDIT' && item.splitId) {
          await supabase
            .from('transaction_splits')
            .update({ is_settled: true, settled_at: new Date().toISOString() })
            .eq('id', item.splitId);
        } else if (item.type === 'DEBIT') {
          await supabase
            .from('transactions')
            .update({ is_settled: true, settled_at: new Date().toISOString() })
            .eq('id', item.originalTxId);
        }
      }

      setShowSettleDialog(false);
      setSelectedMember(null);
      setSettleAmount("");
      setSettleAccountId("");
      refetch();
    } catch (error) {
      console.error('Settlement error:', error);
    }
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

  if (membersLoading) {
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Compartilhados</h1>
          <p className="text-muted-foreground mt-1">Despesas divididas</p>
        </div>
        <Button size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nova despesa
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Meu saldo</p>
          <p className={cn(
            "font-mono text-2xl font-bold",
            myBalance >= 0 ? "text-positive" : "text-negative"
          )}>
            {myBalance >= 0 ? "+" : ""}{formatCurrency(myBalance)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Me devem</p>
          <p className="font-mono text-lg font-medium text-positive">{formatCurrency(totalOwedToMe)}</p>
        </div>
        <div>
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
            </div>
          ) : (
            <div className="space-y-4">
              {members.map(member => {
                const items = getFilteredInvoice(member.id);
                const totals = getTotals(items);
                const net = totals["BRL"]?.net || 0;
                const credits = totals["BRL"]?.credits || 0;
                const debits = totals["BRL"]?.debits || 0;

                if (items.length === 0 && activeTab !== "HISTORY") {
                  return null;
                }

                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-foreground/80 to-foreground text-background flex items-center justify-center font-medium">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-lg">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {items.length} {items.length === 1 ? "item" : "itens"} pendentes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn(
                            "font-mono font-semibold text-lg",
                            net >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {net >= 0 ? "+" : ""}{formatCurrency(net)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {net >= 0 ? "a receber" : "a pagar"}
                          </p>
                        </div>
                        {net !== 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openSettleDialog(
                              member.id, 
                              net > 0 ? "RECEIVE" : "PAY",
                              Math.abs(net)
                            )}
                          >
                            Acertar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Items list */}
                    {items.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        {items.slice(0, 5).map(item => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between py-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                item.type === "CREDIT" ? "bg-positive" : "bg-negative"
                              )} />
                              <div>
                                <p className="text-sm font-medium">{item.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(item.date), "dd MMM", { locale: ptBR })}
                                  {item.totalInstallments && item.totalInstallments > 1 && (
                                    <> · {item.installmentNumber}/{item.totalInstallments}</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className={cn(
                              "font-mono text-sm",
                              item.type === "CREDIT" ? "text-positive" : "text-negative"
                            )}>
                              {item.type === "CREDIT" ? "+" : "-"}{formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                        {items.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-2">
                            + {items.length - 5} itens
                          </p>
                        )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acertar Conta</DialogTitle>
            <DialogDescription>Registre o pagamento</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="py-6">
              <div className="flex items-center justify-center gap-6 p-4 bg-muted/50 rounded-xl">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-medium mx-auto">
                    {settleType === "PAY" ? "EU" : getInitials(members.find(m => m.id === selectedMember)?.name || "")}
                  </div>
                  <p className="text-sm mt-2">{settleType === "PAY" ? "Eu" : members.find(m => m.id === selectedMember)?.name}</p>
                </div>
                <div className="text-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <p className="font-mono font-semibold mt-1">{formatCurrency(parseFloat(settleAmount) || 0)}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center font-medium mx-auto">
                    {settleType === "RECEIVE" ? "EU" : getInitials(members.find(m => m.id === selectedMember)?.name || "")}
                  </div>
                  <p className="text-sm mt-2">{settleType === "RECEIVE" ? "Eu" : members.find(m => m.id === selectedMember)?.name}</p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input 
                    type="text" 
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={settleAccountId} onValueChange={setSettleAccountId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleSettle}
              disabled={createTransaction.isPending || !settleAccountId}
            >
              {createTransaction.isPending ? "Confirmando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
