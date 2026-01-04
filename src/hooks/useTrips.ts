import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  name: string;
  personal_budget: number | null;
  created_at: string;
}

export interface CreateTripInput {
  name: string;
  destination?: string;
  start_date: string;
  end_date: string;
  currency?: string;
  budget?: number;
  notes?: string;
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

      const tripIds = memberTrips.map(m => m.trip_id);

      // Buscar as viagens completas
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .in("id", tripIds)
        .order("start_date", { ascending: false });

      if (tripsError) throw tripsError;
      
      if (!trips || trips.length === 0) return [];

      // Buscar orçamentos pessoais para essas viagens (de trip_members)
      const { data: budgets } = await supabase
        .from("trip_members")
        .select("trip_id, personal_budget")
        .eq("user_id", user.id)
        .in("trip_id", tripIds);

      // Mapear orçamentos para viagens
      const budgetMap = new Map(budgets?.map(b => [b.trip_id, b.personal_budget]) || []);
      
      return trips.map(trip => ({
        ...trip,
        my_personal_budget: budgetMap.get(trip.id) || null,
      })) as TripWithPersonalBudget[];
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

export function useTrip(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Trip;
    },
    enabled: !!user && !!id,
  });
}

export function useTripParticipants(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-participants", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      // CORREÇÃO: Usar trip_members ao invés de trip_participants
      // trip_members é a tabela real com os membros da viagem
      const { data, error } = await supabase
        .from("trip_members")
        .select(`
          id,
          trip_id,
          user_id,
          role,
          personal_budget,
          created_at
        `)
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) throw error;
      
      // Buscar informações dos usuários para cada membro
      const participantsWithNames = await Promise.all(
        (data || []).map(async (member) => {
          // Buscar nome do usuário
          const { data: userData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", member.user_id)
            .single();
          
          return {
            id: member.id,
            trip_id: member.trip_id,
            user_id: member.user_id,
            member_id: null, // trip_members não tem member_id
            name: userData?.full_name || "Usuário",
            personal_budget: member.personal_budget,
            created_at: member.created_at,
          } as TripParticipant;
        })
      );
      
      return participantsWithNames;
    },
    enabled: !!user && !!tripId,
  });
}

export function useCreateTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      if (!user) throw new Error("User not authenticated");

      const { memberIds, ...tripData } = input;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user.id,
          ...tripData,
        })
        .select()
        .single();

      if (error) throw error;

      // Owner é adicionado automaticamente via trigger add_trip_owner()

      // Criar convites para membros selecionados
      if (memberIds && memberIds.length > 0) {
        const invitations = memberIds.map(userId => ({
          trip_id: data.id,
          inviter_id: user.id,
          invitee_id: userId,
          message: `Você foi convidado para participar da viagem "${data.name}"!`,
        }));

        const { error: invitationsError } = await supabase
          .from("trip_invitations")
          .insert(invitations);

        if (invitationsError) {
          console.error("Erro ao criar convites:", invitationsError);
          toast.warning(
            `Viagem criada, mas houve erro ao enviar convites: ${invitationsError.message}`,
            { duration: 5000 }
          );
        } else {
          toast.success(
            `Viagem criada com sucesso! ${memberIds.length} convite(s) enviado(s).`,
            { duration: 3000 }
          );
        }
      } else {
        // Sem convites, apenas sucesso simples
        toast.success("Viagem criada com sucesso!");
      }

      return data as Trip;
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
    mutationFn: async ({ id, ...input }: Partial<Trip> & { id: string }) => {
      const { data, error } = await supabase
        .from("trips")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Trip;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip", data.id] });
      toast.success("Viagem atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar viagem: " + error.message);
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover viagem: " + error.message);
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
          archived_at: new Date().toISOString()
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
    onError: (error) => {
      toast.error("Erro ao arquivar viagem: " + error.message);
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
          archived_at: null
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

export function useAddTripParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      name,
      userId,
      memberId,
      personalBudget,
    }: {
      tripId: string;
      name: string;
      userId?: string;
      memberId?: string;
      personalBudget?: number;
    }) => {
      const { data, error } = await supabase
        .from("trip_participants")
        .insert({
          trip_id: tripId,
          name,
          user_id: userId,
          member_id: memberId,
          personal_budget: personalBudget,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TripParticipant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trip-participants", variables.tripId] });
      toast.success("Participante adicionado!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar participante: " + error.message);
    },
  });
}

export function useRemoveTripParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from("trip_participants")
        .delete()
        .eq("id", id);

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
// IMPORTANTE: Busca TODAS as transações da viagem, não apenas do usuário atual
// Isso inclui despesas compartilhadas pagas por outros participantes
export function useTripTransactions(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-transactions", tripId],
    queryFn: async () => {
      if (!tripId || !user) return [];

      // Buscar TODAS as transações desta viagem
      // Inclui transações de todos os participantes (despesas compartilhadas)
      // Exclui apenas transações espelho (source_transaction_id não nulo)
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(name, bank_id),
          category:categories(name, icon)
        `)
        .eq("trip_id", tripId)
        .is("source_transaction_id", null) // Excluir transações espelho
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!tripId,
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

      const { data, error } = await supabase.rpc('get_trip_financial_summary', {
        p_trip_id: tripId,
      });

      if (error) throw error;
      return data?.[0] as TripFinancialSummary | null;
    },
    enabled: !!user && !!tripId,
  });
}

// Hook para calcular gasto pessoal em uma viagem
export function useMyTripSpent(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-trip-spent", tripId, user?.id],
    queryFn: async () => {
      if (!tripId || !user) return 0;

      const { data, error } = await supabase.rpc('calculate_trip_spent', {
        p_trip_id: tripId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!user && !!tripId,
  });
}
