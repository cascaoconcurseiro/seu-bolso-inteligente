/**
 * Serviço de cálculos de câmbio para viagens
 * Implementa cálculos de taxa efetiva, média ponderada e resumo de câmbio
 *
 * SEGURANÇA MATEMÁTICA: Valores monetários (local_amount) são somados via
 * SafeFinancialCalculator para evitar erros de ponto flutuante (IEEE 754).
 * Taxas cambiais (exchange_rate) são arredondadas a 4 casas decimais.
 */

import { SafeFinancialCalculator } from "./SafeFinancialCalculator";

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
 * Resultado arredondado a 4 casas decimais para precisão cambial.
 */
export function calculateEffectiveRate(exchangeRate: number, cetPercentage: number): number {
  if (exchangeRate <= 0) {
    throw new Error("Taxa de câmbio deve ser maior que zero");
  }
  if (cetPercentage < 0) {
    throw new Error("CET não pode ser negativo");
  }
  // Arredonda a 4 casas decimais para taxas cambiais
  return Math.round(exchangeRate * (1 + cetPercentage / 100) * 10000) / 10000;
}

/**
 * Calcula o valor em moeda local
 * Fórmula: valor_local = valor_estrangeiro * taxa_efetiva
 * Utiliza SafeFinancialCalculator para precisão monetária.
 */
export function calculateLocalAmount(foreignAmount: number, effectiveRate: number): number {
  if (foreignAmount <= 0) {
    throw new Error("Valor em moeda estrangeira deve ser maior que zero");
  }
  if (effectiveRate <= 0) {
    throw new Error("Taxa efetiva deve ser maior que zero");
  }
  return SafeFinancialCalculator.multiply(foreignAmount, effectiveRate).toNumber();
}

/**
 * Calcula a média ponderada do câmbio
 * Fórmula: média = soma(valores_locais) / soma(valores_estrangeiros)
 *
 * SEGURANÇA: Os totais locais são somados via safeSum (centavos inteiros).
 * Os valores estrangeiros também são somados de forma segura.
 * O resultado final (taxa) é arredondado a 4 casas decimais.
 */
export function calculateWeightedAverageRate(purchases: ExchangePurchase[]): number {
  if (purchases.length === 0) {
    return 0;
  }

  // Soma segura dos valores locais (BRL) em centavos
  const totalLocal = SafeFinancialCalculator.safeSum(purchases.map((p) => p.local_amount));
  // Soma segura dos valores estrangeiros em suas unidades mínimas
  const totalForeign = SafeFinancialCalculator.safeSum(purchases.map((p) => p.foreign_amount));

  if (totalForeign.isZero()) {
    return 0;
  }

  // Divisão via Decimal (sem operadores nativos) — taxa a 4 casas decimais
  return totalLocal.dividedBy(totalForeign).toDecimalPlaces(4).toNumber();
}

/**
 * Calcula o resumo completo de câmbio
 */
export function calculateExchangeSummary(purchases: ExchangePurchase[]): ExchangeSummary {
  // Somas seguras para valores monetários
  const totalForeignPurchased = SafeFinancialCalculator.safeSum(
    purchases.map((p) => p.foreign_amount)
  ).toNumber();
  const totalLocalSpent = SafeFinancialCalculator.safeSum(
    purchases.map((p) => p.local_amount)
  ).toNumber();
  const weightedAverageRate = calculateWeightedAverageRate(purchases);

  return {
    totalForeignPurchased,
    totalLocalSpent,
    weightedAverageRate,
    purchaseCount: purchases.length,
  };
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
