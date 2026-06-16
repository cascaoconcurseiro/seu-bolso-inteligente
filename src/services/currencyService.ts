import { logger } from "@/utils/logger";
import { moneyUtils } from "@/utils/money";

export interface CurrencyRate {
  code: string;
  codein: string;
  name: string;
  high: string;
  low: string;
  varBid: string;
  pctChange: string;
  bid: string; // Isso é o que a gente usa para a cotação (valor de compra)
  ask: string; // Valor de venda
  timestamp: string;
  create_date: string;
}

const CACHE_DURATION = 1000 * 60 * 15; // 15 minutos de cache
const cache = new Map<string, { data: CurrencyRate; timestamp: number }>();

/**
 * Busca cotações de moedas em tempo real (AwesomeAPI)
 * É 100% gratuita, sem necessidade de chaves e retorna os dados atualizados.
 *
 * @param currencyCode Código da moeda original (ex: USD, EUR, GBP)
 * @param targetCode Código da moeda de destino (ex: BRL)
 */
export async function getCurrencyRate(
  currencyCode: string,
  targetCode: string = "BRL"
): Promise<number | null> {
  const pair = `${currencyCode}-${targetCode}`;
  const pairKey = `${currencyCode}${targetCode}`;

  // Se for a mesma moeda, taxa = 1
  if (currencyCode === targetCode) return 1;

  // Checar cache em memória
  const cached = cache.get(pairKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return moneyUtils.parse(cached.data.bid);
  }

  try {
    // Monta a URL. Se tivermos a chave (via .env), usamos para garantir maior estabilidade e limite.
    // Usaremos import.meta.env.VITE_AWESOME_API_TOKEN se existir, senão vai sem token (que também funciona mas com limites).
    const token = import.meta.env.VITE_AWESOME_API_TOKEN || "eaef71de8f585d5744e73835af36a596642a2300613f772decb2049fa906b7f9";
    const url = `https://economia.awesomeapi.com.br/json/last/${pair}?token=${token}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    const rateData = data[pairKey] as CurrencyRate;

    if (!rateData) {
      throw new Error("Moeda não encontrada na resposta da API.");
    }

    // Salvar no cache
    cache.set(pairKey, { data: rateData, timestamp: Date.now() });

    return moneyUtils.parse(rateData.bid);
  } catch (error) {
    logger.error(`Erro ao buscar cotação de ${pair}:`, error);
    return null;
  }
}

/**
 * Busca múltiplas moedas de uma vez
 */
export async function getMultipleCurrencyRates(
  currencies: string[],
  targetCode: string = "BRL"
): Promise<Record<string, number>> {
  const pairs = currencies.filter(c => c !== targetCode).map(c => `${c}-${targetCode}`).join(",");
  
  if (!pairs) return {};

  try {
    const token = import.meta.env.VITE_AWESOME_API_TOKEN || "eaef71de8f585d5744e73835af36a596642a2300613f772decb2049fa906b7f9";
    const url = `https://economia.awesomeapi.com.br/json/last/${pairs}?token=${token}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    const results: Record<string, number> = {};

    for (const currency of currencies) {
      if (currency === targetCode) {
        results[currency] = 1;
        continue;
      }
      const pairKey = `${currency}${targetCode}`;
      if (data[pairKey]) {
        const rate = moneyUtils.parse(data[pairKey].bid);
        results[currency] = rate;
        cache.set(pairKey, { data: data[pairKey], timestamp: Date.now() });
      } else {
        // Se não conseguiu da API, tenta ver se tem no cache antigo
        const cached = cache.get(pairKey);
        results[currency] = cached ? moneyUtils.parse(cached.data.bid) : 0;
      }
    }

    return results;
  } catch (error) {
    logger.error("Erro ao buscar múltiplas cotações:", error);
    
    // Fallback: tentar usar o que tem no cache
    const results: Record<string, number> = {};
    for (const currency of currencies) {
      if (currency === targetCode) {
        results[currency] = 1;
        continue;
      }
      const cached = cache.get(`${currency}${targetCode}`);
      results[currency] = cached ? moneyUtils.parse(cached.data.bid) : 0;
    }
    return results;
  }
}
