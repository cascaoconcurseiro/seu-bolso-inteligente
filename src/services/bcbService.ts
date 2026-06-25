import { logger } from '@/utils/logger';
import { supabase } from "@/integrations/supabase/client";

export interface EconomicIndicator {
  date: string;
  value: number;
}

/**
 * Busca indicador do BCB via Edge Function (server-side, evita CORS do browser).
 * Fallback: chamada direta (funciona em alguns ambientes).
 */
async function fetchIndicator(indicator: 'ipca' | 'selic' | 'cdi'): Promise<EconomicIndicator | null> {
  // Tenta via Edge Function
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase.functions.invoke('get-currency-quote', {
        body: { indicator },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!error && data?.value != null) {
        return { date: data.date, value: data.value };
      }
    }
  } catch (e) {
    logger.warn(`Edge Function indisponível para BCB ${indicator}:`, e);
  }

  // Fallback: chamada direta (pode falhar por CORS dependendo do ambiente)
  const seriesCodes: Record<string, number> = { ipca: 13522, selic: 432, cdi: 4389 };
  try {
    const code = seriesCodes[indicator];
    const response = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`
    );
    if (!response.ok) throw new Error(`BCB HTTP ${response.status}`);
    const data = await response.json();
    if (data?.[0]) {
      return { date: data[0].data, value: parseFloat(data[0].valor.replace(',', '.')) };
    }
  } catch (error) {
    logger.error(`Falha ao buscar ${indicator} do BCB:`, error);
  }

  return null;
}

export const bcbService = {
  getIPCA: () => fetchIndicator('ipca'),
  getSelic: () => fetchIndicator('selic'),
  getCDI: () => fetchIndicator('cdi'),
};
