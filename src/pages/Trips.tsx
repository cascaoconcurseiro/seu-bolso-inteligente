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
  Plane,
  Plus,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data
const mockPeople = [
  { id: "eu", name: "Eu", initials: "EU" },
  { id: "ana", name: "Ana", initials: "AN" },
  { id: "carlos", name: "Carlos", initials: "CA" },
];

const mockTrips = [
  {
    id: "1",
    name: "Férias em Floripa",
    destination: "Florianópolis, SC",
    startDate: new Date(2025, 11, 20),
    endDate: new Date(2025, 11, 27),
    participants: ["eu", "ana", "carlos"],
    totalExpenses: 4850.00,
    status: "active",
    expenses: [
      { id: "e1", description: "Hospedagem Airbnb", value: 2100, paidBy: "eu", date: new Date(2025, 11, 20) },
      { id: "e2", description: "Restaurante Ostradamus", value: 450, paidBy: "ana", date: new Date(2025, 11, 21) },
      { id: "e3", description: "Passeio de barco", value: 600, paidBy: "carlos", date: new Date(2025, 11, 22) },
      { id: "e4", description: "Supermercado", value: 320, paidBy: "eu", date: new Date(2025, 11, 23) },
    ],
  },
  {
    id: "2",
    name: "Final de Semana em Campos",
    destination: "Campos do Jordão, SP",
    startDate: new Date(2025, 10, 15),
    endDate: new Date(2025, 10, 17),
    participants: ["eu", "ana"],
    totalExpenses: 1580.00,
    status: "completed",
    expenses: [],
  },
];

type TripView = "list" | "detail";

export function Trips() {
  const [view, setView] = useState<TripView>("list");
  const [selectedTrip, setSelectedTrip] = useState<typeof mockTrips[0] | null>(null);
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getPersonById = (id: string) => mockPeople.find((p) => p.id === id);

  const openTripDetail = (trip: typeof mockTrips[0]) => {
    setSelectedTrip(trip);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedTrip(null);
  };

  const calculateBalances = (trip: typeof mockTrips[0]) => {
    const perPerson = trip.totalExpenses / trip.participants.length;
    const paid: Record<string, number> = {};
    trip.participants.forEach((p) => { paid[p] = 0; });
    trip.expenses.forEach((e) => { paid[e.paidBy] = (paid[e.paidBy] || 0) + e.value; });
    return trip.participants.map((p) => ({
      personId: p,
      paid: paid[p] || 0,
      owes: perPerson,
      balance: (paid[p] || 0) - perPerson,
    }));
  };

  // Detail View
  if (view === "detail" && selectedTrip) {
    const balances = calculateBalances(selectedTrip);

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-2xl tracking-tight">{selectedTrip.name}</h1>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                selectedTrip.status === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              )}>
                {selectedTrip.status === "active" ? "Em andamento" : "Finalizada"}
              </span>
            </div>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {selectedTrip.destination}
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-8 py-4 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total</p>
            <p className="font-mono text-2xl font-bold">{formatCurrency(selectedTrip.totalExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Por pessoa</p>
            <p className="font-mono text-lg font-medium">
              {formatCurrency(selectedTrip.totalExpenses / selectedTrip.participants.length)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Período</p>
            <p className="text-sm">
              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(selectedTrip.startDate)}
              {" - "}
              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(selectedTrip.endDate)}
            </p>
          </div>
        </div>

        {/* Balances */}
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Saldo por pessoa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {balances.map((balance) => {
              const person = getPersonById(balance.personId);
              if (!person) return null;
              return (
                <div key={balance.personId} className="p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                      {person.initials}
                    </div>
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">Pagou {formatCurrency(balance.paid)}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Saldo</span>
                    <span className={cn(
                      "font-mono font-semibold",
                      balance.balance >= 0 ? "text-positive" : "text-negative"
                    )}>
                      {balance.balance >= 0 ? "+" : ""}{formatCurrency(balance.balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Expenses */}
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Despesas</h2>
          <div className="space-y-2">
            {selectedTrip.expenses.map((expense) => {
              const paidBy = getPersonById(expense.paidBy);
              return (
                <div key={expense.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {paidBy?.initials}
                    </div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {paidBy?.name} · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(expense.date)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-medium">{formatCurrency(expense.value)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Viagens</h1>
          <p className="text-muted-foreground mt-1">Organize despesas de viagem</p>
        </div>
        <Button size="lg" onClick={() => setShowNewTripDialog(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Nova viagem
        </Button>
      </div>

      {/* Trips List */}
      <div className="space-y-3">
        {mockTrips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => openTripDetail(trip)}
            className="group p-5 rounded-xl border border-border hover:border-foreground/20 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display font-semibold text-lg">{trip.name}</h3>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    trip.status === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  )}>
                    {trip.status === "active" ? "Em andamento" : "Finalizada"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {trip.destination}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(trip.startDate)}
                    {" - "}
                    {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(trip.endDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex -space-x-1">
                      {trip.participants.map((personId) => {
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
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono font-semibold">{formatCurrency(trip.totalExpenses)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Trip Dialog */}
      <Dialog open={showNewTripDialog} onOpenChange={setShowNewTripDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Viagem</DialogTitle>
            <DialogDescription>Crie uma viagem para organizar despesas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Férias de Verão" />
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Input placeholder="Ex: Rio de Janeiro, RJ" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTripDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowNewTripDialog(false)}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
