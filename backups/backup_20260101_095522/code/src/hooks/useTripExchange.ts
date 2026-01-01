import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ExchangePurchase, 
  ExchangePurchaseInput, 
  ExchangeSummary 
} from "@/types/tripExchange";
import { 
  calculateEffectiveRate, 
  calculateLocalAmount, 
  calculateExchangeSummary 
} from "@/services/exchangeCalculations";

/**
 * Hook para buscar compras de câmbio de uma viagem
 */
export function useTripExchangePurchases(tripId: string | null) {
  return useQuery({
    queryKey: ["trip-exchange-purchases", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from("trip_exchange_purchases")
        .select("*")
        .eq("trip_id", tripId)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      return data as ExchangePurchase[];
    },
    enabled: !!tripId,
  });
}

/**
 * Hook para criar uma compra de câmbio
 */
export function useCreateExchangePurchase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tripId,
      input,
    }: {
      tripId: string;
      input: ExchangePurchaseInput;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const effectiveRate = calculateEffectiveRate(
        input.exchange_rate,
        input.cet_percentage
      );
      const localAmount = calculateLocalAmount(
        input.foreign_amount,
        effectiveRate
      );

      const { data, error } = await supabase
        .from("trip_exchange_purchases")
        .insert({
          trip_id: tripId,
          user_id: user.id,
          foreign_amount: input.foreign_amount,
          exchange_rate: input.exchange_rate,
          cet_percentage: input.cet_percentage,
          effective_rate: effectiveRate,
          local_amount: localAmount,
          description: input.description || null,
          purchase_date: input.purchase_date,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["trip-exchange-purchases", variables.tripId],
      });
      toast({
        title: "Câmbio registrado",
        description: "Compra de câmbio adicionada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar câmbio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar uma compra de câmbio
 */
export function useUpdateExchangePurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      tripId,
      input,
    }: {
      id: string;
      tripId: string;
      input: ExchangePurchaseInput;
    }) => {
      const effectiveRate = calculateEffectiveRate(
        input.exchange_rate,
        input.cet_percentage
      );
      const localAmount = calculateLocalAmount(
        input.foreign_amount,
        effectiveRate
      );

      const { data, error } = await supabase
        .from("trip_exchange_purchases")
        .update({
          foreign_amount: input.foreign_amount,
          exchange_rate: input.exchange_rate,
          cet_percentage: input.cet_percentage,
          effective_rate: effectiveRate,
          local_amount: localAmount,
          description: input.description || null,
          purchase_date: input.purchase_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["trip-exchange-purchases", variables.tripId],
      });
      toast({
        title: "Câmbio atualizado",
        description: "Compra de câmbio atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar câmbio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para deletar uma compra de câmbio
 */
export function useDeleteExchangePurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from("trip_exchange_purchases")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["trip-exchange-purchases", variables.tripId],
      });
      toast({
        title: "Câmbio excluído",
        description: "Compra de câmbio removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir câmbio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para calcular o resumo de câmbio
 */
export function useExchangeSummary(tripId: string | null): {
  data: ExchangeSummary | undefined;
  isLoading: boolean;
} {
  const { data: purchases, isLoading } = useTripExchangePurchases(tripId);

  const summary = purchases ? calculateExchangeSummary(purchases) : undefined;

  return { data: summary, isLoading };
}
