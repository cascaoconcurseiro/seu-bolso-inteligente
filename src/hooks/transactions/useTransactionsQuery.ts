import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { getMonthDateRange } from "@/utils/dateUtils";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { toast } from "sonner";
import { TransactionFilters, Transaction } from "./types";

const TRANSACTION_FETCH_LIMIT = 1000;

const selectClause = `
  *,
  account:accounts!account_id(id, name, type, currency, bank_id),
  category:categories(id, name, icon, parent_category_id),
  transaction_splits:transaction_splits!transaction_id(*)
`;

function buildFilteredQuery(
  query: any,
  filters: TransactionFilters
) {
  let q = query;
  if (filters?.startDate) q = q.gte("date", filters.startDate);
  if (filters?.endDate) q = q.lte("date", filters.endDate);
  if (filters?.type) q = q.eq("type", filters.type);
  if (filters?.accountId) {
    q = q.or(`account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`);
  }
  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters?.tripId) q = q.eq("trip_id", filters.tripId);
  if (filters?.domain) q = q.eq("domain", filters.domain);
  return q;
}

function applyPostFilters(data: any[], fetchLimit: number): Transaction[] {
  if (data.length >= TRANSACTION_FETCH_LIMIT) {
    toast.warning(
      `Muitas transações no período (${TRANSACTION_FETCH_LIMIT}+). ` +
        "Use filtros de data para ver períodos menores.",
      { duration: 6000 }
    );
  }

  return data.filter((tx: any) => {
    const accountCurrency = tx.account?.currency || "BRL";
    if (accountCurrency === "BRL") return true;
    if (tx.domain !== "SHARED" || tx.is_shared) return true;
    return false;
  }) as Transaction[];
}

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
    staleTime: 1000 * 60 * 5,
    ...defaultQueryConfig,
    queryFn: async () => {
      if (!user) return [];

      const { data: memberData } = await supabase
        .from("family_members")
        .select("id")
        .eq("linked_user_id", user.id)
        .maybeSingle();

      const memberId = memberData?.id;
      const fetchLimit = effectiveFilters?.limit || TRANSACTION_FETCH_LIMIT;

      // Duas queries separadas para evitar .or() do PostgREST
      // .or() traduz para UNION que perde ORDER BY
      if (memberId) {
        const ownQuery = buildFilteredQuery(
          supabase
            .from("transactions")
            .select(selectClause)
            .is("deleted_at", null)
            .neq("status", "PENDING")
            .eq("user_id", user.id)
            .is("payer_id", null)
            .is("source_transaction_id", null),
          effectiveFilters
        );

        const payerQuery = buildFilteredQuery(
          supabase
            .from("transactions")
            .select(selectClause)
            .is("deleted_at", null)
            .neq("status", "PENDING")
            .eq("payer_id", memberId),
          effectiveFilters
        );

        const [ownResult, payerResult] = await Promise.all([
          ownQuery.order("date", { ascending: false }).order("created_at", { ascending: false }).limit(fetchLimit),
          payerQuery.order("date", { ascending: false }).order("created_at", { ascending: false }).limit(fetchLimit),
        ]);

        if (ownResult.error) throw ownResult.error;
        if (payerResult.error) throw payerResult.error;

        const merged = [...(ownResult.data || []), ...(payerResult.data || [])]
          .sort((a: any, b: any) => {
            const dateDiff = b.date.localeCompare(a.date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
          .slice(0, fetchLimit);

        return applyPostFilters(merged, fetchLimit);
      }

      // Sem família: query simples
      const query = buildFilteredQuery(
        supabase
          .from("transactions")
          .select(selectClause)
          .is("deleted_at", null)
          .neq("status", "PENDING")
          .eq("user_id", user.id)
          .is("payer_id", null),
        effectiveFilters
      );

      const { data, error } = await query
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

      if (error) throw error;

      return applyPostFilters(data || [], fetchLimit);
    },
    enabled: !!user,
  });
}
