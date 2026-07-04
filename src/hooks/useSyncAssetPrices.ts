import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

// Brapi types no longer needed in frontend

export const useSyncAssetPrices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Check rate limit (e.g., 60 seconds)
      const lastSync = localStorage.getItem("last_asset_sync");
      if (lastSync) {
        const timeSinceLastSync = Date.now() - parseInt(lastSync, 10);
        const cooldown = 60000; // 60 seconds
        if (timeSinceLastSync < cooldown) {
          const remainingSeconds = Math.ceil((cooldown - timeSinceLastSync) / 1000);
          throw new Error(`Aguarde ${remainingSeconds} segundos antes de atualizar novamente.`);
        }
      }

      // Call the secure Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke("sync-asset-prices");

      if (functionError) {
        // Log the error to console for debugging
        logger.error("Function Error:", functionError);

        // If it's a FunctionsHttpError, it might have a context/body
        const errorMessage = functionError.message || "Erro ao invocar função de sincronização";
        let details = "";
        if ((functionError as any).context) {
          try {
            const contextBody = await (functionError as any).context.json();
            details = JSON.stringify(contextBody);
          } catch (e) {
            /* ignore */
          }
        }

        throw new Error(`${errorMessage} ${details}`);
      }

      if (data?.error) {
        throw new Error(JSON.stringify(data));
      }

      return { updated: data?.updated || 0 };
    },
    onSuccess: (data) => {
      // Update last sync time
      localStorage.setItem("last_asset_sync", Date.now().toString());

      if (data.updated > 0) {
        toast({
          title: "Cotações Sincronizadas",
          description: `${data.updated} ativos atualizados com sucesso.`,
        });
        // Refetch queries to update UI
        queryClient.invalidateQueries({ queryKey: ["assets"] });
      } else {
        toast({
          title: "Sincronização Concluída",
          description: "Nenhum ativo precisou ser atualizado ou tickers inválidos.",
        });
      }
    },
    onError: (error) => {
      logger.error(error);
      toast({
        title: "Erro na Sincronização",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível buscar as cotações atualizadas.",
        variant: "destructive",
      });
    },
  });
};
