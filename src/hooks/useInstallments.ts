import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as dateFns from "date-fns";

export interface Installment {
  id: string;
  description: string;
  amount: number;
  date: string;
  competence_date: string;
  current_installment: number;
  total_installments: number;
  series_id: string;
  account_id: string | null;
  category_id: string | null;
}

/**
 * Hook para buscar parcelas futuras disponíveis para adiantamento
 */
export function useFutureInstallments(seriesId: string | null) {
  const { user } = useAuth();
  const currentMonth = dateFns.format(dateFns.startOfMonth(new Date()), "yyyy-MM-01");

  return useQuery({
    queryKey: ["future-installments", seriesId, currentMonth],
    queryFn: async () => {
      if (!seriesId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          description,
          amount,
          date,
          competence_date,
          current_installment,
          total_installments,
          series_id
        `
        )
        .eq("user_id", user!.id)
        .eq("series_id", seriesId)
        .gt("competence_date", currentMonth) // Apenas parcelas futuras
        .order("current_installment", { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!user && !!seriesId,
    staleTime: 15 * 1000, // Realtime cobre a invalidação
    refetchOnMount: "always",
  });
}

/**
 * Hook para adiantar parcelas (estilo Nubank)
 * Move a competência das parcelas selecionadas para o mês atual
 */
export function useAdvanceInstallments() {
  const queryClient = useQueryClient();
  const currentMonth = dateFns.format(dateFns.startOfMonth(new Date()), "yyyy-MM-01");

  return useMutation({
    mutationFn: async (installmentIds: string[]) => {
      if (installmentIds.length === 0) {
        throw new Error("Selecione pelo menos uma parcela para adiantar");
      }

      // Atualizar competence_date para o mês atual e registrar advanced_at
      const { data, error } = await supabase
        .from("transactions")
        .update({
          competence_date: currentMonth,
        })
        .in("id", installmentIds)
        .select();

      if (error) throw error;

      return { advancedCount: data?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["installment-series"] });
      queryClient.invalidateQueries({ queryKey: ["future-installments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(`${data.advancedCount} parcela(s) adiantada(s) com sucesso!`);
    },
    onError: (error) => {
      toast.error("Erro ao adiantar parcelas: " + error.message);
    },
  });
}
