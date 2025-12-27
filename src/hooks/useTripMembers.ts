import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'member';
  can_edit_details: boolean;
  can_manage_expenses: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
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
        .select(`
          *,
          profiles!trip_members_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) {
        console.error("Erro ao buscar membros da viagem:", error);
        throw error;
      }
      
      console.log("Membros da viagem:", data);
      return data as TripMember[];
    },
    enabled: !!tripId && !!user,
  });
}

// Hook para adicionar membro à viagem
export function useAddTripMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      userId,
    }: {
      tripId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("trip_members")
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: 'member',
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
    onError: (error: any) => {
      console.error("Erro ao adicionar membro:", error);
      toast.error("Erro ao adicionar membro: " + error.message);
    },
  });
}

// Hook para remover membro da viagem
export function useRemoveTripMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      tripId,
    }: {
      memberId: string;
      tripId: string;
    }) => {
      const { error } = await supabase
        .from("trip_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", variables.tripId] });
      toast.success("Membro removido da viagem");
    },
    onError: (error: any) => {
      console.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro: " + error.message);
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
        isOwner: data.role === 'owner',
        canEditDetails: data.can_edit_details,
        canManageExpenses: data.can_manage_expenses,
      };
    },
    enabled: !!tripId && !!user,
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
      toast.success("Orçamento pessoal atualizado!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar orçamento:", error);
      toast.error("Erro ao atualizar orçamento: " + error.message);
    },
  });
}

