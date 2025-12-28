/**
 * Hook para gerenciar transações recorrentes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  generatePendingRecurringTransactions,
  checkPendingRecurrences,
  GenerationResult,
} from "@/services/recurrenceService";

/**
 * Hook para verificar transações recorrentes pendentes
 */
export function usePendingRecurrences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-recurrences", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      return checkPendingRecurrences(user.id);
    },
    enabled: !!user,
    // Verificar a cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para gerar transações recorrentes pendentes
 */
export function useGenerateRecurrences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<GenerationResult> => {
      if (!user) {
        return { success: false, generated: 0, errors: ["Usuário não autenticado"] };
      }
      return generatePendingRecurringTransactions(user.id);
    },
    onSuccess: (result) => {
      if (result.success && result.generated > 0) {
        toast({
          title: "Transações geradas",
          description: `${result.generated} transação(ões) recorrente(s) criada(s)`,
        });
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["pending-recurrences"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      } else if (result.generated === 0) {
        toast({
          title: "Nenhuma pendência",
          description: "Não há transações recorrentes pendentes",
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Avisos",
          description: result.errors.join(", "),
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar transações recorrentes",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook combinado para verificar e gerar recorrências automaticamente
 */
export function useAutoRecurrence() {
  const { data: pendingCount = 0, isLoading } = usePendingRecurrences();
  const generateMutation = useGenerateRecurrences();

  return {
    pendingCount,
    isLoading,
    isGenerating: generateMutation.isPending,
    generate: generateMutation.mutate,
    generateAsync: generateMutation.mutateAsync,
  };
}
