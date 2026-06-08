import { moneyUtils } from "@/utils/money";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTrips, useTrip, useTripParticipants, useTripTransactions, useTripFinancialSummary, useCreateTrip, useUpdateTrip, useDeleteTrip, useArchiveTrip, useUnarchiveTrip, useTripParticipantBalances, useRemoveTripParticipant } from "@/hooks/useTrips";
import { useFamilyMembers } from "@/hooks/useFamily";
import { NewTripDialog } from "@/components/trips/NewTripDialog";
import { useTripMembers, useTripPermissions, useUpdatePersonalBudget } from "@/hooks/useTripMembers";
import { EditTripDialog } from "@/components/trips/EditTripDialog";

import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import { AddParticipantDialog } from "@/components/trips/AddParticipantDialog";
import { useCreateTripInvitation, useSentTripInvitations, useCancelTripInvitation } from "@/hooks/useTripInvitations";
import { TripEmptyState } from "@/components/trips/TripEmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { TripListView } from "@/components/trips/TripListView";
import { TripDetailView } from "@/components/trips/TripDetailView";
import { exportTripToPDF, exportTripToExcel } from "@/utils/tripExport";
import { useQueryClient } from "@tanstack/react-query";
import { useAccounts } from "@/hooks/useAccounts";
import { RemoveParticipantDialog } from "@/components/trips/RemoveParticipantDialog";
import { supabase } from "@/integrations/supabase/client";
import { dismissRelatedNotifications } from "@/services/notificationGenerator";


