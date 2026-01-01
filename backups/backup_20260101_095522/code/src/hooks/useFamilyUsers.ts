import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "./useFamily";

export interface FamilyUser {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Hook para buscar todos os usuários da família (dono + membros ativos)
 * Usado em formulários de transações, viagens, despesas compartilhadas, etc.
 */
export function useFamilyUsers() {
  const { user } = useAuth();
  const { data: family } = useFamily();

  return useQuery({
    queryKey: ["family-users", user?.id, family?.id],
    queryFn: async () => {
      if (!user || !family) return [];

      const users: FamilyUser[] = [];

      // 1. Adicionar o dono da família
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", family.owner_id)
        .single();

      if (ownerProfile) {
        users.push(ownerProfile);
      }

      // 2. Buscar membros ativos da família
      const { data: members } = await supabase
        .from("family_members")
        .select("linked_user_id")
        .eq("family_id", family.id)
        .eq("status", "active")
        .not("linked_user_id", "is", null);

      if (members && members.length > 0) {
        const memberIds = members
          .map(m => m.linked_user_id)
          .filter((id): id is string => id !== null);

        if (memberIds.length > 0) {
          const { data: memberProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", memberIds);

          if (memberProfiles) {
            users.push(...memberProfiles);
          }
        }
      }

      // Remover duplicatas (caso o usuário seja tanto dono quanto membro)
      const uniqueUsers = users.filter(
        (user, index, self) => index === self.findIndex(u => u.id === user.id)
      );

      return uniqueUsers;
    },
    enabled: !!user && !!family,
    staleTime: 60000, // Cache por 1 minuto
  });
}
