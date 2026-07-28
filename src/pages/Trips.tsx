import { TripFormDialog } from "@/components/trips/form/TripFormDialog";
import type { TripFormValues } from "@/components/trips/form/tripFormSchema";
import { Button } from "@/components/ui/button";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAddGuestTripMember, useTripPermissions } from "@/hooks/useTripMembers";
import {
  useArchiveTrip,
  useCreateTrip,
  useDeleteTrip,
  useRemoveTripParticipant,
  useTrip,
  useTripFinancialSummary,
  useTripParticipantBalances,
  useTripParticipants,
  useTrips,
  useTripTransactions,
  useUnarchiveTrip,
  useUpdateTrip,
} from "@/hooks/useTrips";
import { moneyUtils } from "@/utils/money";
import {
  getTripRoute,
  getTripTabFromRoute,
  isValidTripRouteTab,
} from "@/utils/frontendFlows";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AddParticipantDialog } from "@/components/trips/AddParticipantDialog";
import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";
import {
  useCancelTripInvitation,
  useCreateTripInvitation,
  useSentTripInvitations,
} from "@/hooks/useTripInvitations";

import { RemoveParticipantDialog } from "@/components/trips/RemoveParticipantDialog";
import { TripDetailView } from "@/components/trips/TripDetailView";
import { TripEmptyState } from "@/components/trips/TripEmptyState";
import { TripListView } from "@/components/trips/TripListView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { dismissRelatedNotifications } from "@/services/notificationGenerator";
import { logger } from "@/utils/logger";
import { exportTripToExcel, exportTripToPDF } from "@/utils/tripExport";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

const EMPTY_TRIP_FORM: TripFormValues = {
  name: "",
  destination: "",
  notes: "",
  startDate: "",
  endDate: "",
  currency: "BRL",
  budget: "",
  coverImage: "",
  memberIds: [],
};

