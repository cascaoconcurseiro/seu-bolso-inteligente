import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format } from "date-fns";

export interface BillDue {
  id: string;
  description: string;
  amount: number;
  date: string;
  currency: string | null;
  series_id: string | null;
  account_id: string | null;
  category: { id: string; name: string; icon: string | null } | null;
  account: { id: string; name: string } | null;
}

export function useBillsDue(daysAhead = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bills-due", user?.id, daysAhead],
    staleTime: 0,
    queryFn: async (): Promise<BillDue[]> => {
      if (!user) return [];

      const today = new Date();
      const start = format(today, "yyyy-MM-dd");
      const end = format(addDays(today, daysAhead), "yyyy-MM-dd");

      // Buscar apenas transações PENDING (agendadas manualmente) nos próximos N dias
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(
          "id, description, amount, date, currency, series_id, account_id, category:categories(id, name, icon), account:accounts!account_id(id, name)"
        )
        .eq("user_id", user.id)
        .eq("type", "EXPENSE")
        .eq("status", "PENDING")
        .gte("date", start)
        .lte("date", end)
        .is("deleted_at", null)
        .order("date", { ascending: true })
        .limit(20);

      if (txError) throw txError;

      return (txData || []) as BillDue[];
    },
    enabled: !!user,
  });
}
