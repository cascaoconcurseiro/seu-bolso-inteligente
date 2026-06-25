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

/**
 * Busca cotação via fawazahmed0 currency API (jsDelivr CDN, gratuita, sem token, CORS liberado).
 * Fallback: Frankfurter API (ECB rates, gratuita, sem token).
 */
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

  const from = currencyCode.toLowerCase();
  const to = targetCode.toLowerCase();

  // Fonte 1: fawazahmed0 via jsDelivr CDN (gratuita, sem token, atualizada diariamente)
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.min.json`
    );
    if (res.ok) {
      const data = await res.json();
      const rate = data?.[from]?.[to];
      if (rate != null) {
        cache.set(cacheKey, { rate, timestamp: Date.now() });
        return rate;
      }
    }
  } catch (e) {
    logger.warn(`fawazahmed0 falhou para ${currencyCode}/${targetCode}:`, e);
  }

  // Fonte 2: Frankfurter API (ECB, gratuita, sem token)
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${currencyCode}&to=${targetCode}`
    );
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.[targetCode];
      if (rate != null) {
        cache.set(cacheKey, { rate, timestamp: Date.now() });
        return rate;
      }
    }
  } catch (e) {
    logger.warn(`Frankfurter falhou para ${currencyCode}/${targetCode}:`, e);
  }

  return null;
}

export async function getMultipleCurrencyRates(
  currencies: string[],
  targetCode: string = "BRL"
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  await Promise.all(currencies.map(async (c) => {
    if (c === targetCode) { results[c] = 1; return; }
    const rate = await getCurrencyRate(c, targetCode);
    results[c] = rate ?? 0;
  }));

  return results;
}
