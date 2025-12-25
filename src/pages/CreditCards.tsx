import { useState } from "react";
import { CurrencyDisplay, InstallmentProgress } from "@/components/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Plus,
  Calendar,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Clock,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mock
const mockCards = [
  {
    id: "1",
    name: "Nubank",
    lastDigits: "4532",
    color: "bg-purple-600",
    limit: 15000,
    used: 3240.50,
    dueDay: 28,
    closingDay: 20,
    currentInvoice: {
      value: 2340.50,
      dueDate: new Date(2025, 11, 28),
      status: "open" as const,
    },
    installments: [
      { id: "i1", description: "TV Samsung 55\"", current: 3, total: 12, value: 299.90, totalValue: 3598.80 },
      { id: "i2", description: "iPhone 15", current: 5, total: 10, value: 899.90, totalValue: 8999.00 },
    ],
  },
  {
    id: "2",
    name: "Inter",
    lastDigits: "7821",
    color: "bg-orange-500",
    limit: 8000,
    used: 890.00,
    dueDay: 5,
    closingDay: 28,
    currentInvoice: {
      value: 890.00,
      dueDate: new Date(2026, 0, 5),
      status: "open" as const,
    },
    installments: [
      { id: "i3", description: "Notebook Dell", current: 2, total: 6, value: 450.00, totalValue: 2700.00 },
    ],
  },
];

type CardView = "list" | "detail";

export function CreditCards() {
  const [view, setView] = useState<CardView>("list");
  const [selectedCard, setSelectedCard] = useState<typeof mockCards[0] | null>(null);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);

  const openCardDetail = (card: typeof mockCards[0]) => {
    setSelectedCard(card);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedCard(null);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const totalInvoices = mockCards.reduce((sum, card) => sum + card.currentInvoice.value, 0);
  const totalInstallments = mockCards.reduce(
    (sum, card) => sum + card.installments.reduce((s, i) => s + (i.total - i.current) * i.value, 0),
    0
  );

  if (view === "detail" && selectedCard) {
    const daysUntilDue = getDaysUntilDue(selectedCard.currentInvoice.dueDate);
    const usagePercent = (selectedCard.used / selectedCard.limit) * 100;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedCard.color
              )}>
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-semibold text-2xl text-foreground">
                  {selectedCard.name}
                </h1>
                <p className="text-muted-foreground">•••• {selectedCard.lastDigits}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Fatura Atual */}
        <section className={cn(
          "rounded-xl p-6 shadow-sm",
          selectedCard.color,
          "text-white"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/80 text-sm">Fatura Atual</p>
              <CurrencyDisplay 
                value={selectedCard.currentInvoice.value} 
                size="xl" 
                className="text-white mt-1" 
              />
              <p className="text-white/80 text-sm mt-2">
                Vence em {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(selectedCard.currentInvoice.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 text-white border-0">
                {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
              </Badge>
              <div className="mt-4">
                <Button variant="secondary" size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0">
                  Pagar Fatura
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Limite */}
        <section className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">Limite Disponível</h3>
            <span className="text-sm text-muted-foreground">{usagePercent.toFixed(0)}% usado</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-muted-foreground">
              Usado: <CurrencyDisplay value={selectedCard.used} size="sm" />
            </span>
            <span className="text-muted-foreground">
              Limite: <CurrencyDisplay value={selectedCard.limit} size="sm" />
            </span>
          </div>
        </section>

        {/* Parcelas Ativas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-medium text-lg text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Parcelas Ativas
            </h2>
            <Badge variant="muted">{selectedCard.installments.length} parcelas</Badge>
          </div>
          <div className="space-y-4">
            {selectedCard.installments.map((installment) => (
              <div key={installment.id} className="bg-card rounded-xl p-5 shadow-sm">
                <InstallmentProgress
                  current={installment.current}
                  total={installment.total}
                  paidAmount={installment.current * installment.value}
                  totalAmount={installment.totalValue}
                  description={installment.description}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Informações do Cartão */}
        <section className="bg-card rounded-xl p-5 shadow-sm">
          <h3 className="font-medium text-foreground mb-4">Informações</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fechamento</p>
              <p className="font-medium text-foreground">Dia {selectedCard.closingDay}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Vencimento</p>
              <p className="font-medium text-foreground">Dia {selectedCard.dueDay}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-foreground">
            Cartões de Crédito
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas faturas e parcelas
          </p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setShowNewCardDialog(true)}>
          <Plus className="h-5 w-5" />
          Novo Cartão
        </Button>
      </header>

      {/* Resumo */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-sm card-status-warning">
          <p className="text-sm text-muted-foreground mb-1">Faturas Abertas</p>
          <CurrencyDisplay value={totalInvoices} size="xl" />
          <p className="text-xs text-muted-foreground mt-2">{mockCards.length} cartões</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Parcelas Restantes</p>
          <CurrencyDisplay value={totalInstallments} size="xl" />
          <p className="text-xs text-muted-foreground mt-2">
            {mockCards.reduce((sum, c) => sum + c.installments.length, 0)} compras parceladas
          </p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Próximo Vencimento</p>
          <p className="text-xl font-display font-semibold text-foreground">
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
              mockCards.reduce((min, c) => 
                c.currentInvoice.dueDate < min ? c.currentInvoice.dueDate : min,
                mockCards[0].currentInvoice.dueDate
              )
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {getDaysUntilDue(mockCards[0].currentInvoice.dueDate)} dias
          </p>
        </div>
      </section>

      {/* Lista de Cartões */}
      <section className="space-y-4">
        <h2 className="font-display font-medium text-lg text-foreground">Meus Cartões</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockCards.map((card) => {
            const daysUntilDue = getDaysUntilDue(card.currentInvoice.dueDate);
            
            return (
              <div
                key={card.id}
                onClick={() => openCardDetail(card)}
                className="bg-card rounded-xl shadow-sm cursor-pointer transition-all hover:shadow-md group overflow-hidden"
              >
                {/* Card Header */}
                <div className={cn("p-5 text-white", card.color)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8" />
                      <div>
                        <h3 className="font-display font-semibold text-lg">{card.name}</h3>
                        <p className="text-white/70 text-sm">•••• {card.lastDigits}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Fatura Atual</p>
                      <CurrencyDisplay value={card.currentInvoice.value} size="lg" />
                    </div>
                    <Badge 
                      variant={daysUntilDue <= 3 ? "warning" : daysUntilDue <= 7 ? "muted" : "success"}
                    >
                      {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
                    </Badge>
                  </div>
                  
                  {card.installments.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Parcelas Ativas</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">
                          {card.installments.length} compra{card.installments.length > 1 ? "s" : ""}
                        </span>
                        <CurrencyDisplay 
                          value={card.installments.reduce((sum, i) => sum + i.value, 0)} 
                          size="sm" 
                          className="text-muted-foreground"
                        />
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dialog Novo Cartão */}
      <Dialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cartão</DialogTitle>
            <DialogDescription>
              Adicione um cartão de crédito para acompanhar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Cartão</Label>
              <Input placeholder="Ex: Nubank, Inter, C6..." />
            </div>
            <div className="space-y-2">
              <Label>Últimos 4 dígitos</Label>
              <Input placeholder="0000" maxLength={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Fechamento</Label>
                <Input type="number" min={1} max={31} placeholder="20" />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input type="number" min={1} max={31} placeholder="28" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite</Label>
              <Input placeholder="R$ 0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCardDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowNewCardDialog(false)}>
              Adicionar Cartão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}