import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BrapiResult {
  symbol: string;
  regularMarketPrice: number;
  currency: string;
}

interface BrapiResponse {
  results: BrapiResult[];
}

export const useSyncAssetPrices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Fetch all assets that have a ticker
      const { data: assets, error: fetchError } = await supabase
        .from('assets')
        .select('id, ticker, type')
        .not('ticker', 'is', null)
        .neq('ticker', '');

      if (fetchError) throw fetchError;
      if (!assets || assets.length === 0) return { updated: 0 };

      // Get unique tickers
      const uniqueTickers = Array.from(new Set(assets.map(a => a.ticker!.trim().toUpperCase())));
      
      if (uniqueTickers.length === 0) return { updated: 0 };

      // 2. Fetch from BRAPI
      const token = import.meta.env.VITE_BRAPI_TOKEN;
      if (!token) {
        throw new Error('Token da BRAPI não configurado.');
      }

      // Brapi allows multiple tickers comma-separated
      const tickersParam = uniqueTickers.join(',');
      const response = await fetch(`https://brapi.dev/api/quote/${tickersParam}?token=${token}`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar dados na BRAPI');
      }

      const data: BrapiResponse = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return { updated: 0 };
      }

      // 3. Update Supabase
      let updatedCount = 0;
      
      // Update assets one by one or in batch
      // Since it might be multiple, we can loop through the results
      for (const result of data.results) {
        const symbol = result.symbol.toUpperCase();
        const price = result.regularMarketPrice;
        
        // Find all assets matching this ticker
        const matchingAssets = assets.filter(a => a.ticker?.trim().toUpperCase() === symbol);
        
        if (matchingAssets.length > 0 && price) {
          const idsToUpdate = matchingAssets.map(a => a.id);
          
          const { error: updateError } = await supabase
            .from('assets')
            .update({ current_price: price })
            .in('id', idsToUpdate);
            
          if (!updateError) {
            updatedCount += idsToUpdate.length;
          } else {
            console.error(`Erro ao atualizar preço de ${symbol}:`, updateError);
          }
        }
      }

      return { updated: updatedCount };
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
