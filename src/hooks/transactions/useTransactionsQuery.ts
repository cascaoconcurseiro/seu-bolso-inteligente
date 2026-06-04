import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { getMonthDateRange } from "@/utils/dateUtils";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { TransactionFilters, Transaction } from "./types";

const TRANSACTION_FETCH_LIMIT = 1000;

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const { currentDate, startDay } = useMonth();

  const effectiveFilters = filters ? { ...filters } : {};
  if (!effectiveFilters.startDate && !effectiveFilters.endDate) {
    const { startDate, endDate } = getMonthDateRange(currentDate, startDay);
    effectiveFilters.startDate = startDate;
    effectiveFilters.endDate = endDate;
  }

  return useQuery({
    queryKey: ["transactions", user?.id, effectiveFilters, currentDate],
    queryFn: async () => {
      if (!user) return [];

      // Buscar o ID de membro da família do usuário para o filtro de payer_id
      const { data: memberData } = await supabase
        .from('family_members')
        .select('id')
        .eq('linked_user_id', user.id)
        .maybeSingle();

      const memberId = memberData?.id;
      
      console.log('🔍 [DEBUG] useTransactions query:', {
        userId: user.id,
        memberId,
        filters: effectiveFilters
      });

      let query = supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(id, name, currency, bank_id),
          category:categories(id, name, icon, parent_category_id),
          transaction_splits:transaction_splits!transaction_id(*)
        `);

      // Filtro OR: transações minhas OU transações onde sou o pagador
      if (memberId) {
        query = query.or(`user_id.eq."${user.id}",payer_id.eq."${memberId}"`);
      } else {
        query = query.eq("user_id", user.id);
      }

      if (effectiveFilters?.startDate) {
        query = query.gte("date", effectiveFilters.startDate);
      }
      if (effectiveFilters?.endDate) {
        query = query.lte("date", effectiveFilters.endDate);
      }
      if (effectiveFilters?.type) {
        query = query.eq("type", effectiveFilters.type);
      }
      if (effectiveFilters?.accountId) {
        query = query.or(`account_id.eq.${effectiveFilters.accountId},destination_account_id.eq.${effectiveFilters.accountId}`);
      }
      if (effectiveFilters?.categoryId) {
        query = query.eq("category_id", effectiveFilters.categoryId);
      }
      if (effectiveFilters?.tripId) {
        query = query.eq("trip_id", effectiveFilters.tripId);
      }
      if (effectiveFilters?.domain) {
        query = query.eq("domain", effectiveFilters.domain);
      }

      const fetchLimit = effectiveFilters?.limit || TRANSACTION_FETCH_LIMIT;
      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (error) {
        logger.error("Erro ao buscar transações:", error);
        throw error;
      }
      
      if (data && data.length >= TRANSACTION_FETCH_LIMIT) {
        toast.warning(
          `Muitas transações no período (${TRANSACTION_FETCH_LIMIT}+). ` +
          'Use filtros de data para ver períodos menores.',
          { duration: 6000 }
        );
      }
      
      const filteredData = (data || []).filter((tx: any) => {
        const accountCurrency = tx.account?.currency || 'BRL';
        if (accountCurrency === 'BRL') return true;
        // Se for transação em moeda estrangeira mas for pessoal/viagem, mantemos
        if (tx.domain !== 'SHARED' || tx.is_shared) return true;
        return false;
      });
      
      return filteredData as Transaction[];
    },
    enabled: !!user,
    ...defaultQueryConfig,
  });
}
