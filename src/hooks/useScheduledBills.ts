import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface ScheduledBill {
  id: string;
  description: string;
  amount: number;
  date: string;
  currency: string | null;
  type: string;
  status: string;
  category: { id: string; name: string; icon: string | null } | null;
  account: { id: string; name: string } | null;
}

export function useScheduledBills() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scheduled-bills", user?.id],
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<ScheduledBill[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, description, amount, date, currency, type, status,
          category:categories(id, name, icon),
          account:accounts!account_id(id, name)
        `)
        .eq("user_id", user.id)
        .eq("status", "PENDING")
        .is("deleted_at", null)
        .order("date", { ascending: true })
        .limit(50);

      if (error) throw error;
      return (data || []) as ScheduledBill[];
    },
    enabled: !!user,
  });
}

export function useConfirmScheduledBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, paidDate }: { id: string; paidDate?: string }) => {
      const date = paidDate ?? format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("transactions")
        .update({ status: "CONFIRMED", date })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-bills"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Conta marcada como paga");
    },
    onError: () => {
      toast.error("Erro ao confirmar pagamento");
    },
  });
}

export function useCancelScheduledBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "CANCELLED", deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-bills"] });
      toast.success("Conta agendada removida");
    },
    onError: () => {
      toast.error("Erro ao remover conta agendada");
    },
  });
}
