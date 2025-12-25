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
import { getBankByName, cardBrands, banks } from "@/lib/banks";

// Mock data
const mockCards = [
  {
    id: "1",
    name: "Nubank",
    lastDigits: "4532",
    brand: "mastercard",
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
    brand: "visa",
    limit: 8000,
    used: 890.00,
    dueDay: 5,
    closingDay: 28,
    currentInvoice: { value: 890.00, dueDate: new Date(2026, 0, 5) },
    installments: [
      { id: "i3", description: "Notebook Dell", current: 2, total: 6, value: 450.00 },
    ],
  },
  {
    id: "3",
    name: "Itaú",
    lastDigits: "3344",
    brand: "visa",
    limit: 25000,
    used: 8750.00,
    dueDay: 10,
    closingDay: 3,
    currentInvoice: { value: 4200.00, dueDate: new Date(2026, 0, 10) },
    installments: [],
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
    const bankConfig = getBankByName(selectedCard.name);
    const brandConfig = cardBrands[selectedCard.brand];

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
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
              style={{ backgroundColor: bankConfig.color }}
            >
              {bankConfig.logoUrl ? (
                <img 
                  src={bankConfig.logoUrl} 
                  alt={bankConfig.name} 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <CreditCard className={cn("h-6 w-6 text-white", bankConfig.logoUrl && "hidden")} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">•••• {selectedCard.lastDigits}</p>
                {brandConfig && (
                  <img 
                    src={brandConfig.logoUrl} 
                    alt={brandConfig.name}
                    className="h-4 object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Current Invoice */}
        <div 
          className="p-6 rounded-2xl text-white transition-all hover:shadow-lg hover:scale-[1.01]"
          style={{ backgroundColor: bankConfig.color }}
        >
          <p className="text-sm opacity-80 mb-1">Fatura Atual</p>
          <p className="font-display font-bold text-4xl tracking-tight">
            {formatCurrency(selectedCard.currentInvoice.value)}
          </p>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm opacity-80">
              Vence em {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(selectedCard.currentInvoice.dueDate)}
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
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
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${usagePercent}%`,
                backgroundColor: usagePercent > 80 
                  ? 'hsl(var(--negative))' 
                  : usagePercent > 50 
                    ? 'hsl(var(--warning))' 
                    : bankConfig.color 
              }}
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
                          backgroundColor: bankConfig.color 
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
            {getDaysUntilDue(mockCards[0].currentInvoice.dueDate)} dias
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {mockCards.map((card) => {
          const daysUntilDue = getDaysUntilDue(card.currentInvoice.dueDate);
          const bankConfig = getBankByName(card.name);
          const brandConfig = cardBrands[card.brand];
          
          return (
            <div
              key={card.id}
              onClick={() => openCardDetail(card)}
              className="group p-5 rounded-xl border border-border hover:border-foreground/20 
                         transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden
                               transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: bankConfig.color }}
                  >
                    {bankConfig.logoUrl ? (
                      <img 
                        src={bankConfig.logoUrl} 
                        alt={bankConfig.name} 
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <CreditCard className={cn("h-6 w-6 text-white", bankConfig.logoUrl && "hidden")} />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg">{card.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                      {brandConfig && (
                        <img 
                          src={brandConfig.logoUrl} 
                          alt={brandConfig.name}
                          className="h-3 object-contain opacity-70"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatCurrency(card.currentInvoice.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {daysUntilDue > 0 ? `${daysUntilDue} dias` : "Vencida"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground 
                                           transition-all group-hover:translate-x-1" />
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
              <Label>Banco</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                <SelectContent>
                  {Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: bank.color }}
                        >
                          {bank.logoUrl && (
                            <img src={bank.logoUrl} alt={bank.name} className="w-4 h-4 object-contain" />
                          )}
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
              <Select>
                <SelectTrigger><SelectValue placeholder="Selecione a bandeira" /></SelectTrigger>
                <SelectContent>
                  {Object.values(cardBrands).map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center gap-2">
                        <img src={brand.logoUrl} alt={brand.name} className="h-4 object-contain" />
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