export function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tripId: selectedTripId = null, tab } = useParams<{
    tripId?: string;
    tab?: string;
  }>();
  const queryClient = useQueryClient();
  const activeTab = getTripTabFromRoute(tab);
  const [tripFilter, setTripFilter] = useState<"active" | "archived">("active");
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);

  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);

  const [removingParticipant, setRemovingParticipant] = useState<any | null>(null);
  const [removingParticipantBalance, setRemovingParticipantBalance] = useState<any | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemovingState, setIsRemovingState] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  const { data: trips = [], isLoading, isError, refetch } = useTrips();
  const {
    data: selectedTrip,
    isLoading: isTripLoading,
    isError: isTripError,
  } = useTrip(selectedTripId);

  useEffect(() => {
    if (selectedTripId && !isValidTripRouteTab(tab)) {
      navigate(getTripRoute(selectedTripId, "summary"), { replace: true });
    }
  }, [navigate, selectedTripId, tab]);
  const selectedTripFormValues = useMemo<TripFormValues | null>(
    () =>
      selectedTrip
        ? {
            name: selectedTrip.name,
            destination: selectedTrip.destination || "",
            notes: selectedTrip.notes || "",
            startDate: selectedTrip.start_date,
            endDate: selectedTrip.end_date,
            currency: selectedTrip.currency,
            budget: selectedTrip.budget?.toString() || "",
            coverImage: selectedTrip.cover_image || "",
            memberIds: [],
          }
        : null,
    [selectedTrip]
  );
  const { data: participants = [] } = useTripParticipants(selectedTripId);
  const { data: tripTransactions = [] } = useTripTransactions(selectedTripId);
  const { data: familyMembers = [] } = useFamilyMembers();

  const { data: permissions } = useTripPermissions(selectedTripId);
  const { data: tripFinancialSummary } = useTripFinancialSummary(selectedTripId);
  const { data: participantBalances = [] } = useTripParticipantBalances(selectedTripId);

  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();
  const archiveTrip = useArchiveTrip();
  const unarchiveTrip = useUnarchiveTrip();
  const createInvitation = useCreateTripInvitation();
  const addGuestMember = useAddGuestTripMember();
  const { data: sentInvitations = [] } = useSentTripInvitations(selectedTripId);
  const pendingInvitations = sentInvitations.filter((inv: any) => inv.status === "pending");
  const cancelInvitation = useCancelTripInvitation();

  const removeParticipant = useRemoveTripParticipant();
  const { data: accounts = [] } = useAccounts();

  const handleConfirmDirectRemove = async () => {
    if (!removingParticipant || !selectedTripId) return;
    setIsRemovingState(true);
    try {
      await removeParticipant.mutateAsync({
        id: removingParticipant.member_id,
        tripId: selectedTripId,
      });
      queryClient.invalidateQueries({ queryKey: ["trip-participants", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-participant-balances", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-financial-summary", selectedTripId] });
      await dismissRelatedNotifications(user!.id, removingParticipant.member_id, "family_member");
      setShowRemoveDialog(false);
      setRemovingParticipant(null);
      setRemovingParticipantBalance(null);
      toast.success("Membro removido da viagem com sucesso");
    } catch (err: any) {
      logger.error(err);
      toast.error(err.message || "Erro ao remover membro da viagem");
    } finally {
      setIsRemovingState(false);
    }
  };

  const handleConfirmSettleRemove = async (accountId: string) => {
    if (
      !removingParticipant ||
      !selectedTripId ||
      !removingParticipantBalance ||
      !user ||
      !selectedTrip
    )
      return;
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
        payer_id: balanceVal < 0 ? removingParticipant.user_id || removingParticipant.id : user.id,
        currency: selectedTrip.currency || "BRL",
      });

      if (txError) throw txError;

      await removeParticipant.mutateAsync({
        id: removingParticipant.member_id,
        tripId: selectedTripId,
      });

      queryClient.invalidateQueries({ queryKey: ["trip-participants", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-participant-balances", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-transactions", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-financial-summary", selectedTripId] });

      await dismissRelatedNotifications(user!.id, removingParticipant.member_id, "family_member");
      setShowRemoveDialog(false);
      setRemovingParticipant(null);
      setRemovingParticipantBalance(null);
      toast.success("Membro removido e acerto de contas registrado");
    } catch (err: any) {
      logger.error(err);
      toast.error(err.message || "Erro ao remover membro e acertar contas");
    } finally {
      setIsRemovingState(false);
    }
  };

  const handleConfirmForgiveRemove = async () => {
    if (
      !removingParticipant ||
      !selectedTripId ||
      !removingParticipantBalance ||
      !user ||
      !selectedTrip
    )
      return;
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
        currency: selectedTrip.currency || "BRL",
      });

      if (txError) throw txError;

      await removeParticipant.mutateAsync({
        id: removingParticipant.member_id,
        tripId: selectedTripId,
      });

      queryClient.invalidateQueries({ queryKey: ["trip-participants", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-participant-balances", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-transactions", selectedTripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-financial-summary", selectedTripId] });

      await dismissRelatedNotifications(user!.id, removingParticipant.member_id, "family_member");
      setShowRemoveDialog(false);
      setRemovingParticipant(null);
      setRemovingParticipantBalance(null);
      toast.success("Membro removido e dívida perdoada");
    } catch (err: any) {
      logger.error(err);
      toast.error(err.message || "Erro ao remover membro e perdoar dívida");
    } finally {
      setIsRemovingState(false);
    }
  };

  // Removed unused useSharedFinances call

  const balances = useMemo(() => {
    return participantBalances.map((pb) => ({
      participantId: pb.user_id || pb.participant_id,
      name: pb.name,
      paid: Number(pb.paid),
      owes: Number(pb.owes),
      balance: Number(pb.balance),
      currency: pb.currency,
    }));
  }, [participantBalances]);

  if (isLoading)
    return (
      <div className="space-y-8 animate-fade-in pb-20">
        <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 border border-border/50 bg-card/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="skeleton h-10 w-36 rounded-xl" />
              <div className="skeleton h-4 w-64 rounded-xl" />
            </div>
            <div className="skeleton h-12 w-36 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );

  if (selectedTripId && isTripLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Carregando viagem</span>
      </div>
    );
  }

  if (selectedTripId && (isTripError || !selectedTrip)) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Viagem não encontrada"
        description="Ela pode ter sido removida ou você não possui acesso."
        variant="danger"
        action={
          <Button onClick={() => navigate("/viagens")} className="h-11">
            Voltar para viagens
          </Button>
        }
      />
    );
  }

  if (selectedTripId && selectedTrip && selectedTripFormValues) {
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
          setActiveTab={(nextTab) => navigate(getTripRoute(selectedTripId, nextTab))}
          myPersonalBudget={selectedTrip.budget || null}
          balances={balances}
          onBack={() => {
            navigate("/viagens");
          }}
          onEdit={() => setShowEditTripDialog(true)}
          onAddParticipant={() => setShowAddParticipantDialog(true)}
          onArchive={async () => {
            try {
              await archiveTrip.mutateAsync(selectedTripId!);
              navigate("/viagens");
            } catch {
              /* onError do hook */
            }
          }}
          onUnarchive={async () => {
            try {
              await unarchiveTrip.mutateAsync(selectedTripId!);
              toast.success("Viagem desarquivada com sucesso!");
            } catch (err: any) {
              toast.error(err.message || "Erro ao desarquivar viagem");
            }
          }}
          onDelete={() => {
            setTripToDelete(selectedTripId!);
            setShowDeleteConfirm(true);
          }}
          onOpenBudget={() => setShowEditTripDialog(true)}
          onUpdateTrip={async (u) => {
            try {
              await updateTrip.mutateAsync({ id: selectedTrip.id, ...u });
            } catch {
              /* onError do hook */
            }
          }}
          formatCurrency={(val, cur) => moneyUtils.format(val, cur || "BRL")}
          onExportPDF={() => {
            if (user)
              exportTripToPDF({
                trip: selectedTrip,
                participants,
                tripTransactions,
                balances,
                user,
              });
          }}
          onExportExcel={() => {
            if (user)
              exportTripToExcel({
                trip: selectedTrip,
                participants,
                tripTransactions,
                balances,
                user,
              });
          }}
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
          currency={selectedTrip.currency || "BRL"}
          accounts={accounts}
        />

        <AddParticipantDialog
          open={showAddParticipantDialog}
          onOpenChange={setShowAddParticipantDialog}
          availableMembers={familyMembers.filter(
            (m) =>
              m.linked_user_id &&
              !participants.some((p) => p.user_id === m.linked_user_id) &&
              m.linked_user_id !== user?.id
          )}
          currentParticipantNames={participants.map((p) => p.name)}
          onAdd={async (m) => {
            if (selectedTripId && m.linked_user_id) {
              try {
                await createInvitation.mutateAsync({
                  tripId: selectedTripId,
                  inviteeId: m.linked_user_id,
                });
                setShowAddParticipantDialog(false);
              } catch (err) {
                // Erro já é tratado no hook (exibe o toast amigável)
              }
            }
          }}
          onAddGuest={async (guestName) => {
            if (selectedTripId) {
              try {
                await addGuestMember.mutateAsync({ tripId: selectedTripId, guestName });
                setShowAddParticipantDialog(false);
              } catch {
                /* onError do hook já trata */
              }
            }
          }}
          onNavigateToFamily={() => {
            setShowAddParticipantDialog(false);
            navigate("/familia");
          }}
          getInitials={(n) =>
            n
              .split(" ")
              .map((x) => x[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          }
        />

        <TripFormDialog
          open={showEditTripDialog}
          formKey={selectedTrip.id}
          mode="edit"
          onOpenChange={setShowEditTripDialog}
          initialValues={selectedTripFormValues}
          familyMembers={[]}
          onSubmit={async (tripData) => {
            try {
              const datesChanged =
                tripData.start_date !== selectedTrip.start_date ||
                tripData.end_date !== selectedTrip.end_date;
              if (datesChanged) {
                const { count, error } = await supabase
                  .from("trip_itinerary")
                  .select("id", { count: "exact", head: true })
                  .eq("trip_id", selectedTrip.id)
                  .or(`date.lt.${tripData.start_date},date.gt.${tripData.end_date}`);
                if (error) throw error;
                const { count: reservationCount, error: reservationError } = await supabase
                  .from("trip_reservations")
                  .select("id", { count: "exact", head: true })
                  .eq("trip_id", selectedTrip.id)
                  .or(
                    `starts_at.lt.${tripData.start_date}T00:00:00Z,starts_at.gt.${tripData.end_date}T23:59:59Z`
                  );
                if (reservationError) throw reservationError;
                const dependentCount = (count ?? 0) + (reservationCount ?? 0);
                if (dependentCount) {
                  throw new Error(
                    `${dependentCount} ${dependentCount === 1 ? "item ficaria" : "itens ficariam"} fora do novo período. Reagende atividades e reservas antes de encurtar a viagem.`
                  );
                }
              }
              await updateTrip.mutateAsync({
                id: selectedTripId!,
                name: tripData.name,
                destination: tripData.destination,
                notes: tripData.notes,
                start_date: tripData.start_date,
                end_date: tripData.end_date,
                currency: tripData.currency,
                budget: tripData.budget,
                cover_image: tripData.cover_image,
              });
              setShowEditTripDialog(false);
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            } catch (err) {
              logger.error("Erro ao editar viagem", err);
              throw err;
            }
          }}
        />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Não foi possível carregar suas viagens"
        description="Verifique sua conexão e tente novamente. Nenhum dado foi alterado."
        variant="danger"
        action={
          <Button onClick={() => void refetch()} className="h-11">
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-display font-black text-3xl tracking-tighter">Viagens</h1>
            <p className="text-muted-foreground text-sm font-medium">
              Organize despesas e roteiros em grupo
            </p>
          </div>
          <Button
            size="default"
            onClick={() => setShowNewTripDialog(true)}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-12 w-full sm:w-auto font-bold"
          >
            <Plus className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
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
          onTripClick={(id) => {
            navigate(getTripRoute(id, "summary"));
          }}
          onUnarchive={async (id) => {
            try {
              await unarchiveTrip.mutateAsync(id);
              toast.success("Viagem desarquivada com sucesso!");
            } catch (err: any) {
              toast.error(err.message || "Erro ao desarquivar viagem");
            }
          }}
        />
      )}

      <TripFormDialog
        open={showNewTripDialog}
        formKey="new-trip"
        mode="create"
        onOpenChange={setShowNewTripDialog}
        initialValues={EMPTY_TRIP_FORM}
        familyMembers={familyMembers.filter(
          (member) => member.linked_user_id && member.linked_user_id !== user?.id
        )}
        onSubmit={async (tripData) => {
          try {
            await createTrip.mutateAsync({
              ...tripData,
              budget: tripData.budget,
            });
            setShowNewTripDialog(false);

            // Close keyboard on mobile
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          } catch (err) {
            logger.error("Erro ao criar viagem", err);
            throw err;
          }
        }}
      />
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-border w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir viagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A viagem e todos os seus dados associados serão removidos
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (tripToDelete) {
                  try {
                    await deleteTrip.mutateAsync(tripToDelete);
                    toast.success("Viagem excluída com sucesso");
                    navigate("/viagens");
                    setShowDeleteConfirm(false);
                  } catch (err: any) {
                    toast.error(err.message || "Erro ao excluir viagem");
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[120px]"
              disabled={deleteTrip.isPending}
            >
              {deleteTrip.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {deleteTrip.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
