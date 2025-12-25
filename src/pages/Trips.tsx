import { useState } from "react";
import { CurrencyDisplay } from "@/components/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Receipt,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mock
const mockPeople = [
  { id: "eu", name: "Eu", initials: "EU", color: "bg-primary" },
  { id: "ana", name: "Ana", initials: "AN", color: "bg-accent" },
  { id: "carlos", name: "Carlos", initials: "CA", color: "bg-warning" },
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
      { id: "e5", description: "Gasolina", value: 280, paidBy: "ana", date: new Date(2025, 11, 24) },
      { id: "e6", description: "Praia Mole - Almoço", value: 180, paidBy: "carlos", date: new Date(2025, 11, 25) },
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
    
    trip.participants.forEach((p) => {
      paid[p] = 0;
    });
    
    trip.expenses.forEach((e) => {
      paid[e.paidBy] = (paid[e.paidBy] || 0) + e.value;
    });

    return trip.participants.map((p) => ({
      personId: p,
      paid: paid[p] || 0,
      owes: perPerson,
      balance: (paid[p] || 0) - perPerson,
    }));
  };

  if (view === "detail" && selectedTrip) {
    const balances = calculateBalances(selectedTrip);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-2xl text-foreground">
                {selectedTrip.name}
              </h1>
              <Badge variant={selectedTrip.status === "active" ? "default" : "muted"}>
                {selectedTrip.status === "active" ? "Em andamento" : "Finalizada"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {selectedTrip.destination}
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </header>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Total de Gastos</p>
            <CurrencyDisplay value={selectedTrip.totalExpenses} size="xl" />
          </div>
          <div className="bg-card rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Por Pessoa</p>
            <CurrencyDisplay 
              value={selectedTrip.totalExpenses / selectedTrip.participants.length} 
              size="xl" 
            />
          </div>
          <div className="bg-card rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Período</p>
            <p className="text-xl font-display font-semibold text-foreground">
              {selectedTrip.participants.length} dias
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(selectedTrip.startDate)}
              {" - "}
              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(selectedTrip.endDate)}
            </p>
          </div>
        </div>

        {/* Saldo por Participante */}
        <section className="space-y-4">
          <h2 className="font-display font-medium text-lg text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Saldo por Participante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map((balance) => {
              const person = getPersonById(balance.personId);
              if (!person) return null;

              return (
                <div key={balance.personId} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                      person.color
                    )}>
                      {person.initials}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{person.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pagou: <CurrencyDisplay value={balance.paid} size="sm" />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">Saldo</span>
                    <CurrencyDisplay value={balance.balance} size="md" showSign showIcon />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Despesas */}
        <section className="space-y-4">
          <h2 className="font-display font-medium text-lg text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Despesas da Viagem
          </h2>
          <div className="space-y-2">
            {selectedTrip.expenses.map((expense) => {
              const paidBy = getPersonById(expense.paidBy);
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                      paidBy?.color
                    )}>
                      {paidBy?.initials}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {paidBy?.name} • {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(expense.date)}
                      </p>
                    </div>
                  </div>
                  <CurrencyDisplay value={expense.value} size="md" />
                </div>
              );
            })}
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
            Viagens
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize despesas de viagens em família
          </p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setShowNewTripDialog(true)}>
          <Plus className="h-5 w-5" />
          Nova Viagem
        </Button>
      </header>

      {/* Lista de Viagens */}
      <section className="space-y-4">
        {mockTrips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => openTripDetail(trip)}
            className="bg-card rounded-xl p-5 shadow-sm cursor-pointer transition-all hover:shadow-md group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold text-lg text-foreground">
                    {trip.name}
                  </h3>
                  <Badge variant={trip.status === "active" ? "default" : "muted"}>
                    {trip.status === "active" ? "Em andamento" : "Finalizada"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
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
                    <div className="flex -space-x-2">
                      {trip.participants.map((personId) => {
                        const person = getPersonById(personId);
                        return (
                          <div
                            key={personId}
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-card",
                              person?.color
                            )}
                          >
                            {person?.initials}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <CurrencyDisplay value={trip.totalExpenses} size="lg" />
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Dialog Nova Viagem */}
      <Dialog open={showNewTripDialog} onOpenChange={setShowNewTripDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Viagem</DialogTitle>
            <DialogDescription>
              Crie uma viagem para organizar as despesas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Viagem</Label>
              <Input placeholder="Ex: Férias de Verão" />
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Input placeholder="Ex: Rio de Janeiro, RJ" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Data de Fim</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="flex flex-wrap gap-2">
                {mockPeople.map((person) => (
                  <Badge 
                    key={person.id} 
                    variant="secondary" 
                    className="gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]",
                      person.color
                    )}>
                      {person.initials}
                    </div>
                    {person.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTripDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowNewTripDialog(false)}>
              Criar Viagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}