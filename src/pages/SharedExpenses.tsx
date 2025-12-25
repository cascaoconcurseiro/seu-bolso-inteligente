import { useState } from "react";
import { CurrencyDisplay } from "@/components/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  ArrowRight,
  Check,
  Plus,
  History,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mock
const mockPeople = [
  { id: "eu", name: "Eu", initials: "EU", color: "bg-primary" },
  { id: "ana", name: "Ana", initials: "AN", color: "bg-accent" },
  { id: "carlos", name: "Carlos", initials: "CA", color: "bg-warning" },
];

const mockBalances = [
  { from: "ana", to: "eu", amount: 125.50 },
  { from: "eu", to: "carlos", amount: 87.30 },
];

const mockSharedExpenses = [
  {
    id: "1",
    description: "Conta de Luz",
    totalValue: 187.30,
    date: new Date(2025, 11, 15),
    paidBy: "eu",
    splitWith: ["ana", "carlos"],
    settled: false,
  },
  {
    id: "2",
    description: "Supermercado",
    totalValue: 342.50,
    date: new Date(2025, 11, 20),
    paidBy: "ana",
    splitWith: ["eu", "carlos"],
    settled: false,
  },
  {
    id: "3",
    description: "Internet",
    totalValue: 120.00,
    date: new Date(2025, 11, 10),
    paidBy: "carlos",
    splitWith: ["eu", "ana"],
    settled: true,
  },
];

export function SharedExpenses() {
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<typeof mockBalances[0] | null>(null);

  const getPersonById = (id: string) => mockPeople.find((p) => p.id === id);

  const openSettleDialog = (balance: typeof mockBalances[0]) => {
    setSelectedBalance(balance);
    setShowSettleDialog(true);
  };

  const totalOwedToMe = mockBalances
    .filter((b) => b.to === "eu")
    .reduce((sum, b) => sum + b.amount, 0);

  const totalIOwe = mockBalances
    .filter((b) => b.from === "eu")
    .reduce((sum, b) => sum + b.amount, 0);

  const myBalance = totalOwedToMe - totalIOwe;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-foreground">
            Compartilhados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie despesas divididas com a família
          </p>
        </div>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nova Despesa Compartilhada
        </Button>
      </header>

      {/* Resumo */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Meu Saldo</p>
          <CurrencyDisplay 
            value={myBalance} 
            size="xl" 
            showSign 
            className={myBalance >= 0 ? "text-positive" : "text-negative"} 
          />
          <p className="text-xs text-muted-foreground mt-2">
            {myBalance >= 0 ? "A receber" : "A pagar"}
          </p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm card-status-success">
          <p className="text-sm text-muted-foreground mb-1">Me Devem</p>
          <CurrencyDisplay value={totalOwedToMe} size="lg" className="text-positive" />
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm card-status-danger">
          <p className="text-sm text-muted-foreground mb-1">Eu Devo</p>
          <CurrencyDisplay value={totalIOwe} size="lg" className="text-negative" />
        </div>
      </section>

      {/* Quem deve pra quem */}
      <section className="space-y-4">
        <h2 className="font-display font-medium text-lg text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Quem Deve Pra Quem
        </h2>

        {mockBalances.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center">
            <Check className="h-12 w-12 text-positive mx-auto mb-3" />
            <p className="text-foreground font-medium">Tudo acertado!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Não há pendências entre os membros da família
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockBalances.map((balance, index) => {
              const fromPerson = getPersonById(balance.from);
              const toPerson = getPersonById(balance.to);
              if (!fromPerson || !toPerson) return null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-card rounded-xl shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {/* From */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                        fromPerson.color
                      )}>
                        {fromPerson.initials}
                      </div>
                      <span className="font-medium text-foreground">{fromPerson.name}</span>
                    </div>

                    <ArrowRight className="h-5 w-5 text-muted-foreground" />

                    {/* To */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                        toPerson.color
                      )}>
                        {toPerson.initials}
                      </div>
                      <span className="font-medium text-foreground">{toPerson.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <CurrencyDisplay value={balance.amount} size="lg" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openSettleDialog(balance)}
                    >
                      Acertar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Despesas Compartilhadas Recentes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-lg text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Despesas Compartilhadas
          </h2>
          <Button variant="ghost" size="sm">Ver todas</Button>
        </div>

        <div className="space-y-3">
          {mockSharedExpenses.map((expense) => {
            const paidByPerson = getPersonById(expense.paidBy);
            const splitCount = expense.splitWith.length + 1;
            const perPerson = expense.totalValue / splitCount;

            return (
              <div
                key={expense.id}
                className={cn(
                  "p-4 bg-card rounded-xl shadow-sm transition-all",
                  expense.settled && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{expense.description}</p>
                      {expense.settled && (
                        <Badge variant="success" className="gap-1">
                          <Check className="h-3 w-3" />
                          Acertado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pago por <span className="font-medium">{paidByPerson?.name}</span>
                      {" • "}
                      {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(expense.date)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {[expense.paidBy, ...expense.splitWith].map((personId) => {
                          const person = getPersonById(personId);
                          return (
                            <div
                              key={personId}
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-card",
                                person?.color
                              )}
                              title={person?.name}
                            >
                              {person?.initials}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {splitCount} pessoas • <CurrencyDisplay value={perPerson} size="sm" /> cada
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay value={expense.totalValue} size="md" />
                    <p className="text-xs text-muted-foreground mt-1">Total</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dialog de Acerto */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acertar Conta</DialogTitle>
            <DialogDescription>
              Registre o pagamento entre os membros
            </DialogDescription>
          </DialogHeader>
          {selectedBalance && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-medium mx-auto",
                    getPersonById(selectedBalance.from)?.color
                  )}>
                    {getPersonById(selectedBalance.from)?.initials}
                  </div>
                  <p className="text-sm font-medium mt-2">{getPersonById(selectedBalance.from)?.name}</p>
                </div>
                <div className="text-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <CurrencyDisplay value={selectedBalance.amount} size="lg" className="mt-1" />
                </div>
                <div className="text-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-medium mx-auto",
                    getPersonById(selectedBalance.to)?.color
                  )}>
                    {getPersonById(selectedBalance.to)?.initials}
                  </div>
                  <p className="text-sm font-medium mt-2">{getPersonById(selectedBalance.to)?.name}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor a acertar</Label>
                <Input 
                  type="text" 
                  defaultValue={selectedBalance.amount.toFixed(2).replace(".", ",")} 
                  className="font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowSettleDialog(false)}>
              Confirmar Acerto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}