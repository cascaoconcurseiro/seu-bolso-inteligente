import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";

export interface Installment {
  id: string;
  description: string;
  amount: number;
  date: string;
  competence_date: string;
  current_installment: number;
  total_installments: number;
  series_id: string;
  advanced_at: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  category_id: string | null;
}

/**
 * Hook para buscar todas as parcelas de uma série
 */
export function useInstallmentSeries(seriesId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["installment-series", seriesId],
    queryFn: async () => {
      if (!seriesId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          description,
          amount,
          date,
          competence_date,
          current_installment,
          total_installments,
          series_id,
          advanced_at,
          account_id,
          credit_card_id,
          category_id
        `)
        .eq("user_id", user!.id)
        .eq("series_id", seriesId)
        .order("current_installment", { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!user && !!seriesId,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: 'always',
  });
}

/**
 * Hook para buscar parcelas futuras disponíveis para adiantamento
 */
export function useFutureInstallments(seriesId: string | null) {
  const { user } = useAuth();
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-01');

  return useQuery({
    queryKey: ["future-installments", seriesId, currentMonth],
    queryFn: async () => {
      if (!seriesId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          description,
          amount,
          date,
          competence_date,
          current_installment,
          total_installments,
          series_id,
          advanced_at
        `)
        .eq("user_id", user!.id)
        .eq("series_id", seriesId)
        .gt("competence_date", currentMonth) // Apenas parcelas futuras
        .is("advanced_at", null) // Que ainda não foram adiantadas
        .order("current_installment", { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!user && !!seriesId,
    staleTime: 0, // ✅ Dados sempre frescos
    refetchOnMount: 'always',
  });
}

/**
 * Hook para adiantar parcelas (estilo Nubank)
 * Move a competência das parcelas selecionadas para o mês atual
 */
export function useAdvanceInstallments() {
  const queryClient = useQueryClient();
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-01');

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
          advanced_at: new Date().toISOString(),
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

/**
 * Hook para desfazer adiantamento de parcelas
 * Restaura a competência original das parcelas
 */
export function useUndoAdvanceInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      installmentIds, 
      originalCompetenceDates 
    }: { 
      installmentIds: string[]; 
      originalCompetenceDates: Record<string, string>;
    }) => {
      // Atualizar cada parcela com sua competência original
      const updates = installmentIds.map(id => 
        supabase
          .from("transactions")
          .update({
            competence_date: originalCompetenceDates[id],
            advanced_at: null,
          })
          .eq("id", id)
      );

      await Promise.all(updates);

      return { restoredCount: installmentIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["installment-series"] });
      queryClient.invalidateQueries({ queryKey: ["future-installments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(`${data.restoredCount} parcela(s) restaurada(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao desfazer adiantamento: " + error.message);
    },
  });
}
