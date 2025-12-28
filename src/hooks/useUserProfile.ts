import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
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
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split("@")[0],
          })
          .select()
          .single();

        if (createError) throw createError;
        return newProfile as UserProfile;
      }

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user,
  });
}

export function useUpdateUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name?: string; avatar_url?: string }) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
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

      return data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
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

      // Mark profile as deleted (soft delete)
      const { error } = await supabase
        .from("user_profiles")
        .update({ deleted: true })
        .eq("id", user.id);

      if (error) throw error;

      // Sign out
      await supabase.auth.signOut();
      return true;
    },
    onSuccess: () => {
      toast.success("Conta desativada. Você foi desconectado.");
    },
    onError: (error) => {
      toast.error("Erro ao desativar conta: " + error.message);
    },
  });
}
