import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { logger } from "@/utils/logger";
import { Transaction } from "./types";

interface UseDependentTransactionsProps {
  cardIds: string[];
  startDate?: string;
  endDate?: string;
}

export function useDependentTransactions({ cardIds, startDate, endDate }: UseDependentTransactionsProps) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dependent_transactions", user?.id, cardIds, startDate, endDate],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    ...defaultQueryConfig,
    enabled: !!user && cardIds.length > 0,
    queryFn: async () => {
      if (!user || cardIds.length === 0) return [];

      logger.debug('useDependentTransactions query:', {
        userId: user.id,
        cardIds,
        startDate,
        endDate
      });

      const { data: memberData } = await supabase
        .from('family_members')
        .select('id')
        .eq('linked_user_id', user.id)
        .maybeSingle();
      const memberId = memberData?.id;

      let query = supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(id, name, currency, bank_id),
          category:categories(id, name, icon, parent_category_id),
          transaction_splits:transaction_splits!transaction_id(*)
        `)
        .is("deleted_at", null)
        .in('account_id', cardIds)
        .not('payer_id', 'is', null);

      if (memberId) {
        query = query.neq('payer_id', memberId);
      }

      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) {
        logger.error("Erro ao buscar transações de dependentes:", error);
        throw error;
      }
      
      return (data || []) as Transaction[];
    }
  });
}
