import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type B3Ticker = Database['public']['Tables']['b3_tickers_cache']['Row'];

export function useB3TickersSearch(searchTerm: string) {
  const [results, setResults] = useState<B3Ticker[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If the search term is empty or less than 2 chars, clear results
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const fetchTickers = async () => {
      setIsLoading(true);
      try {
        // Build search query: match ticker or name
        // We use ILIKE for case-insensitive search
        // pg_trgm makes this fast
        const searchPattern = `%${searchTerm}%`;
        const { data, error } = await supabase
          .from('b3_tickers_cache')
          .select('*')
          .or(`ticker.ilike.${searchPattern},name.ilike.${searchPattern}`)
          .order('ticker', { ascending: true })
          .limit(10);

        if (error) throw error;
        
        setResults(data || []);
      } catch (error) {
        console.error('Error fetching B3 tickers:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the request by 300ms
    const timeoutId = setTimeout(() => {
      fetchTickers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return { results, isLoading };
}
