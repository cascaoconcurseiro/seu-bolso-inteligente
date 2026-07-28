import { TrendingUp, DollarSign, Route, ListChecks, BookOpen, Compass, UsersRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripDetailHeader } from "@/components/trips/TripDetailHeader";
import { TripDetailSummary } from "@/components/trips/TripDetailSummary";
import { TripSummaryTab } from "@/components/trips/TripSummaryTab";
import { TripExpensesTab } from "@/components/trips/TripExpensesTab";
import { TripShopping } from "@/components/trips/TripShopping";
import { TripExchange } from "@/components/trips/TripExchange";
import { TripChecklist } from "@/components/trips/TripChecklist";
import { TripBagTracker } from "@/components/trips/TripBagTracker";
import { TripJournalTab } from "@/components/trips/TripJournalTab";
import { TripWeatherBrief } from "@/components/trips/TripWeatherBrief";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import type { TripParticipant, TripUpdateInput } from "@/hooks/useTrips";
import type { SentTripInvitation, TripBalance, TripDetailData } from "./types";
import { lazy, Suspense } from "react";

const TripItinerary = lazy(() =>
  import("@/components/trips/TripItinerary").then((module) => ({ default: module.TripItinerary }))
);
const TripPlacesCommunityTab = lazy(() =>
  import("@/components/trips/TripPlacesCommunityTab").then((module) => ({ default: module.TripPlacesCommunityTab }))
);

interface TripDetailViewProps extends TripDetailData {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  myPersonalBudget: number | null;
  onBack: () => void;
  onEdit: () => void;
  onAddParticipant: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onOpenBudget: () => void;
  onUpdateTrip: (updates: TripUpdateInput) => Promise<void>;
  formatCurrency: (val: number, cur?: string) => string;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onRemoveParticipantClick?: (participant: TripParticipant, balance: TripBalance) => void;
  pendingInvitations?: SentTripInvitation[];
  onCancelInvitation?: (id: string) => void;
}

