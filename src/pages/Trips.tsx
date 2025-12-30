import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  DollarSign,
  ListChecks,
  Route,
  Trash2,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useTrips, 
  useTrip, 
  useTripParticipants, 
  useTripTransactions,
  useTripFinancialSummary,
  useMyTripSpent,
  useCreateTrip,
  useUpdateTrip,
  useDeleteTrip,
  useAddTripParticipant,
  useRemoveTripParticipant,
} from "@/hooks/useTrips";
import { useFamilyMembers } from "@/hooks/useFamily";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TripShopping } from "@/components/trips/TripShopping";
import { NewTripDialog } from "@/components/trips/NewTripDialog";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useTripMembers, useTripPermissions, useUpdatePersonalBudget } from "@/hooks/useTripMembers";
import { EditTripDialog } from "@/components/trips/EditTripDialog";
import { PersonalBudgetDialog } from "@/components/trips/PersonalBudgetDialog";
import { TripExchange } from "@/components/trips/TripExchange";
import { TripItinerary } from "@/components/trips/TripItinerary";
import { TripChecklist } from "@/components/trips/TripChecklist";
import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Wallet, ArrowRightLeft, User, Coins } from "lucide-react";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

type TripView = "list" | "detail";
type TripTab = "summary" | "expenses" | "shopping" | "exchange" | "itinerary" | "checklist";

