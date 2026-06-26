import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createTripInviteNotification } from '@/services/notificationService';

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
    queryKey: ['pending-trip-invitations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_invitations')
        .select('*, trips(*), inviter:profiles!inviter_id(full_name, email)')
        .eq('invitee_id', user!.id)
        .eq('status', 'pending');

      if (error) {
        logger.error('Erro ao buscar convites pendentes:', error);
        throw error;
      }

      return data as unknown as TripInvitation[];
    },
    enabled: !!user,
    retry: 1,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}

// Hook para buscar convites enviados
export function useSentTripInvitations(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sent-trip-invitations', tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from('trip_invitations')
        .select(
          'id, trip_id, inviter_id, invitee_id, status, message, created_at, updated_at, responded_at',
        )
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar convites enviados:', error);
        throw error;
      }

      // Buscar dados dos invitees separadamente
      if (data && data.length > 0) {
        const inviteeIds = [...new Set(data.map((inv) => inv.invitee_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', inviteeIds);

        const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        return data.map((inv) => ({
          ...inv,
          invitee: profilesMap.get(inv.invitee_id),
        }));
      }

      return data;
    },
    enabled: !!user && !!tripId,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: 'always',
  });
}

// Hook para criar convite
export function useCreateTripInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      // Buscar nome da viagem e do convidador para notificação
      const [{ data: trip }, { data: inviterProfile }] = await Promise.all([
        supabase.from('trips').select('name').eq('id', tripId).single(),
        supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
      ]);

      const { data, error } = await supabase
        .from('trip_invitations')
        .upsert(
          {
            trip_id: tripId,
            inviter_id: user!.id,
            invitee_id: inviteeId,
            message: message || null,
            status: 'pending',
            responded_at: null, // Reseta caso tivesse sido rejeitado no passado
          },
          { onConflict: 'trip_id, invitee_id' },
        )
        .select()
        .single();

      if (error) throw error;

      // Notificar o convidado
      const inviterName = inviterProfile?.full_name || user?.email?.split('@')[0] || 'Alguém';
      const tripName = trip?.name || 'uma viagem';
      try {
        await createTripInviteNotification(inviteeId, tripName, tripId, inviterName);
      } catch (notifErr) {
        logger.error('Erro ao criar notificação para convidado:', notifErr);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-trip-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-trip-invitations'] });
      toast.success('Convite enviado!');
    },
    onError: (error: any) => {
      logger.error('Erro ao enviar convite:', error);
      if (
        error.code === '23505' ||
        error.message?.includes('duplicate key') ||
        error.message?.includes('unique constraint')
      ) {
        toast.error('Este usuário já foi convidado para esta viagem.');
      } else {
        toast.error('Erro ao enviar convite: ' + error.message);
      }
    },
  });
}

// Hook para aceitar convite (Centralizado via RPC)
export function useAcceptTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('fn_respond_trip_invitation', {
        p_invitation_id: invitationId,
        p_status: 'accepted',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-trip-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('🎉 Convite aceito! Você agora faz parte da viagem.');
    },
    onError: (error: Error) => {
      logger.error('Erro ao aceitar convite:', error);
      toast.error('Erro ao aceitar convite');
    },
  });
}

// Hook para rejeitar convite (Centralizado via RPC)
export function useRejectTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('fn_respond_trip_invitation', {
        p_invitation_id: invitationId,
        p_status: 'rejected',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-trip-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.info('Convite recusado.');
    },
    onError: (error: any) => {
      logger.error('Erro ao rejeitar convite:', error);
      toast.error('Erro ao rejeitar convite');
    },
  });
}

export function useCancelTripInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from('trip_invitations').delete().eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-trip-invitations'] });
      toast.success('Convite cancelado.');
    },
    onError: (error: Error) => {
      logger.error('Erro ao cancelar convite:', error);
      toast.error('Erro ao cancelar convite');
    },
  });
}
