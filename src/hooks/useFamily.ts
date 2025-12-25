import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FamilyRole = "admin" | "editor" | "viewer";

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  linked_user_id: string | null;
  name: string;
  email: string | null;
  role: FamilyRole;
  status: "pending" | "active";
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export function useFamily() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .single();

      if (error) throw error;
      return data as Family;
    },
    enabled: !!user,
  });
}

export function useFamilyMembers() {
  const { user } = useAuth();
  const { data: family } = useFamily();

  return useQuery({
    queryKey: ["family-members", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at");

      if (error) throw error;
      return data as FamilyMember[];
    },
    enabled: !!user && !!family,
  });
}

export function useInviteFamilyMember() {
  const { user } = useAuth();
  const { data: family } = useFamily();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email, role }: { name: string; email: string; role: FamilyRole }) => {
      if (!user || !family) throw new Error("Not authenticated or no family");

      // Verificar se o email já está cadastrado no app (busca case-insensitive)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", email)
        .maybeSingle();

      const { data, error } = await supabase
        .from("family_members")
        .insert({
          family_id: family.id,
          user_id: existingProfile?.id || null,
          linked_user_id: existingProfile?.id || null, // CRÍTICO: Vincula automaticamente se usuário existe
          name,
          email: email.toLowerCase(),
          role,
          status: existingProfile ? "active" : "pending",
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FamilyMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      toast.success("Convite enviado!");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este email já foi convidado");
      } else {
        toast.error("Erro ao convidar: " + error.message);
      }
    },
  });
}

export function useUpdateFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<FamilyMember> & { id: string }) => {
      const { data, error } = await supabase
        .from("family_members")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FamilyMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      toast.success("Membro atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      toast.success("Membro removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });
}
