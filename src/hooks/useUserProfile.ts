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
    }) => {
      if (!user) throw new Error("Não autenticado");

      const updateData: any = {
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

      // Sign out (profiles table doesn't have deleted column)
      await supabase.auth.signOut();
      return true;
    },
    onSuccess: () => {
      toast.success("Você foi desconectado.");
    },
    onError: (error) => {
      toast.error("Erro ao desativar conta: " + error.message);
    },
  });
}
