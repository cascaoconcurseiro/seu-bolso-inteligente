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
  created_at: string;
  updated_at: string;
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
}

export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
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

      const { data, error } = await supabase
        .from("trip_participants")
        .select("*")
        .eq("trip_id", tripId)
        .order("name");

      if (error) throw error;
      return data as TripParticipant[];
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

      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar o criador como participante
      await supabase.from("trip_participants").insert({
        trip_id: data.id,
        user_id: user.id,
        name: "Eu",
      });

      return data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem criada com sucesso!");
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
export function useTripTransactions(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-transactions", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(name, bank_color),
          category:categories(name, icon)
        `)
        .eq("trip_id", tripId)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!tripId,
  });
}
