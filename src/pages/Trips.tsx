import { useState, useEffect, useRef } from "react";
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
  User,
  Wallet,
  CheckCircle,
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
import { usePendingTripInvitations } from "@/hooks/useTripInvitations";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useSharedFinances } from "@/hooks/useSharedFinances";
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
import { useNavigate } from "react-router-dom";
import { Pencil, Wallet, ArrowRightLeft, User, Coins } from "lucide-react";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

type TripView = "list" | "detail";
type TripTab = "summary" | "expenses" | "shopping" | "exchange" | "itinerary" | "checklist";

export function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<TripView>("list");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TripTab>("expenses");
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);
  const [showPersonalBudgetDialog, setShowPersonalBudgetDialog] = useState(false);
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const invitationsRef = useRef<HTMLDivElement>(null);
  
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
  const { data: pendingInvitations = [] } = usePendingTripInvitations();
  
  // INTEGRAÇÃO COM COMPARTILHADOS: Buscar saldos de viagem
  const { invoices: sharedInvoices, getFilteredInvoice, getTotals } = useSharedFinances({
    currentDate: new Date(),
    activeTab: 'TRAVEL',
  });
  
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

  // Scroll automático para convites quando a página carrega
  useEffect(() => {
    if (view === "list" && pendingInvitations.length > 0 && invitationsRef.current) {
      setTimeout(() => {
        invitationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [view, pendingInvitations.length]);

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
      name: tripDestination, // Usar destino como nome
      destination: tripDestination,
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
    if (!participants.length || !selectedTripId) return [];
    
    // INTEGRAÇÃO COM COMPARTILHADOS: Usar saldos reais de compartilhados
    // Isso garante que quando um acerto é feito, o saldo é atualizado automaticamente
    return participants.map((p) => {
      // Buscar membro da família correspondente
      const familyMember = familyMembers.find(fm => fm.linked_user_id === p.user_id);
      
      if (!familyMember) {
        // Se não encontrar membro, calcular manualmente (fallback)
        const totalExpenses = tripTransactions.reduce((sum, t) => 
          t.type === "EXPENSE" ? sum + t.amount : sum, 0
        );
        const perPerson = totalExpenses / participants.length;
        const paid = tripTransactions
          .filter(t => t.type === "EXPENSE" && (t.payer_id === p.user_id || t.payer_id === p.member_id))
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          participantId: p.user_id || p.id,
          name: p.name,
          paid: paid,
          owes: perPerson,
          balance: paid - perPerson,
        };
      }
      
      // Buscar itens compartilhados desta viagem para este membro
      const memberItems = getFilteredInvoice(familyMember.id).filter(item => item.tripId === selectedTripId);
      const totals = getTotals(memberItems);
      const currency = selectedTrip?.currency || 'BRL';
      
      // Calcular quanto pagou (CREDIT = me devem = eu paguei)
      const paid = memberItems
        .filter(i => i.type === 'CREDIT')
        .reduce((sum, i) => sum + i.amount, 0);
      
      // Calcular quanto deve (DEBIT = eu devo = não paguei)
      const owes = memberItems
        .filter(i => i.type === 'DEBIT')
        .reduce((sum, i) => sum + i.amount, 0);
      
      // Saldo = quanto pagou - quanto deve
      // Se positivo: outros devem para mim
      // Se negativo: eu devo para outros
      const balance = totals[currency]?.net || 0;
      
      return {
        participantId: p.user_id || p.id,
        name: p.name,
        paid: paid,
        owes: owes,
        balance: balance,
      };
    });
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
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full self-start h-11 w-11 md:h-10 md:w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight truncate">{selectedTrip.name}</h1>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full shrink-0",
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Botão de orçamento pessoal (todos os membros) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonalBudgetDialog(true)}
              className="w-full sm:w-auto gap-2 h-11 md:h-9"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{myPersonalBudget ? "Meu Orçamento" : "Adicionar Orçamento"}</span>
              <span className="sm:hidden">Orçamento</span>
            </Button>
            
            {/* Botão de editar (apenas owner) */}
            {permissions?.isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditTripDialog(true)}
                  className="w-full sm:w-auto gap-2 h-11 md:h-9"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar Viagem</span>
                  <span className="sm:hidden">Editar</span>
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
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:w-full">
              <TabsTrigger value="summary" className="flex-1 min-w-[100px] gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Resumo</span>
                <span className="sm:hidden">Resumo</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1 min-w-[100px] gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Gastos</span>
                <span className="sm:hidden">Gastos</span>
              </TabsTrigger>
              <TabsTrigger value="shopping" className="flex-1 min-w-[100px] gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Compras</span>
                <span className="sm:hidden">Compras</span>
              </TabsTrigger>
              {selectedTrip.currency !== "BRL" && (
                <TabsTrigger value="exchange" className="flex-1 min-w-[100px] gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Câmbio</span>
                  <span className="sm:hidden">Câmbio</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="itinerary" className="flex-1 min-w-[100px] gap-2">
                <Route className="h-4 w-4" />
                <span className="hidden sm:inline">Roteiro</span>
                <span className="sm:hidden">Roteiro</span>
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex-1 min-w-[100px] gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Checklist</span>
                <span className="sm:hidden">Checklist</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6 mt-6">
            {/* Hero Card - Orçamento Principal */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-6 md:p-8 text-white">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm opacity-90 mb-2">Orçamento Total da Viagem</p>
                    <p className="font-mono text-4xl md:text-5xl font-bold">
                      {formatCurrency(selectedTrip.budget || 0, selectedTrip.currency)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm opacity-90 mb-2">Total Gasto</p>
                    <p className="font-mono text-2xl md:text-3xl font-bold">
                      {formatCurrency(totalExpenses, selectedTrip.currency)}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden backdrop-blur-sm">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        totalExpenses > (selectedTrip.budget || 0)
                          ? "bg-red-400"
                          : totalExpenses > (selectedTrip.budget || 0) * 0.8
                          ? "bg-yellow-400"
                          : "bg-green-400"
                      )}
                      style={{ width: `${Math.min((totalExpenses / (selectedTrip.budget || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-90">
                      {((totalExpenses / (selectedTrip.budget || 1)) * 100).toFixed(1)}% utilizado
                    </span>
                    <span className="font-semibold">
                      {totalExpenses > (selectedTrip.budget || 0) ? (
                        <>🔴 Acima do orçamento</>
                      ) : (
                        <>✓ Restam {formatCurrency((selectedTrip.budget || 0) - totalExpenses, selectedTrip.currency)}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
              </div>
            </div>

            {/* Grid de Informações Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Dias da Viagem */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Duração</p>
                </div>
                <p className="font-mono text-2xl font-bold">
                  {Math.ceil((new Date(selectedTrip.end_date).getTime() - new Date(selectedTrip.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">dias</p>
              </div>

              {/* Média por Dia */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Média/Dia</p>
                </div>
                <p className="font-mono text-2xl font-bold">
                  {formatCurrency(
                    totalExpenses / Math.max(1, Math.ceil((new Date(selectedTrip.end_date).getTime() - new Date(selectedTrip.start_date).getTime()) / (1000 * 60 * 60 * 24))),
                    selectedTrip.currency
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">por dia</p>
              </div>

              {/* Participantes */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Participantes</p>
                </div>
                <p className="font-mono text-2xl font-bold">{participants.length}</p>
                <p className="text-xs text-muted-foreground mt-1">pessoas</p>
              </div>

              {/* Por Pessoa */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-orange-500" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Por Pessoa</p>
                </div>
                <p className="font-mono text-2xl font-bold">
                  {formatCurrency(totalExpenses / Math.max(1, participants.length), selectedTrip.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">média</p>
              </div>
            </div>

            {/* Meu Orçamento Pessoal */}
            {myPersonalBudget && (
              <div className="p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-lg">Meu Orçamento Pessoal</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Meu Orçamento</p>
                    <p className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(myPersonalBudget, selectedTrip.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Meus Gastos</p>
                    <p className="font-mono text-xl font-bold">
                      {formatCurrency(myTripSpent, selectedTrip.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {myTripSpent > myPersonalBudget ? "Acima do Orçamento" : "Restante"}
                    </p>
                    <p className={cn(
                      "font-mono text-xl font-bold",
                      myTripSpent > myPersonalBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )}>
                      {myTripSpent > myPersonalBudget ? "+" : ""}
                      {formatCurrency(Math.abs(myPersonalBudget - myTripSpent), selectedTrip.currency)}
                    </p>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      myTripSpent > myPersonalBudget
                        ? "bg-red-500"
                        : myTripSpent > myPersonalBudget * 0.8
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{ width: `${Math.min((myTripSpent / myPersonalBudget) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {((myTripSpent / myPersonalBudget) * 100).toFixed(1)}% do meu orçamento utilizado
                </p>
              </div>
            )}

            {/* Breakdown: Compartilhado vs Individual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Despesas Compartilhadas */}
              <div className="p-6 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold">Despesas Compartilhadas</h3>
                </div>
                <p className="font-mono text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {formatCurrency(
                    tripTransactions
                      .filter(t => t.type === "EXPENSE" && t.is_shared)
                      .reduce((sum, t) => sum + t.amount, 0),
                    selectedTrip.currency
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tripTransactions.filter(t => t.type === "EXPENSE" && t.is_shared).length} transações compartilhadas
                </p>
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-muted-foreground mb-1">Minha parte</p>
                  <p className="font-mono text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {formatCurrency(
                      tripTransactions
                        .filter(t => t.type === "EXPENSE" && t.is_shared)
                        .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, participants.length),
                      selectedTrip.currency
                    )}
                  </p>
                </div>
              </div>

              {/* Meus Gastos Individuais */}
              <div className="p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold">Meus Gastos Individuais</h3>
                </div>
                <p className="font-mono text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formatCurrency(
                    tripTransactions
                      .filter(t => t.type === "EXPENSE" && !t.is_shared && t.user_id === user?.id)
                      .reduce((sum, t) => sum + t.amount, 0),
                    selectedTrip.currency
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tripTransactions.filter(t => t.type === "EXPENSE" && !t.is_shared && t.user_id === user?.id).length} transações individuais
                </p>
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-muted-foreground mb-1">Média por dia</p>
                  <p className="font-mono text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      tripTransactions
                        .filter(t => t.type === "EXPENSE" && !t.is_shared && t.user_id === user?.id)
                        .reduce((sum, t) => sum + t.amount, 0) / 
                      Math.max(1, Math.ceil((new Date(selectedTrip.end_date).getTime() - new Date(selectedTrip.start_date).getTime()) / (1000 * 60 * 60 * 24))),
                      selectedTrip.currency
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Meu Saldo de Acertos */}
            {participants.length > 0 && (() => {
              const myBalance = balances.find(b => b.participantId === user?.id);
              if (!myBalance) return null;
              
              const isSettled = Math.abs(myBalance.balance) < 0.01;
              
              return (
                <div className={cn(
                  "p-6 rounded-xl border-2",
                  isSettled 
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                    : myBalance.balance >= 0
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20"
                      : "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                )}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg",
                      isSettled ? "bg-green-500" : myBalance.balance >= 0 ? "bg-blue-500" : "bg-orange-500"
                    )}>
                      {isSettled ? "✓" : myBalance.balance >= 0 ? "+" : "-"}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Meu Saldo de Acertos</h3>
                      <p className="text-sm text-muted-foreground">
                        {isSettled ? "Tudo acertado!" : myBalance.balance >= 0 ? "Você receberá" : "Você deve"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Eu Paguei</p>
                      <p className="font-mono text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(myBalance.paid, selectedTrip.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Minha Parte</p>
                      <p className="font-mono text-xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(myBalance.owes, selectedTrip.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                      <p className={cn(
                        "font-mono text-xl font-bold",
                        isSettled ? "text-green-600 dark:text-green-400" :
                        myBalance.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                      )}>
                        {isSettled ? "R$ 0,00" : (
                          <>{myBalance.balance >= 0 ? "+" : ""}{formatCurrency(myBalance.balance, selectedTrip.currency)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {!isSettled && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground text-center">
                        💡 {myBalance.balance >= 0 
                          ? "Outros participantes devem acertar com você" 
                          : "Acerte em Compartilhados > Viagem"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Acertos Realizados */}
            {tripFinancialSummary?.total_settled && tripFinancialSummary.total_settled > 0 && (
              <div className="p-6 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold">Acertos Realizados</h3>
                </div>
                <p className="font-mono text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {formatCurrency(tripFinancialSummary.total_settled, selectedTrip.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total de valores já acertados entre os participantes
                </p>
              </div>
            )}
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

            {/* Expenses List - Filtrado: Compartilhadas + Minhas Individuais */}
            <section className="space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Despesas ({tripTransactions.filter(t => 
                  t.type === "EXPENSE" && 
                  (t.is_shared || t.user_id === user?.id)
                ).length})
              </h2>
              {tripTransactions.filter(t => 
                t.type === "EXPENSE" && 
                (t.is_shared || t.user_id === user?.id)
              ).length > 0 ? (
                <div className="space-y-2">
                  {tripTransactions
                    .filter(t => 
                      t.type === "EXPENSE" && 
                      (t.is_shared || t.user_id === user?.id)
                    )
                    .map((expense) => {
                      const payer = participants.find(p => 
                        p.user_id === expense.payer_id || p.member_id === expense.payer_id
                      );
                      // Usar categoria real da transação, sem fallback para "Outros"
                      const categoryIcon = expense.category?.icon || "💸";
                      const categoryName = expense.category?.name || "Sem categoria";
                      const payerName = payer?.name || expense.account?.name || "Conta";
                      
                      return (
                        <div key={expense.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg">
                              {categoryIcon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{expense.description}</p>
                                {expense.is_shared && (
                                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                    Compartilhado
                                  </span>
                                )}
                                {!expense.is_shared && expense.user_id === user?.id && (
                                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                    Individual
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {categoryName} · {payerName} · {format(new Date(expense.date), "dd MMM", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-medium ml-2">{formatCurrency(expense.amount, selectedTrip.currency)}</span>
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
              {(() => {
                // Filtrar membros: remover quem já está na viagem E o próprio usuário
                const availableMembers = familyMembers.filter(member => {
                  // Não mostrar se já está na viagem
                  const isAlreadyInTrip = participants.some(p => p.member_id === member.id);
                  // Não mostrar o próprio usuário (linked_user_id é o ID do usuário logado)
                  const isCurrentUser = member.linked_user_id === user?.id;
                  return !isAlreadyInTrip && !isCurrentUser;
                });

                if (availableMembers.length === 0) {
                  return (
                    <div className="py-8 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Nenhum membro disponível</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Todos os membros da família já estão nesta viagem.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowAddParticipantDialog(false);
                          navigate("/familia");
                        }}
                      >
                        Adicionar Novos Membros
                      </Button>
                    </div>
                  );
                }

                return availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-foreground/20 cursor-pointer transition-colors"
                    onClick={() => handleAddParticipant(member.id, member.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                        {getInitials(member.name)}
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </div>
                ));
              })()}
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
      <div ref={invitationsRef}>
        <PendingTripInvitationsAlert />
      </div>

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
