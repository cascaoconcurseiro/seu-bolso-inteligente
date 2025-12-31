import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  user_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  related_user_id: string | null;
  related_member_id: string | null;
  description: string;
  category: string | null;
  is_settled: boolean;
  settled_at: string | null;
  settlement_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceBetweenUsers {
  user1_owes: number;
  user2_owes: number;
  net_balance: number;
  currency: string;
}

// Hook para buscar entradas do ledger do usuário
export function useLedgerEntries(filters?: {
  relatedUserId?: string;
  isSettled?: boolean;
  currency?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ledger-entries", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("financial_ledger")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (filters?.relatedUserId) {
        query = query.eq("related_user_id", filters.relatedUserId);
      }

      if (filters?.isSettled !== undefined) {
        query = query.eq("is_settled", filters.isSettled);
      }

      if (filters?.currency) {
        query = query.eq("currency", filters.currency);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LedgerEntry[];
    },
    enabled: !!user,
  });
}

// Hook para calcular saldo entre dois usuários
export function useBalanceBetweenUsers(otherUserId: string | null, currency: string = 'BRL') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["balance-between-users", user?.id, otherUserId, currency],
    queryFn: async () => {
      if (!otherUserId) return null;

      const { data, error } = await supabase.rpc('calculate_balance_between_users', {
        p_user1_id: user!.id,
        p_user2_id: otherUserId,
        p_currency: currency,
      });

      if (error) throw error;
      return data?.[0] as BalanceBetweenUsers;
    },
    enabled: !!user && !!otherUserId,
  });
}

// Hook para acertar contas entre usuários
export function useSettleBalance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otherUserId,
      settlementTransactionId,
    }: {
      otherUserId: string;
      settlementTransactionId?: string;
    }) => {
      const { data, error } = await supabase.rpc('settle_balance_between_users', {
        p_user1_id: user!.id,
        p_user2_id: otherUserId,
        p_settlement_transaction_id: settlementTransactionId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["balance-between-users"] });
      queryClient.invalidateQueries({ queryKey: ["shared-transactions-with-splits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Contas acertadas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao acertar contas: " + error.message);
    },
  });
}

// Hook para buscar saldos com todos os membros da família
export function useBalancesWithAllMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["balances-with-all-members", user?.id],
    queryFn: async () => {
      // Buscar todos os membros da família
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select("id, name, linked_user_id, avatar_url")
        .eq("family_id", (
          await supabase
            .from("families")
            .select("id")
            .eq("owner_id", user!.id)
            .single()
        ).data?.id || '')
        .eq("status", "active");

      if (membersError) throw membersError;

      // Para cada membro, calcular saldo
      const balances = await Promise.all(
        (members || []).map(async (member) => {
          if (!member.linked_user_id) return null;

          const { data: balance } = await supabase.rpc('calculate_balance_between_users', {
            p_user1_id: user!.id,
            p_user2_id: member.linked_user_id,
            p_currency: 'BRL',
          });

          return {
            member,
            balance: balance?.[0] as BalanceBetweenUsers,
          };
        })
      );

      return balances.filter(b => b !== null);
    },
    enabled: !!user,
  });
}

// Hook para buscar histórico de transações compartilhadas com um membro
export function useSharedTransactionsWithMember(memberUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["shared-transactions-with-member", user?.id, memberUserId],
    queryFn: async () => {
      if (!memberUserId) return [];

      // Buscar transações onde eu paguei e dividi com o membro
      const { data: iPaid, error: iPaidError } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .eq("user_id", user!.id)
        .eq("is_shared", true)
        .is("source_transaction_id", null);

      if (iPaidError) throw iPaidError;

      // Filtrar apenas transações que têm split com o membro
      const iPaidFiltered = (iPaid || []).filter(t => 
        t.transaction_splits?.some((s: any) => s.user_id === memberUserId)
      );

      // Buscar transações onde o membro pagou e dividiu comigo
      const { data: theyPaid, error: theyPaidError } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_splits!transaction_splits_transaction_id_fkey(*)
        `)
        .eq("user_id", memberUserId)
        .eq("is_shared", true)
        .is("source_transaction_id", null);

      if (theyPaidError) throw theyPaidError;

      // Filtrar apenas transações que têm split comigo
      const theyPaidFiltered = (theyPaid || []).filter(t => 
        t.transaction_splits?.some((s: any) => s.user_id === user!.id)
      );

      // Combinar e ordenar por data
      const allTransactions = [...iPaidFiltered, ...theyPaidFiltered]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return allTransactions;
    },
    enabled: !!user && !!memberUserId,
  });
}
