/**
 * Serviço de cálculos de câmbio para viagens
 * Implementa cálculos de taxa efetiva, média ponderada e resumo de câmbio
 */

export interface ExchangePurchase {
  id: string;
  trip_id: string;
  user_id: string;
  foreign_amount: number;
  exchange_rate: number;
  cet_percentage: number;
  effective_rate: number;
  local_amount: number;
  description: string | null;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangeSummary {
  totalForeignPurchased: number;
  totalLocalSpent: number;
  weightedAverageRate: number;
  purchaseCount: number;
}

/**
 * Calcula a taxa efetiva incluindo o CET
 * Fórmula: taxa_efetiva = taxa_nominal * (1 + CET/100)
 */
export function calculateEffectiveRate(exchangeRate: number, cetPercentage: number): number {
  if (exchangeRate <= 0) {
    throw new Error("Taxa de câmbio deve ser maior que zero");
  }
  if (cetPercentage < 0) {
    throw new Error("CET não pode ser negativo");
  }
  return exchangeRate * (1 + cetPercentage / 100);
}

/**
 * Calcula o valor em moeda local
 * Fórmula: valor_local = valor_estrangeiro * taxa_efetiva
 */
export function calculateLocalAmount(foreignAmount: number, effectiveRate: number): number {
  if (foreignAmount <= 0) {
    throw new Error("Valor em moeda estrangeira deve ser maior que zero");
  }
  if (effectiveRate <= 0) {
    throw new Error("Taxa efetiva deve ser maior que zero");
  }
  return foreignAmount * effectiveRate;
}

/**
 * Calcula a média ponderada do câmbio
 * Fórmula: média = soma(valores_locais) / soma(valores_estrangeiros)
 */
export function calculateWeightedAverageRate(purchases: ExchangePurchase[]): number {
  if (purchases.length === 0) {
    return 0;
  }

  const totalForeign = purchases.reduce((sum, p) => sum + p.foreign_amount, 0);
  const totalLocal = purchases.reduce((sum, p) => sum + p.local_amount, 0);

  if (totalForeign === 0) {
    return 0;
  }

  return totalLocal / totalForeign;
}

/**
 * Calcula o resumo completo de câmbio
 */
export function calculateExchangeSummary(purchases: ExchangePurchase[]): ExchangeSummary {
  const totalForeignPurchased = purchases.reduce((sum, p) => sum + p.foreign_amount, 0);
  const totalLocalSpent = purchases.reduce((sum, p) => sum + p.local_amount, 0);
  const weightedAverageRate = calculateWeightedAverageRate(purchases);

  return {
    totalForeignPurchased,
    totalLocalSpent,
    weightedAverageRate,
    purchaseCount: purchases.length,
  };
}

/**
 * Formata valor com símbolo da moeda
 */
export function formatCurrencyWithSymbol(value: number, currencyCode: string): string {
  const symbols: Record<string, string> = {
    BRL: "R$",
    USD: "$",
    EUR: "€",
    GBP: "£",
    ARS: "$",
    CLP: "$",
    UYU: "$",
    PYG: "₲",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    CHF: "CHF",
    MXN: "$",
    COP: "$",
    PEN: "S/",
  };

  const symbol = symbols[currencyCode] || currencyCode;
  
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace(/^/, `${symbol} `);
}

/**
 * Retorna o símbolo da moeda
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    BRL: "R$",
    USD: "$",
    EUR: "€",
    GBP: "£",
    ARS: "$",
    CLP: "$",
    UYU: "$",
    PYG: "₲",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    CHF: "CHF",
    MXN: "$",
    COP: "$",
    PEN: "S/",
  };

  return symbols[currencyCode] || currencyCode;
}
