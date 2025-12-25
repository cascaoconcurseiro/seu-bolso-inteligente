import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CreditCard,
  Plus,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, cardBrands, getBankById } from "@/lib/banks";
import { BankIcon, CardBrandIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type CardView = "list" | "detail";

interface CreditCardAccount {
  id: string;
  name: string;
  bank_id: string | null;
  credit_limit: number | null;
  balance: number;
  closing_day: number | null;
  due_day: number | null;
}

export function CreditCards() {
  const [view, setView] = useState<CardView>("list");
  const [selectedCard, setSelectedCard] = useState<CreditCardAccount | null>(null);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);
  
  // Form state
  const [newBankId, setNewBankId] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newLastDigits, setNewLastDigits] = useState("");
  const [newClosingDay, setNewClosingDay] = useState("");
  const [newDueDay, setNewDueDay] = useState("");
  const [newLimit, setNewLimit] = useState("");

  const { data: accounts = [], isLoading } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const createAccount = useCreateAccount();

  // Filter credit cards
  const creditCards = accounts.filter(acc => acc.type === "CREDIT_CARD") as CreditCardAccount[];

  // Get transactions for a specific card
  const getCardTransactions = (cardId: string) => {
    return transactions.filter(t => t.account_id === cardId && t.type === "EXPENSE");
  };

  // Calculate current invoice
  const getCardInvoice = (card: CreditCardAccount) => {
    const cardTransactions = getCardTransactions(card.id);
    const total = cardTransactions.reduce((sum, t) => sum + t.amount, 0);
    const dueDate = card.due_day 
      ? new Date(new Date().getFullYear(), new Date().getMonth(), card.due_day)
      : new Date();
    
    if (dueDate < new Date()) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    return { value: total, dueDate };
  };

  // Get installments for a card
  const getCardInstallments = (cardId: string) => {
    return transactions.filter(
      t => t.account_id === cardId && t.is_installment && t.total_installments
    ).map(t => ({
      id: t.id,
      description: t.description,
      current: t.current_installment || 1,
      total: t.total_installments || 1,
      value: t.amount,
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openCardDetail = (card: CreditCardAccount) => {
    setSelectedCard(card);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedCard(null);
  };

  const handleCreateCard = async () => {
    const bank = getBankById(newBankId);
    await createAccount.mutateAsync({
      name: `${bank.name} •••• ${newLastDigits}`,
      type: "CREDIT_CARD",
      bank_id: newBankId,
      credit_limit: parseFloat(newLimit) || 0,
      closing_day: parseInt(newClosingDay) || null,
      due_day: parseInt(newDueDay) || null,
    });
    setShowNewCardDialog(false);
    setNewBankId("");
    setNewBrand("");
    setNewLastDigits("");
    setNewClosingDay("");
    setNewDueDay("");
    setNewLimit("");
  };

  const totalInvoices = creditCards.reduce((sum, card) => sum + getCardInvoice(card).value, 0);
  const nextDueDate = creditCards.length > 0 
    ? Math.min(...creditCards.map(card => getDaysUntilDue(getCardInvoice(card).dueDate)))
    : 0;

  // Loading state
  if (isLoading) {
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

  // Detail View
  if (view === "detail" && selectedCard) {
    const invoice = getCardInvoice(selectedCard);
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);
    const usagePercent = selectedCard.credit_limit 
      ? (invoice.value / selectedCard.credit_limit) * 100 
      : 0;
    const bank = getBankById(selectedCard.bank_id);
    const installments = getCardInstallments(selectedCard.id);

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goBack} 
            className="rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <BankIcon bankId={selectedCard.bank_id} size="lg" />
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>
              <p className="text-muted-foreground">{bank.name}</p>
            </div>
          </div>
        </div>

        {/* Current Invoice */}
        <div 
          className="p-6 rounded-2xl text-white transition-all hover:shadow-lg hover:scale-[1.01]"
          style={{ backgroundColor: bank.color }}
        >
          <p className="text-sm opacity-80 mb-1">Fatura Atual</p>
          <p className="font-display font-bold text-4xl tracking-tight">
            {formatCurrency(invoice.value)}
          </p>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm opacity-80">
              Vence em {format(invoice.dueDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
              {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
            </span>
          </div>
        </div>

        {/* Limit Usage */}
        {selectedCard.credit_limit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Limite utilizado</span>
              <span className="font-mono">{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(usagePercent, 100)}%`,
                  backgroundColor: usagePercent > 80 
                    ? 'hsl(var(--negative))' 
                    : usagePercent > 50 
                      ? 'hsl(var(--warning))' 
                      : bank.color 
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatCurrency(invoice.value)} usado</span>
              <span>{formatCurrency(selectedCard.credit_limit)} limite</span>
            </div>
          </div>
        )}

        {/* Installments */}
        {installments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Parcelas ativas ({installments.length})
            </h2>
            <div className="space-y-3">
              {installments.map((inst) => (
                <div 
                  key={inst.id} 
                  className="p-4 rounded-xl border border-border transition-all duration-200 hover:border-foreground/20 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">{inst.description}</p>
                    <span className="font-mono text-sm">{formatCurrency(inst.value)}/mês</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(inst.current / inst.total) * 100}%`,
                          backgroundColor: bank.color 
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {inst.current}/{inst.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Info */}
        <div className="p-4 rounded-xl border border-border transition-all hover:border-foreground/20">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Informações</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fechamento</p>
              <p className="font-medium">Dia {selectedCard.closing_day || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Vencimento</p>
              <p className="font-medium">Dia {selectedCard.due_day || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (creditCards.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">Cartões</h1>
            <p className="text-muted-foreground mt-1">Gerencie faturas e parcelas</p>
          </div>
        </div>

        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Nenhum cartão cadastrado</h3>
          <p className="text-muted-foreground mb-6">Adicione seu primeiro cartão de crédito</p>
          <Button onClick={() => setShowNewCardDialog(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Novo cartão
          </Button>
        </div>

        <NewCardDialog
          open={showNewCardDialog}
          onOpenChange={setShowNewCardDialog}
          onSubmit={handleCreateCard}
          isLoading={createAccount.isPending}
          bankId={newBankId}
          setBankId={setNewBankId}
          brand={newBrand}
          setBrand={setNewBrand}
          lastDigits={newLastDigits}
          setLastDigits={setNewLastDigits}
          closingDay={newClosingDay}
          setClosingDay={setNewClosingDay}
          dueDay={newDueDay}
          setDueDay={setNewDueDay}
          limit={newLimit}
          setLimit={setNewLimit}
        />
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Cartões</h1>
          <p className="text-muted-foreground mt-1">Gerencie faturas e parcelas</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => setShowNewCardDialog(true)}
          className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
          Novo cartão
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Faturas abertas</p>
          <p className="font-mono text-2xl font-bold">{formatCurrency(totalInvoices)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Próximo venc.</p>
          <p className="font-display text-lg font-semibold">
            {nextDueDate > 0 ? `${nextDueDate} dias` : "Hoje"}
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {creditCards.map((card) => {
          const invoice = getCardInvoice(card);
          const daysUntilDue = getDaysUntilDue(invoice.dueDate);
          const installments = getCardInstallments(card.id);
          
          return (
            <div
              key={card.id}
              onClick={() => openCardDetail(card)}
              className="group p-5 rounded-xl border border-border hover:border-foreground/20 
                         transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BankIcon 
                    bankId={card.bank_id} 
                    size="lg" 
                    className="transition-transform duration-200 group-hover:scale-110" 
                  />
                  <div>
                    <p className="font-display font-semibold text-lg">{card.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getBankById(card.bank_id).name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatCurrency(invoice.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground 
                                           transition-all group-hover:translate-x-1" />
                </div>
              </div>
              
              {installments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{installments.length} parcelas ativas</span>
                  <span className="font-mono">
                    {formatCurrency(installments.reduce((sum, i) => sum + i.value, 0))}/mês
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NewCardDialog
        open={showNewCardDialog}
        onOpenChange={setShowNewCardDialog}
        onSubmit={handleCreateCard}
        isLoading={createAccount.isPending}
        bankId={newBankId}
        setBankId={setNewBankId}
        brand={newBrand}
        setBrand={setNewBrand}
        lastDigits={newLastDigits}
        setLastDigits={setNewLastDigits}
        closingDay={newClosingDay}
        setClosingDay={setNewClosingDay}
        dueDay={newDueDay}
        setDueDay={setNewDueDay}
        limit={newLimit}
        setLimit={setNewLimit}
      />
    </div>
  );
}

// New Card Dialog Component
interface NewCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isLoading: boolean;
  bankId: string;
  setBankId: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  lastDigits: string;
  setLastDigits: (v: string) => void;
  closingDay: string;
  setClosingDay: (v: string) => void;
  dueDay: string;
  setDueDay: (v: string) => void;
  limit: string;
  setLimit: (v: string) => void;
}

function NewCardDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  bankId,
  setBankId,
  brand,
  setBrand,
  lastDigits,
  setLastDigits,
  closingDay,
  setClosingDay,
  dueDay,
  setDueDay,
  limit,
  setLimit,
}: NewCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Cartão</DialogTitle>
          <DialogDescription>Adicione um cartão para acompanhar</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
              <SelectContent>
                {Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: bank.color, color: bank.textColor }}
                      >
                        {bank.icon}
                      </div>
                      {bank.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bandeira</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Selecione a bandeira" /></SelectTrigger>
              <SelectContent>
                {Object.values(cardBrands).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-3 rounded flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: b.color }}
                      >
                        {b.icon}
                      </div>
                      {b.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Últimos 4 dígitos</Label>
            <Input 
              placeholder="0000" 
              maxLength={4} 
              value={lastDigits}
              onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <Input 
                type="number" 
                min={1} 
                max={31} 
                placeholder="20"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input 
                type="number" 
                min={1} 
                max={31} 
                placeholder="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Limite</Label>
            <Input 
              placeholder="10000"
              value={limit}
              onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isLoading || !bankId}>
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
