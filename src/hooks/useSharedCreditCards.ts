import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from '@/utils/logger';

export interface SharedCreditCard {
  id: string;
  account_id: string;
  user_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';
  credit_limit?: number | null;
  created_at: string;
  updated_at: string;
  account?: any; // Para quando vier com join
  user?: any; // Para quando vier com join
}

export function useSharedCreditCards(accountId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["shared-credit-cards", accountId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("shared_credit_cards")
        .select("*, user:profiles!shared_credit_cards_user_id_fkey(full_name, email, avatar_url, avatar_icon, avatar_color), accounts(name)");

      if (accountId) {
        query = query.eq("account_id", accountId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at");

      if (error) {
        logger.error("Erro ao buscar cartões compartilhados:", error);
        throw error;
      }
      return data as SharedCreditCard[];
    },
    enabled: !!user,
  });
}

export function useInviteSharedCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ accountId, userId, cardName, creditLimit }: { accountId: string; userId: string; cardName: string; creditLimit?: number | null }) => {
      // First check if it exists
      const { data: existing } = await supabase
        .from("shared_credit_cards")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .maybeSingle();

      let data, error;
      
      if (existing) {
        const res = await supabase
          .from("shared_credit_cards")
          .update({ status: 'PENDING', credit_limit: creditLimit || null })
          .eq("id", existing.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from("shared_credit_cards")
          .insert({
            account_id: accountId,
            user_id: userId,
            status: 'PENDING',
            credit_limit: creditLimit || null,
          })
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;

      // Criar notificação para o usuário convidado
      if (user) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Convite de Cartão Compartilhado",
          message: `Você foi convidado para compartilhar o cartão ${cardName}.`,
          type: "INVITATION",
          read: false,
          metadata: { type: 'shared_card_invite', shared_card_id: data.id, account_id: accountId }
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shared-credit-cards", variables.accountId] });
      toast.success("Convite enviado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao convidar usuário.");
    },
  });
}

export function useRespondSharedCardInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, status, creditLimit }: { inviteId: string; status: 'ACCEPTED' | 'REJECTED'; creditLimit?: number | null }) => {
      const { data, error } = await supabase
        .from("shared_credit_cards")
        .update({ status, ...(creditLimit ? { credit_limit: creditLimit } : {}) })
        .eq("id", inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shared-credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] }); // atualizar lista de cartões se aceito
      toast.success(`Convite ${data.status === 'ACCEPTED' ? 'aceito' : 'recusado'}!`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao responder convite.");
    },
  });
}

export function useRevokeSharedCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("shared_credit_cards")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-credit-cards"] });
      toast.success("Compartilhamento removido.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover compartilhamento.");
    },
  });
}
