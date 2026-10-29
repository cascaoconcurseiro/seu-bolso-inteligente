import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FamilyRole } from "./useFamily";
import { logger } from "@/utils/logger";

export interface FamilyInvitation {
  id: string;
  from_user_id: string;
  to_user_id: string | null;
  to_email: string | null;
  family_id: string;
  member_name: string;
  role: FamilyRole;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  from_user?: {
    full_name: string | null;
  };
}

// Hook para buscar solicitações recebidas (pendentes)
export function usePendingInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-family-invitations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Buscar convites por to_user_id e por email
        const userEmail = user.email?.trim().toLowerCase();
        const [byUser, byEmail] = await Promise.all([
          supabase
            .from("family_invitations")
            .select("*")
            .eq("to_user_id", user.id)
            .eq("status", "pending")
            .eq("deleted", false)
            .order("created_at", { ascending: false }),
          userEmail
            ? supabase
                .from("family_invitations")
                .select("*")
                .eq("to_email", userEmail)
                .eq("status", "pending")
                .eq("deleted", false)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (byUser.error) {
          logger.error("Erro ao buscar convites por usuário:", byUser.error);
        }
        if (byEmail.error) {
          logger.error("Erro ao buscar convites por email:", byEmail.error);
        }

        const rawList = [...(byUser.data || []), ...(byEmail.data || [])];
        const invitations = rawList.filter(
          (invitation, index, all) => all.findIndex((item) => item.id === invitation.id) === index
        );

        if (!invitations || invitations.length === 0) {
          return [];
        }

        // Buscar dados dos usuários que enviaram os convites de forma resiliente
        const fromUserIds = Array.from(
          new Set(invitations.map((inv) => inv.from_user_id).filter(Boolean))
        );
        let profiles: { id: string; full_name: string | null }[] = [];
        if (fromUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", fromUserIds);

          if (profilesError) {
            logger.warn("Aviso ao buscar nomes dos autores de convite:", profilesError);
          } else if (profilesData) {
            profiles = profilesData;
          }
        }

        // Combinar dados garantindo que convites nunca sejam omitidos por falha secundária
        const invitationsWithUsers = invitations.map((inv) => ({
          ...inv,
          from_user: profiles.find((p) => p.id === inv.from_user_id) || null,
        }));

        return invitationsWithUsers as FamilyInvitation[];
      } catch (error) {
        logger.error("Erro inesperado ao buscar convites de família:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30 * 1000,
  });
}

// Hook para buscar solicitações enviadas
export function useFamilyInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family-invitations-sent", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("family_invitations")
        .select("*")
        .eq("from_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FamilyInvitation[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos de cache
  });
}

// Hook para aceitar solicitação (Centralizado via RPC)
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc("fn_respond_family_invitation", {
        p_invitation_id: invitationId,
        p_status: "accepted",
      });

      if (error) throw error;
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || "Não foi possível aceitar o convite");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-family-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["family"] });
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Solicitação aceita! Vínculo criado.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao aceitar: " + error.message);
    },
  });
}

// Hook para rejeitar solicitação (Centralizado via RPC)
export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc("fn_respond_family_invitation", {
        p_invitation_id: invitationId,
        p_status: "rejected",
      });

      if (error) throw error;
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || "Não foi possível rejeitar o convite");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-family-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Solicitação rejeitada.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });
}

// Hook para cancelar convite enviado
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("family_invitations").delete().eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invitations-sent"] });
      queryClient.invalidateQueries({ queryKey: ["pending-family-invitations"] });
      toast.success("Convite cancelado.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao cancelar: " + error.message);
    },
  });
}
