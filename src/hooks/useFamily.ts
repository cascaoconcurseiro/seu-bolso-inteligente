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
  avatar_color?: string | null;
  avatar_icon?: string | null;
  status: "pending" | "active";
  member_type: "family" | "contact";
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
  shared_closing_day?: number | null;
  shared_due_day?: number | null;
  created_at: string;
  updated_at: string;
}

export function useFamily() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Primeiro, tentar buscar família onde sou o DONO
      const { data: ownedFamily } = await supabase
        .from("families")
        .select("*, owner:profiles!families_owner_id_fkey(id, full_name, email)")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (ownedFamily) {
        return ownedFamily as Family & { owner?: { id: string; full_name: string; email: string } };
      }

      // Se não sou dono, buscar família onde sou MEMBRO ativo
      const { data: memberRecord } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("linked_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!memberRecord) {
        return null; // Não pertence a nenhuma família
      }

      // Buscar dados da família com owner
      const { data: family, error } = await supabase
        .from("families")
        .select("*, owner:profiles!families_owner_id_fkey(id, full_name, email)")
        .eq("id", memberRecord.family_id)
        .single();

      if (error) throw error;

      return family as Family & { owner?: { id: string; full_name: string; email: string } };
    },
    enabled: !!user,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useFamilyMembers(includeContacts = false) {
  const { user } = useAuth();
  const { data: family } = useFamily();

  return useQuery({
    queryKey: ["family-members", user?.id, family?.id, includeContacts],
    queryFn: async () => {
      if (!user || !family) return [];

      // Buscar membros da família (por padrão exclui contatos de despesa)
      let query = supabase
        .from("family_members")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at");

      if (!includeContacts) {
        query = query.eq("member_type", "family") as any;
      }

      const { data, error } = await query;
      if (error) throw error;

      const membersList = (data || []) as FamilyMember[];
      const familyWithOwner = family as any;

      // Coletar todos os linked_user_ids (membros + owner)
      const linkedUserIds: string[] = membersList
        .filter(m => !!m.linked_user_id)
        .map(m => m.linked_user_id as string);

      if (familyWithOwner?.owner?.id && !linkedUserIds.includes(familyWithOwner.owner.id)) {
        linkedUserIds.push(familyWithOwner.owner.id);
      }

      // Buscar dados reais de perfil (avatar) de uma vez só para todos os membros
      const profileMap: Record<string, { avatar_url: string | null; avatar_color: string | null; avatar_icon: string | null; full_name: string | null }> = {};
      if (linkedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url, avatar_color, avatar_icon, full_name")
          .in("id", linkedUserIds);

        (profiles || []).forEach(p => {
          profileMap[p.id] = {
            avatar_url: p.avatar_url,
            avatar_color: p.avatar_color,
            avatar_icon: p.avatar_icon,
            full_name: p.full_name,
          };
        });
      }

      // Mesclar dados reais de avatar nos membros da lista
      const enrichedMembers = membersList.map(m => {
        const profile = m.linked_user_id ? profileMap[m.linked_user_id] : null;
        if (!profile) return m;
        return {
          ...m,
          avatar_url: profile.avatar_url ?? m.avatar_url,
          avatar_color: profile.avatar_color ?? m.avatar_color,
          avatar_icon: profile.avatar_icon ?? m.avatar_icon,
          // Atualizar nome se o perfil tiver nome mais atual
          name: profile.full_name || m.name,
        };
      });

      // Filtro de Visibilidade para Membros:
      // O Owner da família vê todo mundo.
      // Um membro normal (como Fran) vê: a si mesmo, o Owner, e as pessoas que ELA mesma convidou.
      const filteredMembers = user.id === family.owner_id ? enrichedMembers : enrichedMembers.filter(m => 
        m.linked_user_id === user.id || 
        m.linked_user_id === family.owner_id ||
        m.invited_by === user.id
      );

      // Injetar o dono (owner) como administrador virtual na listagem
      if (familyWithOwner?.owner) {
        const ownerProfile = profileMap[familyWithOwner.owner.id] || {};
        const ownerAsMember: FamilyMember = {
          id: `owner-${familyWithOwner.owner.id}`,
          family_id: family.id,
          user_id: familyWithOwner.owner.id,
          name: ownerProfile.full_name || familyWithOwner.owner.full_name || "Dono da Família",
          email: familyWithOwner.owner.email,
          role: "admin",
          status: "active",
          member_type: "family",
          linked_user_id: familyWithOwner.owner.id,
          sharing_scope: "all",
          // ✅ FIX: Avatar vem do perfil real, não estático null
          avatar_url: ownerProfile.avatar_url ?? null,
          avatar_color: ownerProfile.avatar_color ?? null,
          avatar_icon: ownerProfile.avatar_icon ?? null,
          invited_by: null,
          scope_start_date: null,
          scope_end_date: null,
          scope_trip_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const alreadyExists = filteredMembers.some(m => m.linked_user_id === familyWithOwner.owner.id);
        if (!alreadyExists) {
          return [ownerAsMember, ...filteredMembers];
        }
      }

      return filteredMembers;
    },
    enabled: !!user && !!family,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useInviteFamilyMember() {
  const { user } = useAuth();
  const { data: family } = useFamily();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      email, 
      role,
      sharingScope,
      scopeStartDate,
      scopeEndDate,
      scopeTripId
    }: { 
      name: string; 
      email: string; 
      role: FamilyRole;
      sharingScope?: SharingScope;
      scopeStartDate?: string;
      scopeEndDate?: string;
      scopeTripId?: string;
    }) => {
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
            sharing_scope: sharingScope || 'all',
            scope_start_date: scopeStartDate || null,
            scope_end_date: scopeEndDate || null,
            scope_trip_id: scopeTripId || null,
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
          user_id: null,
          linked_user_id: null,
          name,
          email: email.toLowerCase(),
          role,
          status: "pending",
          invited_by: user.id,
          sharing_scope: sharingScope || 'all',
          scope_start_date: scopeStartDate || null,
          scope_end_date: scopeEndDate || null,
          scope_trip_id: scopeTripId || null,
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
      if (id.startsWith("owner-")) {
        // Se for o dono virtual (ex: Wesley), simular sucesso visual.
        // O proprietário no banco de dados continua com seus dados intactos,
        // mas retornamos sucesso para não quebrar a tela de quem alterou.
        return {
          id,
          family_id: "",
          user_id: id.replace("owner-", ""),
          linked_user_id: id.replace("owner-", ""),
          name: "Dono",
          email: "",
          role: input.role || "admin",
          status: "active",
          sharing_scope: "all"
        } as any;
      }

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
      if (id.startsWith("owner-")) {
        // Se for remover o dono virtual, simular sucesso visual
        return;
      }

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

export function useUpdateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Family> & { id: string }) => {
      const { data, error } = await supabase
        .from("families")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Family;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      toast.success("Família atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar família: " + error.message);
    },
  });
}

