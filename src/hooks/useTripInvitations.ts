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
      // console.log('🟣 [usePendingTripInvitations] Buscando convites para user:', user?.id);
      
      if (!user) {
        // console.log('🟣 [usePendingTripInvitations] Sem usuário logado');
        return [];
      }

      const { data, error } = await supabase
        .from("trip_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        // console.error("🟣 [usePendingTripInvitations] Erro ao buscar convites:", error);
        throw error;
      }

      // console.log('🟣 [usePendingTripInvitations] Convites encontrados:', data?.length || 0);

      if (data && data.length > 0) {
        // Buscar IDs únicos para os dados complementares
        const tripIds = [...new Set(data.map(inv => inv.trip_id))];
        const inviterIds = [...new Set(data.map(inv => inv.inviter_id))];

        // console.log('🟣 [usePendingTripInvitations] Buscando dados complementares:', { tripIds, inviterIds });

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

        // if (tripsResult.error) console.error("🟣 [usePendingTripInvitations] Erro ao buscar viagens:", tripsResult.error);
        // if (profilesResult.error) console.error("🟣 [usePendingTripInvitations] Erro ao buscar perfis:", profilesResult.error);

        const tripsMap = new Map(tripsResult.data?.map(t => [t.id, t]) || []);
        const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);

        const enrichedData = data.map(inv => ({
          ...inv,
          trips: tripsMap.get(inv.trip_id),
          inviter: profilesMap.get(inv.inviter_id)
        }));

        // console.log('🟣 [usePendingTripInvitations] Dados enriquecidos:', enrichedData);
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
      // console.error("Erro ao enviar convite:", error);
      toast.error("Erro ao enviar convite: " + error.message);
    },
  });
}

// Hook para aceitar convite
export function useAcceptTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // 1. Buscar dados do convite
      const { data: invitation, error: invError } = await supabase
        .from("trip_invitations")
        .select("id, trip_id, inviter_id, invitee_id")
        .eq("id", invitationId)
        .single();

      if (invError) throw invError;
      if (!invitation) throw new Error("Convite não encontrado");

      // 2. Atualizar status do convite
      const { error: updateError } = await supabase
        .from("trip_invitations")
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // 3. ADICIONAR USUÁRIO EM TRIP_MEMBERS (CORREÇÃO PRINCIPAL)
      const { error: memberError } = await supabase
        .from("trip_members")
        .insert({
          trip_id: invitation.trip_id,
          user_id: invitation.invitee_id,
          role: 'member',
          can_edit_details: false,
          can_manage_expenses: true,
        });

      if (memberError) {
        // Se já existe, ignorar erro de duplicata
        if (!memberError.message.includes('duplicate')) {
          throw memberError;
        }
      }

      // 4. Buscar dados para notificação
      const [tripResult, inviterResult] = await Promise.all([
        supabase
          .from("trips")
          .select("name, destination")
          .eq("id", invitation.trip_id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invitation.inviter_id)
          .single()
      ]);

      return {
        ...invitation,
        trips: tripResult.data,
        inviter: inviterResult.data
      };
    },
    onSuccess: (data) => {
      // Invalidar queries em batch
      queryClient.invalidateQueries({ queryKey: ["pending-trip-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip-members", data.trip_id] });

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
      // console.error("Erro ao aceitar convite:", error);
      toast.error("Erro ao aceitar convite: " + error.message);
    },
  });
}

// Hook para rejeitar convite
export function useRejectTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // 1. Buscar dados do convite antes de atualizar
      const { data: invitation, error: invError } = await supabase
        .from("trip_invitations")
        .select("id, trip_id, inviter_id, invitee_id")
        .eq("id", invitationId)
        .single();

      if (invError) throw invError;
      if (!invitation) throw new Error("Convite não encontrado");

      // 2. Atualizar status
      const { error: updateError } = await supabase
        .from("trip_invitations")
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // 3. Buscar dados para notificação detalhada
      const [tripResult, inviterResult] = await Promise.all([
        supabase
          .from("trips")
          .select("name, destination")
          .eq("id", invitation.trip_id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invitation.inviter_id)
          .single()
      ]);

      return {
        ...invitation,
        trips: tripResult.data,
        inviter: inviterResult.data
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-trip-invitations"] });
      
      const tripName = data.trips?.name || "viagem";
      const inviterName = data.inviter?.full_name || "alguém";

      toast.info(
        `Convite recusado`,
        {
          description: `Você recusou o convite de ${inviterName} para "${tripName}"`,
          duration: 5000,
        }
      );
    },
    onError: (error: any) => {
      // console.error("Erro ao rejeitar convite:", error);
      toast.error("Erro ao rejeitar convite: " + error.message);
    },
  });
}
