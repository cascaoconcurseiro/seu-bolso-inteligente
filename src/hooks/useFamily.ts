import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FamilyRole = "admin" | "editor" | "viewer";

export type SharingScope = "all" | "trips_only" | "date_range" | "specific_trip";

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  linked_user_id: string | null;
  name: string;
  email: string | null;
  role: FamilyRole;
  avatar_url: string | null;
  status: "pending" | "active";
  invited_by: string | null;
  sharing_scope: SharingScope;
  scope_start_date: string | null;
  scope_end_date: string | null;
  scope_trip_id: string | null;
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

      // Se não encontrou família, retornar null (não é erro)
      if (error && error.code === 'PGRST116') {
        return null;
      }

      if (error) throw error;
      return data as Family;
    },
    enabled: !!user,
    retry: false, // Não tentar novamente se falhar
  });
}

export function useFamilyMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family-members", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar membros da família do usuário
      // Lógica simples: buscar onde user_id = eu (sou o dono da relação)
      // Isso mostra os outros membros que EU adicionei
      const { data, error} = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");

      if (error) throw error;
      return data as FamilyMember[];
    },
    enabled: !!user,
  });
}

export function useInviteFamilyMember() {
  const { user } = useAuth();
  const { data: family } = useFamily();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email, role }: { name: string; email: string; role: FamilyRole }) => {
      if (!user) throw new Error("Not authenticated");

      // Criar família se não existir
      let familyId = family?.id;
      if (!familyId) {
        const { data: newFamily, error: familyError } = await supabase
          .from("families")
          .insert({
            owner_id: user.id,
            name: `Família de ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}`,
          })
          .select()
          .single();

        if (familyError) throw familyError;
        familyId = newFamily.id;
        
        // Invalidar query da família
        queryClient.invalidateQueries({ queryKey: ["family"] });
      }

      // Impedir que o usuário se adicione a si mesmo
      if (email.toLowerCase() === user.email?.toLowerCase()) {
        throw new Error("Você não pode se adicionar como membro da família");
      }

      // Verificar se o email já está cadastrado no app (busca case-insensitive)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .ilike("email", email)
        .maybeSingle();

      // Verificar se é o próprio usuário pelo ID
      if (existingProfile?.id === user.id) {
        throw new Error("Você não pode se adicionar como membro da família");
      }

      // Se usuário existe, criar solicitação
      if (existingProfile) {
        const { data, error } = await supabase
          .from("family_invitations")
          .insert({
            from_user_id: user.id,
            to_user_id: existingProfile.id,
            family_id: familyId,
            member_name: name,
            role,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // duplicate key
            throw new Error("Solicitação já enviada para este usuário");
          }
          throw error;
        }
        return { type: 'invitation', data };
      }

      // Se usuário não existe, criar membro local
      const { data, error } = await supabase
        .from("family_members")
        .insert({
          family_id: familyId,
          user_id: user.id,
          linked_user_id: null,
          name,
          email: email.toLowerCase(),
          role,
          status: "pending",
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { type: 'local', data };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["family-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["family"] });
      
      if (result.type === 'invitation') {
        toast.success("Solicitação enviada! Aguardando aceitação.");
      } else {
        toast.success("Membro adicionado localmente!");
      }
    },
    onError: (error) => {
      if (error.message.includes("duplicate") || error.message.includes("já enviada")) {
        toast.error("Solicitação já enviada para este usuário");
      } else if (error.message.includes("não pode se adicionar")) {
        toast.error(error.message);
      } else {
        toast.error("Erro ao adicionar: " + error.message);
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
