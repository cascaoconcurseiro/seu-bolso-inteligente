import { TrendingUp, DollarSign, ShoppingCart, Plane, Route, ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripDetailHeader } from "@/components/trips/TripDetailHeader";
import { TripDetailSummary } from "@/components/trips/TripDetailSummary";
import { TripSummaryTab } from "@/components/trips/TripSummaryTab";
import { TripExpensesTab } from "@/components/trips/TripExpensesTab";
import { TripShopping } from "@/components/trips/TripShopping";
import { TripExchange } from "@/components/trips/TripExchange";
import { TripItinerary } from "@/components/trips/TripItinerary";
import { TripChecklist } from "@/components/trips/TripChecklist";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import type { TripParticipant, TripUpdateInput } from "@/hooks/useTrips";
import type { SentTripInvitation, TripBalance, TripDetailData } from "./types";

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
  trip,
  permissions,
  participants,
  tripTransactions,
  user,
  activeTab,
  setActiveTab,
  myPersonalBudget,
  balances,
  onBack,
  onEdit,
  onAddParticipant,
  onArchive,
  onUnarchive,
  onDelete,
  onOpenBudget,
  onUpdateTrip,
  formatCurrency,
  onExportPDF,
  onExportExcel,
  onRemoveParticipantClick,
  pendingInvitations,
  onCancelInvitation,
}: TripDetailViewProps) {
  const relevantTransactions = tripTransactions.filter(
    (t) =>
      t.type === "EXPENSE" &&
      (t.is_shared || t.creator_user_id === user?.id || t.user_id === user?.id)
  );
  const totalExpenses = relevantTransactions.reduce(
    (sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(),
    0
  );

  // IMPACTO REAL NO ORÇAMENTO (Accrual Basis - Regime de Competência):
  // 1. Gastos individuais (só meus)
  const myIndividualExpenses = tripTransactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        !t.is_shared &&
        (t.creator_user_id === user?.id || t.user_id === user?.id)
    )
    .reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount)).toNumber(), 0);

  // 2. Minha parte nos gastos compartilhados (mesmo que eu não tenha pago)
  const myShareOfShared = tripTransactions
    .filter((t) => t.type === "EXPENSE" && t.is_shared)
    .reduce((sum, t) => {
      if (!t.transaction_splits) return sum;
      const mySplit = t.transaction_splits.find((split) => split.user_id === user?.id);
      return sum + (mySplit ? Number(mySplit.amount) : 0);
    }, 0);

  // myTotalSpent = o impacto real no meu orçamento, independente de quem já pagou
  const myTotalSpent = myIndividualExpenses + myShareOfShared;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <TripDetailHeader
        trip={trip}
        permissions={permissions}
        participants={participants}
        onBack={onBack}
        onEdit={onEdit}
        onAddParticipant={onAddParticipant}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
        onOpenBudget={onOpenBudget}
        hasPersonalBudget={!!myPersonalBudget}
        onExportPDF={onExportPDF}
        onExportExcel={onExportExcel}
      />
      <TripDetailSummary
        totalExpenses={totalExpenses}
        myTotalSpent={myTotalSpent}
        myPersonalBudget={myPersonalBudget}
        startDate={trip.start_date}
        endDate={trip.end_date}
        currency={trip.currency}
        formatCurrency={formatCurrency}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 relative">
          <TabsList className="w-full h-auto flex overflow-x-auto snap-x hide-scrollbar bg-card/60 backdrop-blur-md rounded-3xl shadow-inner border border-border/40 p-2 gap-2 justify-start relative z-10">
            <TabsTrigger
              value="summary"
              className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold uppercase tracking-widest text-sm">Resumo</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-bold uppercase tracking-widest text-sm">Gastos</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="shopping"
              className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-bold uppercase tracking-widest text-sm">Compras</span>
              </div>
            </TabsTrigger>
            {trip.currency !== "BRL" && (
              <TabsTrigger
                value="exchange"
                className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  <span className="font-bold uppercase tracking-widest text-sm">Câmbio</span>
                </div>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="itinerary"
              className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <span className="font-bold uppercase tracking-widest text-sm">Roteiro</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="checklist"
              className="shrink-0 snap-start rounded-xl py-3 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="font-bold uppercase tracking-widest text-sm">Checklist</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Sombra para indicar scroll no mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden z-20" />
        </div>

        <TabsContent value="summary">
          <TripSummaryTab
            selectedTrip={trip}
            myTotalSpent={myTotalSpent}
            myPersonalBudget={myPersonalBudget}
            participants={participants}
            balances={balances}
            tripTransactions={tripTransactions}
            user={user}
            onAddParticipant={onAddParticipant}
            permissions={permissions}
            onRemoveClick={onRemoveParticipantClick}
            pendingInvitations={pendingInvitations}
            onCancelInvitation={onCancelInvitation}
            setActiveTab={setActiveTab}
          />
        </TabsContent>
        <TabsContent value="expenses">
          <TripExpensesTab
            tripTransactions={tripTransactions}
            participants={participants}
            selectedTrip={trip}
            user={user}
            formatCurrency={formatCurrency}
            balances={balances}
            myTotalSpent={myTotalSpent}
          />
        </TabsContent>
        <TabsContent value="shopping">
          <TripShopping trip={trip} onUpdateTrip={onUpdateTrip} isUpdating={false} />
        </TabsContent>
        {trip.currency !== "BRL" && (
          <TabsContent value="exchange">
            <TripExchange trip={trip} totalExpenses={totalExpenses} />
          </TabsContent>
        )}
        <TabsContent value="itinerary">
          <TripItinerary trip={trip} />
        </TabsContent>
        <TabsContent value="checklist">
          <TripChecklist trip={trip} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
