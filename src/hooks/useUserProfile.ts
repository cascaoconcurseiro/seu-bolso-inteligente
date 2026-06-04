import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  name?: string | null; // Alias for compatibility
  avatar_url: string | null;
  avatar_color?: string | null;
  avatar_icon?: string | null;
  use_subcategories?: boolean;
  month_start_day?: number;
  base_currency?: string;
  app_pin?: string | null;
  require_pin_on_open?: boolean;
  monthly_budget?: number;
  shared_expenses_behavior?: string;
  shared_sync_credit_card_id?: string | null;
  global_cdi_rate?: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          })
          .select()
          .single();

        if (createError) throw createError;
        return { ...newProfile, name: newProfile.full_name } as UserProfile;
      }

      if (error) throw error;
      return { ...data, name: data.full_name } as UserProfile;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 30 * 60 * 1000,   // Manter no cache por 30 minutos
  });
}

export function useUpdateUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      name?: string; 
      avatar_url?: string;
      avatar_color?: string;
      avatar_icon?: string;
      use_subcategories?: boolean;
      month_start_day?: number;
      base_currency?: string;
      app_pin?: string | null;
      require_pin_on_open?: boolean;
      monthly_budget?: number;
      shared_expenses_behavior?: string;
      shared_sync_credit_card_id?: string | null;
      global_cdi_rate?: number;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (input.name !== undefined) {
        updateData.full_name = input.name;
      }
      if (input.avatar_url !== undefined) {
        updateData.avatar_url = input.avatar_url;
      }
      if (input.avatar_color !== undefined) {
        updateData.avatar_color = input.avatar_color;
      }
      if (input.avatar_icon !== undefined) {
        updateData.avatar_icon = input.avatar_icon;
      }
      if (input.use_subcategories !== undefined) {
        updateData.use_subcategories = input.use_subcategories;
      }
      if (input.month_start_day !== undefined) {
        updateData.month_start_day = input.month_start_day;
      }
      if (input.base_currency !== undefined) {
        updateData.base_currency = input.base_currency;
      }
      if (input.app_pin !== undefined) {
        updateData.app_pin = input.app_pin;
      }
      if (input.require_pin_on_open !== undefined) {
        updateData.require_pin_on_open = input.require_pin_on_open;
      }
      if (input.monthly_budget !== undefined) {
        updateData.monthly_budget = input.monthly_budget;
      }
      if (input.shared_expenses_behavior !== undefined) {
        updateData.shared_expenses_behavior = input.shared_expenses_behavior;
      }
      if (input.shared_sync_credit_card_id !== undefined) {
        updateData.shared_sync_credit_card_id = input.shared_sync_credit_card_id;
      }
      if (input.global_cdi_rate !== undefined) {
        updateData.global_cdi_rate = input.global_cdi_rate;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Also update auth metadata
      if (input.name) {
        await supabase.auth.updateUser({
          data: { full_name: input.name },
        });
      }

      return { ...data, name: data.full_name } as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao alterar senha: " + error.message);
    },
  });
}

export function useDeleteAccount() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // ─── LGPD: Expurgo físico em cascata de todos os dados do usuário ───
      // Agora realizado via função segura e atômica no banco (RPC)
      // garantindo que não restem registros fantasmas nem falhas de rede intermediárias.
      
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) {
        throw new Error(`Erro no banco de dados ao excluir conta: ${error.message}`);
      }

      // Deslogar localmente
      await supabase.auth.signOut();
      return true;
    },
    onSuccess: () => {
      toast.success("Sua conta e todos os seus dados foram removidos permanentemente.");
    },
    onError: (error) => {
      toast.error("Erro ao excluir conta: " + error.message);
    },
  });
}
