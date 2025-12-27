import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TripInvitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  trips?: {
    name: string;
    destination: string | null;
    start_date: string;
    end_date: string;
  };
  inviter?: {
    full_name: string | null;
    email: string;
  };
}

// Hook para buscar convites recebidos pendentes
export function usePendingTripInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-trip-invitations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("trip_invitations")
        .select(`
          *,
          trips:trip_id (
            name,
            destination,
            start_date,
            end_date
          ),
          inviter:inviter_id (
            full_name,
            email
          )
        `)
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TripInvitation[];
    },
    enabled: !!user,
  });
}

// Hook para buscar convites enviados
export function useSentTripInvitations(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sent-trip-invitations", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from("trip_invitations")
        .select(`
          *,
          invitee:invitee_id (
            full_name,
            email
          )
        `)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!tripId,
  });
}

// Hook para criar convite
export function useCreateTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      inviteeId,
      message,
    }: {
      tripId: string;
      inviteeId: string;
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from("trip_invitations")
        .insert({
          trip_id: tripId,
          invitee_id: inviteeId,
          message: message || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-trip-invitations"] });
      toast.success("Convite enviado!");
    },
    onError: (error: any) => {
      console.error("Erro ao enviar convite:", error);
      toast.error("Erro ao enviar convite: " + error.message);
    },
  });
}

// Hook para aceitar convite
export function useAcceptTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from("trip_invitations")
        .update({ status: 'accepted' })
        .eq("id", invitationId)
        .select(`
          *,
          trips:trip_id (
            name,
            destination
          ),
          inviter:inviter_id (
            full_name
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["pending-trip-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip-members"] });
      
      const tripName = data.trips?.name || "viagem";
      const inviterName = data.inviter?.full_name || "alguém";
      
      toast.success(
        `🎉 Você agora faz parte da viagem "${tripName}"!`,
        {
          description: `Convite de ${inviterName} aceito. Boa viagem!`,
          duration: 5000,
        }
      );
    },
    onError: (error: any) => {
      console.error("Erro ao aceitar convite:", error);
      toast.error("Erro ao aceitar convite: " + error.message);
    },
  });
}

// Hook para rejeitar convite
export function useRejectTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from("trip_invitations")
        .update({ status: 'rejected' })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-trip-invitations"] });
      toast.success("Convite recusado");
    },
    onError: (error: any) => {
      console.error("Erro ao rejeitar convite:", error);
      toast.error("Erro ao rejeitar convite: " + error.message);
    },
  });
}
