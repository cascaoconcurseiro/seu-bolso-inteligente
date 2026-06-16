import { moneyUtils } from "@/utils/money";
/**
 * Banco Central do Brasil (BCB) - Sistema Gerenciador de Séries Temporais (SGS)
 * API REST Pública e Gratuita. Não requer autenticação.
 */

const BCB_API_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

export interface EconomicIndicator {
  date: string;
  value: number;
}

/**
 * Busca o valor mais recente de uma série temporal do BCB.
 * @param seriesCode Código da série no SGS. Ex: 13522 (IPCA 12m), 432 (Selic Meta), 4389 (CDI anualizado)
 */
async function fetchLatestIndicator(seriesCode: number): Promise<EconomicIndicator | null> {
  try {
    const response = await fetch(`${BCB_API_BASE}.${seriesCode}/dados/ultimos/1?formato=json`);
    
    if (!response.ok) {
      throw new Error(`Erro na API do BCB (${response.status}) para a série ${seriesCode}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        date: data[0].data,
        value: moneyUtils.parse(data[0].valor)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Falha ao buscar indicador do BCB (Série ${seriesCode}):`, error);
    return null;
  }
}

export const bcbService = {
  /** IPCA Acumulado 12 meses (Inflação) */
  getIPCA: () => fetchLatestIndicator(13522),
  
  /** Taxa Selic (Meta) Anualizada */
  getSelic: () => fetchLatestIndicator(432),
  
  /** Taxa CDI Anualizada (Média) */
  getCDI: () => fetchLatestIndicator(4389),
};
