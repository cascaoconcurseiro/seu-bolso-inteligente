import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { callRPCWithRetry } from "@/utils/supabaseHelpers";
import type { Database } from "@/integrations/supabase/types";
import { fetchDestinationCoverImage } from "@/services/destinationImageService";

export type TripStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Trip {
  id: string;
  owner_id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  currency: string;
  budget: number | null;
  status: TripStatus;
  cover_image: string | null;
  notes: string | null;
  is_archived: boolean | null;
  archived_at: string | null;
  latitude: number | null;
  longitude: number | null;
  itinerary_order_version: number;
  created_at: string;
  updated_at: string;
}

export interface TripWithPersonalBudget extends Trip {
  my_personal_budget: number | null;
}

export interface TripParticipant {
  id: string;
  trip_id: string;
  user_id: string | null;
  member_id: string | null;
  role: string;
  name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  avatar_icon: string | null;
  personal_budget: number | null;
  created_at: string;
}

export type TripUpdateInput = Database["public"]["Tables"]["trips"]["Update"];

export interface CreateTripInput {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  currency?: string;
  budget?: number | null;
  notes?: string | null;
  cover_image?: string | null;
  memberIds?: string[]; // IDs dos membros da família para adicionar
}

export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // CORREÇÃO: Buscar viagens através de trip_members
      const { data: memberTrips, error: memberError } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      if (!memberTrips || memberTrips.length === 0) return [];

      const tripIds = memberTrips.map((m) => m.trip_id);

      // Buscar as viagens completas
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .in("id", tripIds)
        .is("deleted_at", null)
        .order("start_date", { ascending: true });

      if (tripsError) throw tripsError;

      if (!trips || trips.length === 0) return [];

      // Buscar orçamentos pessoais para essas viagens (de trip_members)
      const { data: budgets } = await supabase
        .from("trip_members")
        .select("trip_id, personal_budget")
        .eq("user_id", user.id)
        .in("trip_id", tripIds);

      // Mapear orçamentos para viagens
      const budgetMap = new Map(budgets?.map((b) => [b.trip_id, b.personal_budget]) || []);

      return trips.map((trip) => ({
        ...trip,
        my_personal_budget: budgetMap.get(trip.id) || null,
      })) as unknown as TripWithPersonalBudget[];
    },
    enabled: !!user,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTrip(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();

      if (error) throw error;
      return data as unknown as Trip;
    },
    enabled: !!user && !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTripParticipants(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-participants", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      // CORREÇÃO: Usar um JOIN único com profiles para evitar o problema N+1
      // Incluir guest_name para participantes sem conta (convidados externos)
      const { data, error } = await supabase
        .from("trip_members")
        .select(
          `
          id,
          trip_id,
          user_id,
          guest_name,
          role,
          personal_budget,
          created_at,
          profile:profiles!fk_trip_members_profiles(full_name, avatar_url, avatar_color, avatar_icon)
        `
        )
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) throw error;

      return (data || []).map((member) => ({
        id: member.id,
        trip_id: member.trip_id,
        user_id: member.user_id,
        member_id: member.id, // ID da tabela trip_members
        role: member.role,
        name: member.profile?.full_name || member.guest_name || "Participante",
        avatar_url: member.profile?.avatar_url || null,
        avatar_color: member.profile?.avatar_color || null,
        avatar_icon: member.profile?.avatar_icon || null,
        personal_budget: member.personal_budget,
        created_at: member.created_at,
      })) as TripParticipant[];
    },
    enabled: !!user && !!tripId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      if (!user) throw new Error("User not authenticated");

      const { memberIds, ...tripData } = input;

      let coverImage = tripData.cover_image;
      if (!coverImage) {
        try {
          coverImage = await fetchDestinationCoverImage(tripData.destination || tripData.name);
        } catch {
          coverImage = null;
        }
      }

      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user.id,
          creator_user_id: user.id,
          ...tripData,
          cover_image: coverImage,
        })
        .select()
        .single();

      if (error) throw error;

      // Owner é adicionado automaticamente via trigger add_trip_owner()

      // Criar convites para membros selecionados
      if (memberIds && memberIds.length > 0) {
        const invitations = memberIds.map((userId) => ({
          trip_id: data.id,
          inviter_id: user.id,
          invitee_id: userId,
          message: null,
        }));

        const { error: invitationsError } = await supabase
          .from("trip_invitations")
          .insert(invitations);

        if (invitationsError) {
          logger.error("Erro ao criar convites de viagem:", invitationsError);
          toast.warning(
            `Viagem criada, mas houve erro ao enviar convites: ${invitationsError.message}`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Viagem criada com sucesso! ${memberIds.length} convite(s) enviado(s).`, {
            duration: 3000,
          });
        }
      } else {
        // Sem convites, apenas sucesso simples
        toast.success("Viagem criada com sucesso!");
      }

      return data as unknown as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      // Não mostrar toast aqui se já mostramos acima
    },
    onError: (error) => {
      toast.error("Erro ao criar viagem: " + error.message);
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: TripUpdateInput & { id: string }) => {
      const { data, error } = await supabase
        .from("trips")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Trip;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip", data.id] });
      toast.success("Viagem atualizada!");
    },
    onError: (error: Error) => {
      logger.error("Erro ao atualizar viagem:", error);
      toast.error("Erro ao atualizar viagem");
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem removida!");
    },
    onError: (error: Error) => {
      logger.error("Erro ao remover viagem:", error);
      toast.error("Erro ao remover viagem");
    },
  });
}

export function useArchiveTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("trips")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem arquivada!");
    },
    onError: (error: Error) => {
      logger.error("Erro ao arquivar viagem:", error);
      toast.error("Erro ao arquivar viagem");
    },
  });
}

export function useUnarchiveTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("trips")
        .update({
          is_archived: false,
          archived_at: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem desarquivada!");
    },
    onError: (error) => {
      toast.error("Erro ao desarquivar viagem: " + error.message);
    },
  });
}

export function useRemoveTripParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase.from("trip_members").delete().eq("id", id);

      if (error) throw error;
      return tripId;
    },
    onSuccess: (tripId) => {
      queryClient.invalidateQueries({ queryKey: ["trip-participants", tripId] });
      toast.success("Participante removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover participante: " + error.message);
    },
  });
}

// Hook para buscar transações de uma viagem
// PRIVACIDADE: Cada viajante vê apenas:
//   (a) Todas as despesas compartilhadas (is_shared = true)
//   (b) Suas próprias despesas pessoais (is_shared = false && user_id = meu id)
//   NÃO vê: despesas pessoais de outros participantes
export function useTripTransactions(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-transactions", tripId, user?.id],
    queryFn: async () => {
      if (!tripId || !user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          account:accounts!account_id(name, bank_id),
          category:categories(name, icon),
          transaction_splits:transaction_splits!transaction_id(*)
        `
        )
        .eq("trip_id", tripId)
        .is("source_transaction_id", null)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!tripId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Interface para resumo financeiro da viagem
export interface TripFinancialSummary {
  total_budget: number | null;
  total_spent: number;
  total_settled: number; // Total de acertos feitos
  remaining: number;
  percentage_used: number;
  currency: string;
  participants_count: number;
  transactions_count: number;
}

// Hook para buscar resumo financeiro da viagem (SINGLE SOURCE OF TRUTH)
// O total gasto é calculado diretamente das transações pelo banco de dados
export function useTripFinancialSummary(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-financial-summary", tripId],
    queryFn: async () => {
      if (!tripId) return null;
      try {
        const data = await callRPCWithRetry("get_trip_financial_summary", {
          p_trip_id: tripId,
        });
        return (Array.isArray(data) ? data[0] : data) as TripFinancialSummary;
      } catch (error) {
        logger.error("Erro ao buscar resumo financeiro da viagem:", error);
        throw error;
      }
    },
    enabled: !!user && !!tripId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export interface TripParticipantBalance {
  participant_id: string;
  name: string;
  user_id: string | null;
  paid: number;
  owes: number;
  balance: number;
  currency: string;
}

// Hook para buscar saldos dos participantes da viagem (SSOT)
export function useTripParticipantBalances(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-participant-balances", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      try {
        const data = await callRPCWithRetry("get_trip_participant_balances_v2", {
          p_trip_id: tripId,
        });
        return data as TripParticipantBalance[];
      } catch (error) {
        logger.error("Erro ao buscar saldos dos participantes:", error);
        throw error;
      }
    },
    enabled: !!user && !!tripId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
