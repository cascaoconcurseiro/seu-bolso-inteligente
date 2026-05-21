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
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

interface TripDetailViewProps {
  trip: any;
  permissions: any;
  participants: any[];
  tripTransactions: any[];
  tripFinancialSummary: any;
  user: any;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  myPersonalBudget: number | null;
  balances: any[];
  onBack: () => void;
  onEdit: () => void;
  onAddParticipant: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onOpenBudget: () => void;
  onUpdateTrip: (updates: any) => Promise<void>;
  formatCurrency: (val: number, cur?: string) => string;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onRemoveParticipantClick?: (participant: any, balance: any) => void;
}

export function TripDetailView({
  trip, permissions, participants, tripTransactions, tripFinancialSummary, user, activeTab, setActiveTab,
  myPersonalBudget, balances, onBack, onEdit, onAddParticipant, onArchive, onUnarchive, onDelete, onOpenBudget, onUpdateTrip, formatCurrency,
  onExportPDF, onExportExcel, onRemoveParticipantClick
}: TripDetailViewProps) {
  const relevantTransactions = tripTransactions.filter(t => t.type === "EXPENSE" && (t.is_shared || t.creator_user_id === user?.id || t.user_id === user?.id));
  const totalExpenses = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
  // IMPACTO REAL NO ORÇAMENTO (Cash Basis):
  // 1. Gastos individuais (só meus)
  const myIndividualExpenses = tripTransactions
    .filter(t => t.type === "EXPENSE" && !t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  // 2. Gastos compartilhados que eu paguei (saiu integral da minha conta)
  const whatIPaidFromPocket = tripTransactions
    .filter(t => t.type === "EXPENSE" && t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // 3. O que os outros já me pagaram de volta (recebimentos de acerto de despesas que eu paguei)
  const whatIReceivedFromSettlements = tripTransactions
    .filter(t => t.type === "EXPENSE" && t.is_shared && (t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => {
      if (!t.transaction_splits) return sum;
      const othersSettledSplits = t.transaction_splits.filter(
        (s: any) => s.user_id !== user?.id && s.is_settled === true
      );
      const settledAmount = othersSettledSplits.reduce((acc: number, s: any) => acc + Number(s.amount), 0);
      return sum + settledAmount;
    }, 0);

  // 4. O que eu paguei para os outros (pagamentos de acerto de despesas que outros pagaram)
  const whatIPaidToSettle = tripTransactions
    .filter(t => t.type === "EXPENSE" && t.is_shared && !(t.creator_user_id === user?.id || t.user_id === user?.id))
    .reduce((sum, t) => {
      if (!t.transaction_splits) return sum;
      const mySettledSplits = t.transaction_splits.filter(
        (s: any) => s.user_id === user?.id && s.is_settled === true
      );
      const paidAmount = mySettledSplits.reduce((acc: number, s: any) => acc + Number(s.amount), 0);
      return sum + paidAmount;
    }, 0);
  
  // myTotalSpent = o que efetivamente saiu do meu bolso e ainda não voltou
  const myTotalSpent = myIndividualExpenses + whatIPaidFromPocket - whatIReceivedFromSettlements + whatIPaidToSettle;

  return (
    <div className="space-y-6 animate-fade-in">
      <TripDetailHeader trip={trip} permissions={permissions} onBack={onBack} onEdit={onEdit} onAddParticipant={onAddParticipant} onArchive={onArchive} onUnarchive={onUnarchive} onDelete={onDelete} onOpenBudget={onOpenBudget} hasPersonalBudget={!!myPersonalBudget} onExportPDF={onExportPDF} onExportExcel={onExportExcel} />
      <TripDetailSummary totalExpenses={totalExpenses} myTotalSpent={myTotalSpent} myPersonalBudget={myPersonalBudget} startDate={trip.start_date} endDate={trip.end_date} currency={trip.currency} formatCurrency={formatCurrency} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto no-scrollbar mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1 gap-2"><TrendingUp className="h-4 w-4" /> Resumo</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1 gap-2"><DollarSign className="h-4 w-4" /> Gastos</TabsTrigger>
            <TabsTrigger value="shopping" className="flex-1 gap-2"><ShoppingCart className="h-4 w-4" /> Compras</TabsTrigger>
            {trip.currency !== "BRL" && <TabsTrigger value="exchange" className="flex-1 gap-2"><Plane className="h-4 w-4" /> Câmbio</TabsTrigger>}
            <TabsTrigger value="itinerary" className="flex-1 gap-2"><Route className="h-4 w-4" /> Roteiro</TabsTrigger>
            <TabsTrigger value="checklist" className="flex-1 gap-2"><ListChecks className="h-4 w-4" /> Checklist</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary"><TripSummaryTab selectedTrip={trip} totalExpenses={totalExpenses} myTotalSpent={myTotalSpent} myPersonalBudget={myPersonalBudget} participants={participants} balances={balances} tripTransactions={tripTransactions} tripFinancialSummary={tripFinancialSummary} user={user} onAddParticipant={onAddParticipant} permissions={permissions} dateFns={dateFns} ptBR={ptBR} onRemoveClick={onRemoveParticipantClick} /></TabsContent>
        <TabsContent value="expenses"><TripExpensesTab tripTransactions={tripTransactions} participants={participants} selectedTrip={trip} user={user} formatCurrency={formatCurrency} balances={balances} myTotalSpent={myTotalSpent} /></TabsContent>
        <TabsContent value="shopping"><TripShopping trip={trip} onUpdateTrip={onUpdateTrip} isUpdating={false} /></TabsContent>
        {trip.currency !== "BRL" && <TabsContent value="exchange"><TripExchange trip={trip} totalExpenses={totalExpenses} /></TabsContent>}
        <TabsContent value="itinerary"><TripItinerary tripId={trip.id} /></TabsContent>
        <TabsContent value="checklist"><TripChecklist tripId={trip.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