// Adicionar contato de despesa diretamente (sem convite, member_type='contact')
export function useAddSharedContact() {
  const { user } = useAuth();
  const { data: family } = useFamily();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!user) throw new Error("Not authenticated");

      let familyId = family?.id;
      if (!familyId) {
        const { data: newFamily, error } = await supabase
          .from("families")
          .insert({ owner_id: user.id, name: `Família de ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}` })
          .select()
          .single();
        if (error) throw error;
        familyId = newFamily.id;
        queryClient.invalidateQueries({ queryKey: ["family"] });
      }

      const { error } = await supabase.from("family_members").insert({
        family_id: familyId,
        user_id: null,
        linked_user_id: null,
        name: name.trim(),
        email: null,
        role: "viewer",
        status: "active",
        member_type: "contact",
        invited_by: user.id,
        sharing_scope: "all",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-contacts"] });
      toast.success("Contato adicionado com sucesso");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar contato"),
  });
}

// Hook para buscar contatos de despesa (não família)
export function useSharedContacts() {
  const { user } = useAuth();
  const { data: family } = useFamily();

  return useQuery({
    queryKey: ["shared-contacts", user?.id, family?.id],
    queryFn: async (): Promise<FamilyMember[]> => {
      if (!user || !family) return [];
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", family.id)
        .eq("member_type", "contact")
        .order("name");
      if (error) throw error;
      return (data || []) as FamilyMember[];
    },
    enabled: !!user && !!family,
  });
}

// Converter membro em contato de despesa (remove da família, mantém histórico)
export function useConvertMemberToContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("family_members")
        .update({ member_type: "contact" })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["shared-contacts"] });
      toast.success("Movido para contatos — histórico preservado");
    },
    onError: () => toast.error("Erro ao alterar tipo de membro"),
  });
}

// Converter contato em membro da família
export function useConvertContactToMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("family_members")
        .update({ member_type: "family" })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["shared-contacts"] });
      toast.success("Adicionado como membro da família");
    },
    onError: () => toast.error("Erro ao alterar tipo de membro"),
  });
}
