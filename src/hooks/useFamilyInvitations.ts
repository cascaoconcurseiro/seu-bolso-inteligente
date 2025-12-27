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

      const { data, error } = await supabase
        .from("family_invitations")
        .select(`
          *,
          from_user:from_user_id (
            full_name,
            email
          )
        `)
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as FamilyInvitation[];
    },
    enabled: !!user,
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
