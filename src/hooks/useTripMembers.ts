import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string | null; // null para participantes sem conta (guests)
  guest_name?: string | null; // nome do convidado externo
  role: "owner" | "member";
  can_edit_details: boolean;
  can_manage_expenses: boolean;
  personal_budget: number | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
  // Campo computado: nome de exibição (perfil ou guest_name)
  display_name?: string;
}

// Hook para buscar membros de uma viagem
export function useTripMembers(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-members", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from("trip_members")
        .select(
          "id, trip_id, user_id, guest_name, role, can_edit_details, can_manage_expenses, personal_budget, created_at, updated_at"
        )
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Só buscar profiles para membros com user_id
        const userIds = [...new Set(data.map((m) => m.user_id).filter(Boolean))] as string[];
        const profilesMap = new Map<string, { full_name: string | null; email: string }>();

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          profiles?.forEach((p) => profilesMap.set(p.id, p));
        }

        const enrichedData = data.map((member) => {
          const profile = member.user_id ? profilesMap.get(member.user_id) : undefined;
          const display_name =
            profile?.full_name || profile?.email || member.guest_name || "Convidado";
          return {
            ...member,
            profiles: profile,
            display_name,
            personal_budget: member.user_id === user?.id ? member.personal_budget : null,
          };
        });

        return enrichedData as TripMember[];
      }

      return data as TripMember[];
    },
    retry: 1,
    staleTime: 0, // Sem cache - sempre buscar dados frescos
    refetchOnWindowFocus: true, // Atualizar ao focar na janela
    enabled: !!tripId && !!user,
  });
}

// Hook para adicionar membro à viagem
export function useAddTripMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, userId }: { tripId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("trip_members")
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: "member",
          can_edit_details: false,
          can_manage_expenses: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", variables.tripId] });
      toast.success("Membro adicionado à viagem");
    },
    onError: (error: Error) => {
      logger.error("Erro ao adicionar membro:", error);
      toast.error("Erro ao adicionar membro à viagem");
    },
  });
}

// Hook para adicionar convidado externo (sem conta no app)
export function useAddGuestTripMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, guestName }: { tripId: string; guestName: string }) => {
      const { data, error } = await supabase
        .from("trip_members")
        .insert({
          trip_id: tripId,
          user_id: null,
          guest_name: guestName.trim(),
          role: "member",
          can_edit_details: false,
          can_manage_expenses: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", variables.tripId] });
      toast.success("Convidado adicionado à viagem");
    },
    onError: (error: Error) => {
      logger.error("Erro ao adicionar convidado:", error);
      toast.error("Erro ao adicionar convidado");
    },
  });
}

// Hook para remover membro da viagem
export function useRemoveTripMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, tripId }: { memberId: string; tripId: string }) => {
      const { data: member } = await supabase
        .from("trip_members")
        .select("role")
        .eq("id", memberId)
        .single();
      if (member?.role === "owner") {
        throw new Error("Não é possível remover o criador da viagem");
      }

      const { error } = await supabase.from("trip_members").delete().eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", variables.tripId] });
      toast.success("Membro removido da viagem");
    },
    onError: (error: Error) => {
      logger.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro da viagem");
    },
  });
}

// Hook para verificar permissões do usuário em uma viagem
export function useTripPermissions(tripId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-permissions", tripId, user?.id],
    queryFn: async () => {
      if (!tripId || !user) return null;

      const { data, error } = await supabase
        .from("trip_members")
        .select("role, can_edit_details, can_manage_expenses")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Se não encontrar, usuário não é membro
        return null;
      }

      return {
        isOwner: data.role === "owner",
        canEditDetails: data.can_edit_details,
        canManageExpenses: data.can_manage_expenses,
      };
    },
    enabled: !!tripId && !!user,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: "always",
  });
}

// Hook para atualizar orçamento pessoal do membro
export function useUpdatePersonalBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      userId,
      personalBudget,
    }: {
      tripId: string;
      userId: string;
      personalBudget: number;
    }) => {
      const { data, error } = await supabase
        .from("trip_members")
        .update({ personal_budget: personalBudget })
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["trips"] }); // Atualizar lista de viagens também
      toast.success("Orçamento pessoal atualizado!");
    },
    onError: (error: Error) => {
      logger.error("Erro ao atualizar orçamento:", error);
      toast.error("Erro ao atualizar orçamento");
    },
  });
}