export function Trips() {
  const { user } = useAuth();
  const [view, setView] = useState<TripView>("list");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TripTab>("expenses");
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);
  const [showPersonalBudgetDialog, setShowPersonalBudgetDialog] = useState(false);
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  
  // Form state
  const [tripName, setTripName] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripCurrency, setTripCurrency] = useState("BRL");

  const { data: trips = [], isLoading } = useTrips() as { data: import("@/hooks/useTrips").TripWithPersonalBudget[], isLoading: boolean };
  const { data: selectedTrip } = useTrip(selectedTripId);
  const { data: participants = [] } = useTripParticipants(selectedTripId);
  const { data: tripTransactions = [] } = useTripTransactions(selectedTripId);
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: tripMembers = [] } = useTripMembers(selectedTripId);
  const { data: permissions } = useTripPermissions(selectedTripId);
  
  // SINGLE SOURCE OF TRUTH: Usar dados calculados pelo banco de dados
  const { data: tripFinancialSummary } = useTripFinancialSummary(selectedTripId);
  const { data: myTripSpent = 0 } = useMyTripSpent(selectedTripId);
  
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();
  const addParticipant = useAddTripParticipant();
  const removeParticipant = useRemoveTripParticipant();
  const updatePersonalBudget = useUpdatePersonalBudget();

  // Buscar orçamento pessoal do usuário atual
  const myMembership = tripMembers.find(m => m.user_id === user?.id);
  const myPersonalBudget = myMembership?.personal_budget ?? null;

  const formatCurrency = (value: number, currency: string = "BRL") => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const openTripDetail = (tripId: string) => {
    setSelectedTripId(tripId);
    setView("detail");
    setActiveTab("summary");
  };

  const goBack = () => {
    setView("list");
    setSelectedTripId(null);
  };

  const handleCreateTrip = async (selectedMemberIds: string[]) => {
    await createTrip.mutateAsync({
      name: tripName,
      destination: tripDestination || null,
      start_date: tripStartDate,
      end_date: tripEndDate,
      budget: tripBudget ? parseFloat(tripBudget) : null,
      currency: tripCurrency,
      memberIds: selectedMemberIds,
    });
    setShowNewTripDialog(false);
    setTripName("");
    setTripDestination("");
    setTripStartDate("");
    setTripEndDate("");
    setTripBudget("");
    setTripCurrency("BRL");
  };

  const handleAddParticipant = async (memberId: string, name: string) => {
    if (!selectedTripId) return;
    await addParticipant.mutateAsync({
      tripId: selectedTripId,
      memberId: memberId,
      name,
    });
  };

  const handleEditTrip = async (data: {
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    currency: string;
    budget: number;
  }) => {
    if (!selectedTripId) return;
    await updateTrip.mutateAsync({
      id: selectedTripId,
      ...data,
    });
    setShowEditTripDialog(false);
  };

  const handleUpdatePersonalBudget = async (budget: number) => {
    if (!selectedTripId || !user) return;
    await updatePersonalBudget.mutateAsync({
      tripId: selectedTripId,
      userId: user.id,
      personalBudget: budget,
    });
    setShowPersonalBudgetDialog(false);
  };

  const calculateBalances = () => {
    if (!participants.length) return [];
    
    const totalExpenses = tripTransactions.reduce((sum, t) => 
      t.type === "EXPENSE" ? sum + t.amount : sum, 0
    );
    const perPerson = totalExpenses / participants.length;
    
    const paid: Record<string, number> = {};
    participants.forEach((p) => { paid[p.id] = 0; });
    
    tripTransactions.forEach((t) => {
      if (t.type === "EXPENSE" && t.payer_id) {
        const participant = participants.find(p => p.user_id === t.payer_id || p.member_id === t.payer_id);
        if (participant) {
          paid[participant.id] = (paid[participant.id] || 0) + t.amount;
        }
      }
    });

    return participants.map((p) => ({
      participantId: p.id,
      name: p.name,
      paid: paid[p.id] || 0,
      owes: perPerson,
      balance: (paid[p.id] || 0) - perPerson,
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Detail View
  if (view === "detail" && selectedTrip) {
    const balances = calculateBalances();
    // SINGLE SOURCE OF TRUTH: Usar total calculado pelo banco de dados
    const totalExpenses = tripFinancialSummary?.total_spent || tripTransactions.reduce((sum, t) => 
      t.type === "EXPENSE" ? sum + t.amount : sum, 0
    );

    return (
      <div className="space-y-6 animate-fade-in">
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
                selectedTrip.status === "ACTIVE" || selectedTrip.status === "PLANNING" 
                  ? "bg-foreground text-background" 
                  : "bg-muted text-muted-foreground"
              )}>
                {selectedTrip.status === "PLANNING" ? "Planejando" :
                 selectedTrip.status === "ACTIVE" ? "Em andamento" :
                 selectedTrip.status === "COMPLETED" ? "Finalizada" : "Cancelada"}
              </span>
            </div>
            {selectedTrip.destination && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {selectedTrip.destination}
              </p>
            )}
            {/* Criador e Moeda */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Criado por {permissions?.isOwner ? "você" : "outro membro"}
              </span>
              <span className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                {getCurrencySymbol(selectedTrip.currency)} {selectedTrip.currency}
              </span>
            </div>
          </div>
          
          {/* Botões de ação baseados em permissões */}
          <div className="flex items-center gap-2">
            {/* Botão de orçamento pessoal (todos os membros) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonalBudgetDialog(true)}
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              {myPersonalBudget ? "Meu Orçamento" : "Adicionar Orçamento"}
            </Button>
            
            {/* Botão de editar (apenas owner) */}
            {permissions?.isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditTripDialog(true)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Editar Viagem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir esta viagem?")) {
                      deleteTrip.mutate(selectedTripId!);
                      goBack();
                    }
                  }}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-8 py-4 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total</p>
            <p className="font-mono text-2xl font-bold">{formatCurrency(totalExpenses, selectedTrip.currency)}</p>
          </div>
          {participants.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Por pessoa</p>
              <p className="font-mono text-lg font-medium">
                {formatCurrency(totalExpenses / participants.length, selectedTrip.currency)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Período</p>
            <p className="text-sm">
              {format(new Date(selectedTrip.start_date), "dd MMM", { locale: ptBR })}
              {" - "}
              {format(new Date(selectedTrip.end_date), "dd MMM", { locale: ptBR })}
            </p>
          </div>
          {myPersonalBudget && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Meu Orçamento</p>
              <p className="font-mono text-sm">{formatCurrency(myPersonalBudget, selectedTrip.currency)}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TripTab)}>
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="summary" className="flex-1 gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1 gap-2">
              <DollarSign className="h-4 w-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex-1 gap-2">
              <ShoppingCart className="h-4 w-4" />
              Compras
            </TabsTrigger>
            {selectedTrip.currency !== "BRL" && (
              <TabsTrigger value="exchange" className="flex-1 gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Câmbio
              </TabsTrigger>
            )}
            <TabsTrigger value="itinerary" className="flex-1 gap-2">
              <Route className="h-4 w-4" />
              Roteiro
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex-1 gap-2">
              <ListChecks className="h-4 w-4" />
              Checklist
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6 mt-6">
            {/* Budget Progress */}
            {myPersonalBudget && (
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  Meu Orçamento
                </h2>
                <div className="p-6 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Meus Gastos</p>
                      {/* SINGLE SOURCE OF TRUTH: Usar valor calculado pelo banco */}
                      <p className="font-mono text-3xl font-bold">{formatCurrency(myTripSpent, selectedTrip.currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Meu Orçamento</p>
                      <p className="font-mono text-2xl font-medium">{formatCurrency(myPersonalBudget, selectedTrip.currency)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all rounded-full",
                        myTripSpent > myPersonalBudget
                          ? "bg-destructive"
                          : myTripSpent > myPersonalBudget * 0.8
                          ? "bg-amber-500"
                          : "bg-positive"
                      )}
                      style={{ width: `${Math.min((myTripSpent / myPersonalBudget) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {((myTripSpent / myPersonalBudget) * 100).toFixed(1)}% utilizado
                    </p>
                    <p className={cn(
                      "text-xs font-medium",
                      myTripSpent > myPersonalBudget ? "text-destructive" : "text-positive"
                    )}>
                      {myTripSpent > myPersonalBudget ? "Acima" : "Me restam"} {formatCurrency(Math.abs(myPersonalBudget - myTripSpent), selectedTrip.currency)}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Participants Summary */}
            {participants.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  Participantes
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {balances.map((balance) => (
                    <div key={balance.participantId} className="p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                          {getInitials(balance.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{balance.name}</p>
                          <p className="text-xs text-muted-foreground">Pagou {formatCurrency(balance.paid, selectedTrip.currency)}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Saldo</span>
                          <span className={cn(
                            "font-mono font-semibold",
                            balance.balance >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {balance.balance >= 0 ? "+" : ""}{formatCurrency(balance.balance, selectedTrip.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Stats */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Despesas</p>
                <p className="font-mono text-2xl font-bold">{tripTransactions.filter(t => t.type === "EXPENSE").length}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Média/Dia</p>
                <p className="font-mono text-lg font-medium">
                  {formatCurrency(totalExpenses / Math.max(1, Math.ceil((new Date(selectedTrip.end_date).getTime() - new Date(selectedTrip.start_date).getTime()) / (1000 * 60 * 60 * 24))), selectedTrip.currency)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Participantes</p>
                <p className="font-mono text-2xl font-bold">{participants.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Por Pessoa</p>
                <p className="font-mono text-lg font-medium">
                  {participants.length > 0 ? formatCurrency(totalExpenses / participants.length, selectedTrip.currency) : formatCurrency(0, selectedTrip.currency)}
                </p>
              </div>
            </section>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6 mt-6">
            {/* Participants & Balances */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  Participantes ({participants.length})
                </h2>
                {/* Botão de adicionar participante apenas para owners */}
                {permissions?.isOwner && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddParticipantDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>
              {balances.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {balances.map((balance) => (
                    <div key={balance.participantId} className="p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                          {getInitials(balance.name)}
                        </div>
                        <div>
                          <p className="font-medium">{balance.name}</p>
                          <p className="text-xs text-muted-foreground">Pagou {formatCurrency(balance.paid, selectedTrip.currency)}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Saldo</span>
                        <span className={cn(
                          "font-mono font-semibold",
                          balance.balance >= 0 ? "text-positive" : "text-negative"
                        )}>
                          {balance.balance >= 0 ? "+" : ""}{formatCurrency(balance.balance, selectedTrip.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhum participante</p>
                </div>
              )}
            </section>

            {/* Expenses List */}
            <section className="space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Despesas ({tripTransactions.filter(t => t.type === "EXPENSE").length})
              </h2>
              {tripTransactions.filter(t => t.type === "EXPENSE").length > 0 ? (
                <div className="space-y-2">
                  {tripTransactions.filter(t => t.type === "EXPENSE").map((expense) => {
                    const payer = participants.find(p => 
                      p.user_id === expense.payer_id || p.member_id === expense.payer_id
                    );
                    return (
                      <div key={expense.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {payer ? getInitials(payer.name) : "?"}
                          </div>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {payer?.name || "Desconhecido"} · {format(new Date(expense.date), "dd MMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-medium">{formatCurrency(expense.amount, selectedTrip.currency)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
                </div>
              )}
            </section>
          </TabsContent>

          {/* Shopping Tab */}
          <TabsContent value="shopping" className="mt-6">
            <TripShopping
              trip={selectedTrip}
              onUpdateTrip={async (updates) => {
                await updateTrip.mutateAsync({
                  id: selectedTrip.id,
                  ...updates,
                });
              }}
              isUpdating={updateTrip.isPending}
            />
          </TabsContent>

          {/* Exchange Tab - apenas para viagens em moeda estrangeira */}
          {selectedTrip.currency !== "BRL" && (
            <TabsContent value="exchange" className="mt-6">
              <TripExchange trip={selectedTrip} totalExpenses={totalExpenses} />
            </TabsContent>
          )}

          {/* Itinerary Tab */}
          <TabsContent value="itinerary" className="mt-6">
            <TripItinerary tripId={selectedTrip.id} />
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="mt-6">
            <TripChecklist tripId={selectedTrip.id} />
          </TabsContent>
        </Tabs>

        {/* Add Participant Dialog */}
        <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Participante</DialogTitle>
              <DialogDescription>Selecione um membro da família</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              {familyMembers.map((member) => {
                const isAdded = participants.some(p => p.member_id === member.id);
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-colors",
                      isAdded 
                        ? "border-foreground/20 bg-muted/50 opacity-50" 
                        : "border-border hover:border-foreground/20 cursor-pointer"
                    )}
                    onClick={() => !isAdded && handleAddParticipant(member.id, member.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                        {getInitials(member.name)}
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    {isAdded && <span className="text-xs text-muted-foreground">Adicionado</span>}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddParticipantDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Trip Dialog - na Detail View */}
        <EditTripDialog
          open={showEditTripDialog}
          onOpenChange={setShowEditTripDialog}
          trip={selectedTrip}
          onSubmit={handleEditTrip}
          isLoading={updateTrip.isPending}
        />

        {/* Personal Budget Dialog - na Detail View */}
        <PersonalBudgetDialog
          open={showPersonalBudgetDialog}
          onOpenChange={setShowPersonalBudgetDialog}
          currentBudget={myPersonalBudget}
          tripName={selectedTrip?.name || ""}
          onSubmit={handleUpdatePersonalBudget}
          isLoading={updatePersonalBudget.isPending}
          required={false}
        />
      </div>
    );
  }

  // Empty State
  if (trips.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">Viagens</h1>
            <p className="text-muted-foreground mt-1">Organize despesas de viagem</p>
          </div>
        </div>

        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Nenhuma viagem cadastrada</h3>
          <p className="text-muted-foreground mb-6">Crie sua primeira viagem para organizar gastos</p>
          <Button onClick={() => setShowNewTripDialog(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Nova viagem
          </Button>
        </div>

        <NewTripDialog
          open={showNewTripDialog}
          onOpenChange={setShowNewTripDialog}
          onSubmit={handleCreateTrip}
          isLoading={createTrip.isPending}
          name={tripName}
          setName={setTripName}
          destination={tripDestination}
          setDestination={setTripDestination}
          startDate={tripStartDate}
          setStartDate={setTripStartDate}
          endDate={tripEndDate}
          setEndDate={setTripEndDate}
          budget={tripBudget}
          setBudget={setTripBudget}
          currency={tripCurrency}
          setCurrency={setTripCurrency}
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
          <h1 className="font-display font-bold text-3xl tracking-tight">Viagens</h1>
          <p className="text-muted-foreground mt-1">Organize despesas de viagem</p>
        </div>
        <Button size="lg" onClick={() => setShowNewTripDialog(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Nova viagem
        </Button>
      </div>

      {/* Pending Trip Invitations */}
      <PendingTripInvitationsAlert />

      {/* Trips List */}
      <div className="space-y-3">
        {trips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => openTripDetail(trip.id)}
            className="group p-5 rounded-xl border border-border hover:border-foreground/20 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display font-semibold text-lg">{trip.name}</h3>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    trip.status === "ACTIVE" || trip.status === "PLANNING" 
                      ? "bg-foreground text-background" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {trip.status === "PLANNING" ? "Planejando" :
                     trip.status === "ACTIVE" ? "Em andamento" :
                     trip.status === "COMPLETED" ? "Finalizada" : "Cancelada"}
                  </span>
                </div>
                {trip.destination && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {trip.destination}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(trip.start_date), "dd MMM", { locale: ptBR })}
                    {" - "}
                    {format(new Date(trip.end_date), "dd MMM", { locale: ptBR })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {trip.my_personal_budget ? (
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatCurrency(trip.my_personal_budget, trip.currency)}</p>
                    <p className="text-xs text-muted-foreground">Meu Orçamento</p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Orçamento não definido</p>
                  </div>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <NewTripDialog
        open={showNewTripDialog}
        onOpenChange={setShowNewTripDialog}
        onSubmit={handleCreateTrip}
        isLoading={createTrip.isPending}
        name={tripName}
        setName={setTripName}
        destination={tripDestination}
        setDestination={setTripDestination}
        startDate={tripStartDate}
        setStartDate={setTripStartDate}
        endDate={tripEndDate}
        setEndDate={setTripEndDate}
        budget={tripBudget}
        setBudget={setTripBudget}
        currency={tripCurrency}
        setCurrency={setTripCurrency}
      />

      {/* Transaction Modal */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
      />
    </div>
  );
}
