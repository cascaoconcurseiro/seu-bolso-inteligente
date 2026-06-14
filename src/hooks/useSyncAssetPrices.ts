import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Brapi types no longer needed in frontend

export const useSyncAssetPrices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Call the secure Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('sync-asset-prices');

      if (functionError) {
        // Log the error to console for debugging
        console.error("Function Error:", functionError);
        
        // If it's a FunctionsHttpError, it might have a context/body
        const errorMessage = functionError.message || 'Erro ao invocar função de sincronização';
        let details = '';
        if ((functionError as any).context) {
           try {
             const contextBody = await (functionError as any).context.json();
             details = JSON.stringify(contextBody);
           } catch(e) {}
        }

        throw new Error(`${errorMessage} ${details}`);
      }

      if (data?.error) {
        throw new Error(JSON.stringify(data));
      }

      return { updated: data?.updated || 0 };
    },
    onSuccess: (data) => {
      if (data.updated > 0) {
        toast({
          title: "Cotações Sincronizadas",
          description: `${data.updated} ativos atualizados com sucesso.`,
        });
        // Refetch queries to update UI
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      } else {
        toast({
          title: "Sincronização Concluída",
          description: "Nenhum ativo precisou ser atualizado ou tickers inválidos.",
        });
      }
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Erro na Sincronização",
        description: error instanceof Error ? error.message : "Não foi possível buscar as cotações atualizadas.",
        variant: "destructive",
      });
    }
  });
};
