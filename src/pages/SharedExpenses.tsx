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
  Users,
  ArrowRight,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data
const mockPeople = [
  { id: "eu", name: "Eu", initials: "EU" },
  { id: "ana", name: "Ana", initials: "AN" },
  { id: "carlos", name: "Carlos", initials: "CA" },
];

const mockBalances = [
  { from: "ana", to: "eu", amount: 125.50 },
  { from: "eu", to: "carlos", amount: 87.30 },
];

const mockSharedExpenses = [
  { id: "1", description: "Conta de Luz", totalValue: 187.30, date: new Date(2025, 11, 15), paidBy: "eu", splitWith: ["ana", "carlos"], settled: false },
  { id: "2", description: "Supermercado", totalValue: 342.50, date: new Date(2025, 11, 20), paidBy: "ana", splitWith: ["eu", "carlos"], settled: false },
  { id: "3", description: "Internet", totalValue: 120.00, date: new Date(2025, 11, 10), paidBy: "carlos", splitWith: ["eu", "ana"], settled: true },
];

export function SharedExpenses() {
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<typeof mockBalances[0] | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getPersonById = (id: string) => mockPeople.find((p) => p.id === id);

  const openSettleDialog = (balance: typeof mockBalances[0]) => {
    setSelectedBalance(balance);
    setShowSettleDialog(true);
  };

  const totalOwedToMe = mockBalances.filter((b) => b.to === "eu").reduce((sum, b) => sum + b.amount, 0);
  const totalIOwe = mockBalances.filter((b) => b.from === "eu").reduce((sum, b) => sum + b.amount, 0);
  const myBalance = totalOwedToMe - totalIOwe;

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

      {/* Balances */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Quem deve pra quem</h2>
        
        {mockBalances.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <Check className="h-8 w-8 text-positive mx-auto mb-2" />
            <p className="font-medium">Tudo acertado!</p>
            <p className="text-sm text-muted-foreground">Sem pendências</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mockBalances.map((balance, index) => {
              const fromPerson = getPersonById(balance.from);
              const toPerson = getPersonById(balance.to);
              if (!fromPerson || !toPerson) return null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium text-sm">
                        {fromPerson.initials}
                      </div>
                      <span className="font-medium">{fromPerson.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-medium text-sm">
                        {toPerson.initials}
                      </div>
                      <span className="font-medium">{toPerson.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold text-lg">{formatCurrency(balance.amount)}</span>
                    <Button variant="outline" size="sm" onClick={() => openSettleDialog(balance)}>
                      Acertar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Shared Expenses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Despesas recentes</h2>
          <Button variant="ghost" size="sm">Ver todas</Button>
        </div>

        <div className="space-y-2">
          {mockSharedExpenses.map((expense) => {
            const paidBy = getPersonById(expense.paidBy);
            const splitCount = expense.splitWith.length + 1;
            const perPerson = expense.totalValue / splitCount;

            return (
              <div
                key={expense.id}
                className={cn(
                  "p-4 rounded-xl border border-border transition-all",
                  expense.settled && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{expense.description}</p>
                      {expense.settled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-positive/10 text-positive flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Acertado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pago por {paidBy?.name} · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(expense.date)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex -space-x-1">
                        {[expense.paidBy, ...expense.splitWith].map((personId) => {
                          const person = getPersonById(personId);
                          return (
                            <div
                              key={personId}
                              className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[10px] font-medium"
                            >
                              {person?.initials}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {splitCount} pessoas · {formatCurrency(perPerson)} cada
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatCurrency(expense.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Settle Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acertar Conta</DialogTitle>
            <DialogDescription>Registre o pagamento</DialogDescription>
          </DialogHeader>
          {selectedBalance && (
            <div className="py-6">
              <div className="flex items-center justify-center gap-6 p-4 bg-muted/50 rounded-xl">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-medium mx-auto">
                    {getPersonById(selectedBalance.from)?.initials}
                  </div>
                  <p className="text-sm mt-2">{getPersonById(selectedBalance.from)?.name}</p>
                </div>
                <div className="text-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <p className="font-mono font-semibold mt-1">{formatCurrency(selectedBalance.amount)}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center font-medium mx-auto">
                    {getPersonById(selectedBalance.to)?.initials}
                  </div>
                  <p className="text-sm mt-2">{getPersonById(selectedBalance.to)?.name}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Valor</Label>
                <Input 
                  type="text" 
                  defaultValue={selectedBalance.amount.toFixed(2).replace(".", ",")} 
                  className="font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowSettleDialog(false)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
