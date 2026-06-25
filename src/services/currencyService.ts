import { logger } from "@/utils/logger";

export interface CurrencyRate {
  code: string;
  codein: string;
  name: string;
  high: string;
  low: string;
  varBid: string;
  pctChange: string;
  bid: string;
  ask: string;
  timestamp: string;
  create_date: string;
}

const CACHE_DURATION = 1000 * 60 * 15;
const cache = new Map<string, { rate: number; timestamp: number }>();

export async function getCurrencyRate(
  currencyCode: string,
  targetCode: string = "BRL"
): Promise<number | null> {
  if (currencyCode === targetCode) return 1;

  const cacheKey = `${currencyCode}${targetCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    const pair = `${currencyCode}-${targetCode}`;
    const response = await fetch(`https://economia.awesomeapi.com.br/json/last/${pair}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rateData = data[`${currencyCode}${targetCode}`];
    if (!rateData) throw new Error('Par não encontrado');

    const rate = parseFloat(rateData.bid);
    cache.set(cacheKey, { rate, timestamp: Date.now() });
    return rate;
  } catch (error) {
    logger.error(`Erro ao buscar cotação ${currencyCode}/${targetCode}:`, error);
    return null;
  }
}

export async function getMultipleCurrencyRates(
  currencies: string[],
  targetCode: string = "BRL"
): Promise<Record<string, number>> {
  const toFetch = currencies.filter(c => c !== targetCode);
  const results: Record<string, number> = {};

  for (const c of currencies) {
    if (c === targetCode) { results[c] = 1; continue; }
  }

  if (toFetch.length === 0) return results;

  try {
    const pairs = toFetch.map(c => `${c}-${targetCode}`).join(',');
    const response = await fetch(`https://economia.awesomeapi.com.br/json/last/${pairs}`);
    if (response.ok) {
      const data = await response.json();
      for (const c of toFetch) {
        const key = `${c}${targetCode}`;
        if (data[key]) {
          const rate = parseFloat(data[key].bid);
          results[c] = rate;
          cache.set(key, { rate, timestamp: Date.now() });
        }
      }
      for (const c of toFetch) {
        if (!results[c]) {
          const old = cache.get(`${c}${targetCode}`);
          results[c] = old?.rate ?? 0;
        }
      }
      return results;
    }
  } catch (_) { /* fall through to individual fetch */ }

  await Promise.all(toFetch.map(async (c) => {
    const rate = await getCurrencyRate(c, targetCode);
    results[c] = rate ?? 0;
  }));

  return results;
}