export function TripDetailView({
  trip, permissions, participants, tripTransactions, user, activeTab, setActiveTab,
  myPersonalBudget, balances, onBack, onEdit, onAddParticipant, onArchive, onUnarchive,
  onDelete, onOpenBudget, onUpdateTrip, formatCurrency, onExportPDF, onExportExcel,
  onRemoveParticipantClick, pendingInvitations, onCancelInvitation,
}: TripDetailViewProps) {
  const relevantTransactions = tripTransactions.filter(
    (t) => t.type === "EXPENSE" && (t.is_shared || t.creator_user_id === user?.id || t.user_id === user?.id)
  );
  const totalExpenses = relevantTransactions.reduce(
    (sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0
  );
  const myIndividualExpenses = tripTransactions
    .filter((t) => t.type === "EXPENSE" && !t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0);
  const myShareOfShared = tripTransactions
    .filter((t) => t.type === "EXPENSE" && t.is_shared)
    .reduce((sum, t) => {
      if (!t.transaction_splits) return sum;
      const mySplit = t.transaction_splits.find((split) => split.user_id === user?.id);
      return sum + (mySplit ? Number(mySplit.amount) : 0);
    }, 0);
  const myTotalSpent = myIndividualExpenses + myShareOfShared;

  const primaryTab =
    activeTab === "itinerary" ? "planner" :
    activeTab === "community" ? "community" :
    activeTab === "expenses" || activeTab === "exchange" ? "expenses" :
    activeTab === "shopping" || activeTab === "checklist" || activeTab === "preparation" || activeTab === "bags" ? "preparation" :
    activeTab === "journal" ? "journal" : "summary";

  const loading = (label: string) => (
    <div className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground" role="status">
      {label}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <TripDetailHeader
        trip={trip} permissions={permissions} participants={participants} onBack={onBack}
        onEdit={onEdit} onAddParticipant={onAddParticipant} onArchive={onArchive}
        onUnarchive={onUnarchive} onDelete={onDelete} onOpenBudget={onOpenBudget}
        hasPersonalBudget={!!myPersonalBudget} onExportPDF={onExportPDF} onExportExcel={onExportExcel}
      />
      <Tabs value={primaryTab} onValueChange={(tab) => setActiveTab(tab === "planner" ? "itinerary" : tab)}>
        <div className="mb-6 relative">
          <TabsList className="w-full h-auto flex overflow-x-auto snap-x hide-scrollbar bg-card/60 backdrop-blur-md rounded-3xl shadow-inner border border-border/40 p-2 gap-2 justify-start relative z-10">
            {[
              ["summary", TrendingUp, "Resumo"],
              ["expenses", DollarSign, "Gastos"],
              ["planner", Route, "Roteiro"],
              ["preparation", ListChecks, "Preparar"],
              ["journal", BookOpen, "Diário"],
              ["community", UsersRound, "Comunidade"],
            ].map(([value, Icon, label]) => (
              <TabsTrigger key={value as string} value={value as string} className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-bold uppercase tracking-widest text-sm">{label as string}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden z-20" />
        </div>

        <TabsContent value="summary">
          <div className="space-y-6">
            <TripDetailSummary totalExpenses={totalExpenses} myTotalSpent={myTotalSpent} myPersonalBudget={myPersonalBudget} startDate={trip.start_date} endDate={trip.end_date} currency={trip.currency} formatCurrency={formatCurrency} />
            <TripWeatherBrief trip={trip} />
            <TripSummaryTab selectedTrip={trip} myTotalSpent={myTotalSpent} myPersonalBudget={myPersonalBudget} participants={participants} balances={balances} tripTransactions={tripTransactions} user={user} onAddParticipant={onAddParticipant} permissions={permissions} onRemoveClick={onRemoveParticipantClick} pendingInvitations={pendingInvitations} onCancelInvitation={onCancelInvitation} setActiveTab={setActiveTab} />
          </div>
        </TabsContent>

        <TabsContent value="planner"><Suspense fallback={loading("Preparando mapa e roteiro…")}><TripItinerary trip={trip} /></Suspense></TabsContent>
        <TabsContent value="community"><Suspense fallback={loading("Preparando comunidade da viagem…")}><TripPlacesCommunityTab trip={trip} /></Suspense></TabsContent>
        <TabsContent value="journal"><TripJournalTab /></TabsContent>

        <TabsContent value="expenses">
          <Tabs value={trip.currency !== "BRL" && activeTab === "exchange" ? "exchange" : "expenses"} onValueChange={setActiveTab}>
            {trip.currency !== "BRL" && <TabsList className="mb-4"><TabsTrigger value="expenses">Despesas</TabsTrigger><TabsTrigger value="exchange">Câmbio</TabsTrigger></TabsList>}
            <TabsContent value="expenses"><TripExpensesTab tripTransactions={tripTransactions} participants={participants} selectedTrip={trip} user={user} formatCurrency={formatCurrency} balances={balances} myTotalSpent={myTotalSpent} /></TabsContent>
            {trip.currency !== "BRL" && <TabsContent value="exchange"><TripExchange trip={trip} totalExpenses={totalExpenses} /></TabsContent>}
          </Tabs>
        </TabsContent>

        <TabsContent value="preparation">
          <Tabs value={activeTab === "shopping" ? "shopping" : activeTab === "bags" ? "bags" : "checklist"} onValueChange={setActiveTab}>
            <TabsList className="mb-4"><TabsTrigger value="checklist">Checklist</TabsTrigger><TabsTrigger value="bags">Controle de Malas</TabsTrigger><TabsTrigger value="shopping">Compras</TabsTrigger></TabsList>
            <TabsContent value="checklist"><TripChecklist trip={trip} /></TabsContent>
            <TabsContent value="bags"><TripBagTracker /></TabsContent>
            <TabsContent value="shopping"><TripShopping trip={trip} onUpdateTrip={onUpdateTrip} isUpdating={false} /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
