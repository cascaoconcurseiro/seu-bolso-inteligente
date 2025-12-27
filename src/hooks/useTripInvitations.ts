import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("trip_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar convites:", error);
        throw error;
      }

      if (data && data.length > 0) {
        // Buscar IDs únicos para os dados complementares
        const tripIds = [...new Set(data.map(inv => inv.trip_id))];
        const inviterIds = [...new Set(data.map(inv => inv.inviter_id))];

        console.log("� Buscando viagens e perfis separadamente...");

        // Buscar Viagens e Profiles em paralelo para performance
        const [tripsResult, profilesResult] = await Promise.all([
          supabase
            .from("trips")
            .select("name, destination, start_date, end_date, id")
            .in("id", tripIds),
          supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", inviterIds)
        ]);

        if (tripsResult.error) console.error("Erro ao buscar viagens:", tripsResult.error);
        if (profilesResult.error) console.error("Erro ao buscar perfis:", profilesResult.error);

        const tripsMap = new Map(tripsResult.data?.map(t => [t.id, t]) || []);
        const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);

        const enrichedData = data.map(inv => ({
          ...inv,
          trips: tripsMap.get(inv.trip_id),
          inviter: profilesMap.get(inv.inviter_id)
        }));

        return enrichedData as TripInvitation[];
      }

      return data as TripInvitation[];
    },
    enabled: !!user,
    retry: 1, // Limitar retentativas para evitar looping agressivo
    staleTime: 60000, // Cache por 1 minuto para evitar re-buscas imediatas
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Desativar para evitar loops ao trocar de aba/janela
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
        .select("id, trip_id, inviter_id, invitee_id, status, message, created_at, updated_at, responded_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar dados dos invitees separadamente
      if (data && data.length > 0) {
        const inviteeIds = [...new Set(data.map(inv => inv.invitee_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", inviteeIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return data.map(inv => ({
          ...inv,
          invitee: profilesMap.get(inv.invitee_id)
        }));
      }

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
      // Primeiro, atualizar o status
      const { data: updateData, error: updateError } = await supabase
        .from("trip_invitations")
        .update({ status: 'accepted' })
        .eq("id", invitationId)
        .select("id, trip_id, inviter_id, invitee_id, status")
        .single();

      if (updateError) throw updateError;

      // Depois, buscar dados complementares separadamente para evitar ambiguidade
      if (updateData) {
        const [tripResult, inviterResult] = await Promise.all([
          supabase
            .from("trips")
            .select("name, destination")
            .eq("id", updateData.trip_id)
            .single(),
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", updateData.inviter_id)
            .single()
        ]);

        return {
          ...updateData,
          trips: tripResult.data,
          inviter: inviterResult.data
        };
      }

      return updateData;
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
