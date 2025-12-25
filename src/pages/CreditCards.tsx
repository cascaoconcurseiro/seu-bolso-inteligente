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
  CreditCard,
  Plus,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data
const mockCards = [
  {
    id: "1",
    name: "Nubank",
    lastDigits: "4532",
    limit: 15000,
    used: 3240.50,
    dueDay: 28,
    closingDay: 20,
    currentInvoice: { value: 2340.50, dueDate: new Date(2025, 11, 28) },
    installments: [
      { id: "i1", description: "TV Samsung 55\"", current: 3, total: 12, value: 299.90 },
      { id: "i2", description: "iPhone 15", current: 5, total: 10, value: 899.90 },
    ],
  },
  {
    id: "2",
    name: "Inter",
    lastDigits: "7821",
    limit: 8000,
    used: 890.00,
    dueDay: 5,
    closingDay: 28,
    currentInvoice: { value: 890.00, dueDate: new Date(2026, 0, 5) },
    installments: [
      { id: "i3", description: "Notebook Dell", current: 2, total: 6, value: 450.00 },
    ],
  },
];

type CardView = "list" | "detail";

export function CreditCards() {
  const [view, setView] = useState<CardView>("list");
  const [selectedCard, setSelectedCard] = useState<typeof mockCards[0] | null>(null);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openCardDetail = (card: typeof mockCards[0]) => {
    setSelectedCard(card);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedCard(null);
  };

  const totalInvoices = mockCards.reduce((sum, card) => sum + card.currentInvoice.value, 0);

  // Detail View
  if (view === "detail" && selectedCard) {
    const daysUntilDue = getDaysUntilDue(selectedCard.currentInvoice.dueDate);
    const usagePercent = (selectedCard.used / selectedCard.limit) * 100;

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>
            <p className="text-muted-foreground">•••• {selectedCard.lastDigits}</p>
          </div>
        </div>

        {/* Current Invoice */}
        <div className="p-6 rounded-2xl bg-foreground text-background">
          <p className="text-sm opacity-70 mb-1">Fatura Atual</p>
          <p className="font-display font-bold text-4xl tracking-tight">
            {formatCurrency(selectedCard.currentInvoice.value)}
          </p>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm opacity-70">
              Vence em {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(selectedCard.currentInvoice.dueDate)}
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-background/20">
              {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
            </span>
          </div>
        </div>

        {/* Limit Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Limite utilizado</span>
            <span className="font-mono">{usagePercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent > 80 ? "bg-negative" : usagePercent > 50 ? "bg-warning" : "bg-positive"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatCurrency(selectedCard.used)} usado</span>
            <span>{formatCurrency(selectedCard.limit)} limite</span>
          </div>
        </div>

        {/* Installments */}
        {selectedCard.installments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Parcelas ativas ({selectedCard.installments.length})
            </h2>
            <div className="space-y-3">
              {selectedCard.installments.map((inst) => (
                <div key={inst.id} className="p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">{inst.description}</p>
                    <span className="font-mono text-sm">{formatCurrency(inst.value)}/mês</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-foreground transition-all"
                        style={{ width: `${(inst.current / inst.total) * 100}%` }}
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
        <div className="p-4 rounded-xl border border-border">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Informações</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fechamento</p>
              <p className="font-medium">Dia {selectedCard.closingDay}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Vencimento</p>
              <p className="font-medium">Dia {selectedCard.dueDay}</p>
            </div>
          </div>
        </div>
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
        <Button size="lg" onClick={() => setShowNewCardDialog(true)}>
          <Plus className="h-5 w-5 mr-2" />
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
            {getDaysUntilDue(mockCards[0].currentInvoice.dueDate)} dias
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {mockCards.map((card) => {
          const daysUntilDue = getDaysUntilDue(card.currentInvoice.dueDate);
          
          return (
            <div
              key={card.id}
              onClick={() => openCardDetail(card)}
              className="group p-5 rounded-xl border border-border hover:border-foreground/20 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg">{card.name}</p>
                    <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatCurrency(card.currentInvoice.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
              
              {card.installments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{card.installments.length} parcelas ativas</span>
                  <span className="font-mono">
                    {formatCurrency(card.installments.reduce((sum, i) => sum + i.value, 0))}/mês
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Card Dialog */}
      <Dialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cartão</DialogTitle>
            <DialogDescription>Adicione um cartão para acompanhar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Cartão</Label>
              <Input placeholder="Ex: Nubank, Inter..." />
            </div>
            <div className="space-y-2">
              <Label>Últimos 4 dígitos</Label>
              <Input placeholder="0000" maxLength={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fechamento</Label>
                <Input type="number" min={1} max={31} placeholder="20" />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="number" min={1} max={31} placeholder="28" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite</Label>
              <Input placeholder="R$ 0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCardDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowNewCardDialog(false)}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