export function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("expenses");
  const [tripFilter, setTripFilter] = useState<"active" | "archived">("active");
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);

  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  
  const [removingParticipant, setRemovingParticipant] = useState<any | null>(null);
  const [removingParticipantBalance, setRemovingParticipantBalance] = useState<any | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemovingState, setIsRemovingState] = useState(false);
  
  const [tripName, setTripName] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripCurrency, setTripCurrency] = useState("BRL");

  const { data: trips = [], isLoading } = useTrips();
  const { data: selectedTrip } = useTrip(selectedTripId);
  const { data: participants = [] } = useTripParticipants(selectedTripId);
  const { data: tripTransactions = [] } = useTripTransactions(selectedTripId);
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: tripMembers = [] } = useTripMembers(selectedTripId);
  const { data: permissions } = useTripPermissions(selectedTripId);
  const { data: tripFinancialSummary } = useTripFinancialSummary(selectedTripId);
  const { data: participantBalances = [] } = useTripParticipantBalances(selectedTripId);
  
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();
  const archiveTrip = useArchiveTrip();
  const unarchiveTrip = useUnarchiveTrip();
  const createInvitation = useCreateTripInvitation();
  const { data: sentInvitations = [] } = useSentTripInvitations(selectedTripId);
  const pendingInvitations = sentInvitations.filter((inv: any) => inv.status === 'pending');
  const cancelInvitation = useCancelTripInvitation();

  const removeParticipant = useRemoveTripParticipant();
  const { data: accounts = [] } = useAccounts();

  const handleConfirmDirectRemove = async () => {
    if (!removingParticipant || !selectedTripId) return;
    setIsRemovingState(true);
    try {
      await removeParticipant.mutateAsync({
        id: removingParticipant.member_id,
        tripId: selectedTripId
      });
      queryClient.invalidateQueries({ queryKey: ["trip-participants", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-participant-balances", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-financial-summary", selectedTripId] });
      await dismissRelatedNotifications(user!.id, removingParticipant.member_id, 'family_member');
      setShowRemoveDialog(false);
      setRemovingParticipant(null);
      setRemovingParticipantBalance(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemovingState(false);
    }
  };

  const handleConfirmSettleRemove = async (accountId: string) => {
    if (!removingParticipant || !selectedTripId || !removingParticipantBalance || !user) return;
    setIsRemovingState(true);
    try {
      const balanceVal = removingParticipantBalance.balance;
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        creator_user_id: user.id,
        account_id: accountId,
        amount: Math.abs(balanceVal),
        type: balanceVal < 0 ? "INCOME" : "EXPENSE",
        description: `Acerto de Contas - Remoção de ${removingParticipant.name}`,
        date: new Date().toISOString().split("T")[0],
        competence_date: new Date().toISOString().slice(0, 7) + "-01",
        domain: "TRAVEL",
        trip_id: selectedTripId,
        is_shared: false,
        is_settled: true,
        payer_id: balanceVal < 0 ? (removingParticipant.user_id || removingParticipant.id) : user.id,
        currency: selectedTrip.currency || 'BRL',
      });

      if (txError) throw txError;

      await removeParticipant.mutateAsync({
        id: removingParticipant.member_id,
        tripId: selectedTripId
      });

      queryClient.invalidateQueries({ queryKey: ["trip-participants", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-participant-balances", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-transactions", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-financial-summary", selectedTripId] });

      await dismissRelatedNotifications(user!.id, removingParticipant.member_id, 'family_member');
      setShowRemoveDialog(false);
      setRemovingParticipant(null);
      setRemovingParticipantBalance(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemovingState(false);
    }
  };

  const handleConfirmForgiveRemove = async () => {
    if (!removingParticipant || !selectedTripId || !removingParticipantBalance || !user) return;
    setIsRemovingState(true);
    try {
      const balanceVal = removingParticipantBalance.balance;
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        creator_user_id: user.id,
        amount: Math.abs(balanceVal),
        type: balanceVal < 0 ? "EXPENSE" : "INCOME",
        description: `Ajuste Contábil (Perdão de Dívida) - Remoção de ${removingParticipant.name}`,
        date: new Date().toISOString().split("T")[0],
        competence_date: new Date().toISOString().slice(0, 7) + "-01",
        domain: "TRAVEL",
        trip_id: selectedTripId,
        is_shared: true,
        is_settled: true,
        payer_id: user.id,
        currency: selectedTrip.currency || 'BRL',
      });

      if (txError) throw txError;

      await removeParticipant.mutateAsync({
        id: removingParticipant.member_id,
        tripId: selectedTripId
      });

      queryClient.invalidateQueries({ queryKey: ["trip-participants", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-participant-balances", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-transactions", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-financial-summary", selectedTripId] });

      await dismissRelatedNotifications(user!.id, removingParticipant.member_id, 'family_member');
      setShowRemoveDialog(false);
      setRemovingParticipant(null);
      setRemovingParticipantBalance(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemovingState(false);
    }
  };

  // Removed unused useSharedFinances call

  const balances = useMemo(() => {
    return participantBalances.map(pb => ({
      participantId: pb.user_id || pb.participant_id,
      name: pb.name,
      paid: Number(pb.paid),
      owes: Number(pb.owes),
      balance: Number(pb.balance),
      currency: pb.currency
    }));
  }, [participantBalances]);

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-10 w-36 rounded-xl" />
            <div className="skeleton h-4 w-64 rounded-lg" />
          </div>
          <div className="skeleton h-11 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
      </div>
    </div>
  );

  if (view === "detail" && selectedTrip) {
    return (
      <div className="animate-fade-in space-y-6">
        <TripDetailView 
          trip={selectedTrip} 
          permissions={permissions} 
          participants={participants} 
          tripTransactions={tripTransactions} 
          tripFinancialSummary={tripFinancialSummary} 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          myPersonalBudget={selectedTrip.budget || null} 
          balances={balances} 
          onBack={() => { setView("list"); setSelectedTripId(null); }} 
          onEdit={() => setShowEditTripDialog(true)} 
          onAddParticipant={() => setShowAddParticipantDialog(true)} 
          onArchive={async () => { await archiveTrip.mutateAsync(selectedTripId!); setView("list"); }} 
          onUnarchive={() => unarchiveTrip.mutate(selectedTripId!)} 
          onDelete={() => { if (confirm("Excluir viagem?")) { deleteTrip.mutate(selectedTripId!); setView("list"); } }} 
          onOpenBudget={() => setShowEditTripDialog(true)} 
          onUpdateTrip={async (u) => { await updateTrip.mutateAsync({ id: selectedTrip.id, ...u }); }} 
          formatCurrency={(val, cur) => moneyUtils.format(val, cur || 'BRL')} 
          onExportPDF={() => exportTripToPDF({ trip: selectedTrip, participants, tripTransactions, balances, user })}
          onExportExcel={() => exportTripToExcel({ trip: selectedTrip, participants, tripTransactions, balances, user })}
          onRemoveParticipantClick={(p, b) => {
            setRemovingParticipant(p);
            setRemovingParticipantBalance(b);
            setShowRemoveDialog(true);
          }}
          pendingInvitations={pendingInvitations}
          onCancelInvitation={cancelInvitation.mutate}
        />
        
        <RemoveParticipantDialog
          open={showRemoveDialog}
          onOpenChange={setShowRemoveDialog}
          participant={removingParticipant}
          balance={removingParticipantBalance}
          onConfirmDirectRemove={handleConfirmDirectRemove}
          onConfirmSettleRemove={handleConfirmSettleRemove}
          onConfirmForgiveRemove={handleConfirmForgiveRemove}
          isRemoving={isRemovingState}
          currency={selectedTrip.currency || 'BRL'}
          accounts={accounts}
        />
        
        <AddParticipantDialog 
          open={showAddParticipantDialog} 
          onOpenChange={setShowAddParticipantDialog} 
          availableMembers={familyMembers.filter(m => m.linked_user_id && !participants.some(p => p.user_id === m.linked_user_id) && m.linked_user_id !== user?.id)} 
          onAdd={async (m) => { 
            if (selectedTripId && m.linked_user_id) { 
              try {
                await createInvitation.mutateAsync({ 
                  tripId: selectedTripId, 
                  inviteeId: m.linked_user_id, 
                  message: `Você foi convidado para participar da viagem "${selectedTrip?.name}"!` 
                }); 
                setShowAddParticipantDialog(false); 
              } catch (err) {
                // Erro já é tratado no hook (exibe o toast amigável)
              }
            } 
          }} 
          onNavigateToFamily={() => { setShowAddParticipantDialog(false); navigate("/familia"); }} 
          getInitials={(n) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2)} 
        />
        
        <EditTripDialog 
          open={showEditTripDialog} 
          onOpenChange={setShowEditTripDialog} 
          trip={selectedTrip} 
          onSubmit={async (d) => { await updateTrip.mutateAsync({ id: selectedTripId!, ...d }); setShowEditTripDialog(false); }} 
          isLoading={updateTrip.isPending} 
        />
        

      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">Viagens</h1>
            <p className="text-muted-foreground mt-1 font-medium">Organize despesas e roteiros em grupo</p>
          </div>
          <Button 
            size="lg" 
            onClick={() => setShowNewTripDialog(true)}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-11 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
            Nova Viagem
          </Button>
        </div>
      </div>

      <PendingTripInvitationsAlert />

      {trips.length === 0 ? (
        <TripEmptyState onCreateClick={() => setShowNewTripDialog(true)} />
      ) : (
        <TripListView 
          trips={trips} 
          tripFilter={tripFilter} 
          setTripFilter={setTripFilter} 
          onTripClick={(id) => { setSelectedTripId(id); setView("detail"); setActiveTab("summary"); }} 
          onUnarchive={(id) => unarchiveTrip.mutate(id)} 
        />
      )}

      <NewTripDialog 
        open={showNewTripDialog} 
        onOpenChange={setShowNewTripDialog} 
        onSubmit={async (mids) => { 
          await createTrip.mutateAsync({ 
            name: tripDestination, 
            destination: tripDestination, 
            start_date: tripStartDate, 
            end_date: tripEndDate, 
            budget: tripBudget ? parseFloat(tripBudget) : undefined, 
            currency: tripCurrency, 
            memberIds: mids 
          }); 
          setShowNewTripDialog(false); 
          setTripName(""); 
          setTripDestination(""); 
          setTripStartDate(""); 
          setTripEndDate(""); 
          setTripBudget(""); 
          setTripCurrency("BRL"); 
        }} 
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
