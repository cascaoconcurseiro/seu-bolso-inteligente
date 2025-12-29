import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FamilyRole } from "./useFamily";

export interface FamilyInvitation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  family_id: string;
  member_name: string;
  role: FamilyRole;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  from_user?: {
    full_name: string;
    email: string;
  };
}

// Hook para buscar solicitações recebidas (pendentes)
export function usePendingInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family-invitations-pending", user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Buscar convites
        const { data: invitations, error } = await supabase
          .from("family_invitations")
          .select("*")
          .eq("to_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Erro ao buscar convites:", error);
          return [];
        }

        if (!invitations || invitations.length === 0) {
          console.log('📨 Nenhum convite pendente encontrado');
          return [];
        }

        // Buscar dados dos usuários que enviaram os convites
        const fromUserIds = invitations.map(inv => inv.from_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", fromUserIds);

        if (profilesError) {
          console.error("Erro ao buscar perfis:", profilesError);
        }

        // Combinar dados
        const invitationsWithUsers = invitations.map(inv => ({
          ...inv,
          from_user: profiles?.find(p => p.id === inv.from_user_id) || null
        }));
        
        console.log('📨 Convites pendentes encontrados:', invitationsWithUsers);
        return invitationsWithUsers as FamilyInvitation[];
      } catch (error) {
        console.error("Erro ao buscar convites:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
  });
}

// Hook para buscar solicitações enviadas
export function useSentInvitations() {
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
  });
}

// Hook para aceitar solicitação
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from("family_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invitations-pending"] });
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      toast.success("Solicitação aceita! Vínculo criado.");
    },
    onError: (error) => {
      toast.error("Erro ao aceitar: " + error.message);
    },
  });
}

// Hook para rejeitar solicitação
export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from("family_invitations")
        .update({ status: "rejected" })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invitations-pending"] });
      toast.success("Solicitação rejeitada.");
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });
}

// Hook para cancelar convite enviado
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("family_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invitations-sent"] });
      toast.success("Convite cancelado.");
    },
    onError: (error) => {
      toast.error("Erro ao cancelar: " + error.message);
    },
  });
}

// Hook para reenviar convite (reseta para pending)
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from("family_invitations")
        .update({ 
          status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invitations-sent"] });
      toast.success("Convite reenviado!");
    },
    onError: (error) => {
      toast.error("Erro ao reenviar: " + error.message);
    },
  });
}
