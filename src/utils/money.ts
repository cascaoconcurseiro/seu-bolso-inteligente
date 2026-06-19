import Decimal from 'decimal.js';

/**
 * Financial Precision Utility
 * 
 * Handles all monetary calculations and formatting using Decimal.js 
 * to ensure consistency and prevent floating-point rounding errors across the application.
 */

// Configura o Decimal.js para arredondamento bancário (Banker's rounding - ROUND_HALF_EVEN)
// e precisão adequada para dinheiro.
Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });

export const moneyUtils = {
  /**
   * Parse a string or number into a safe Decimal instance.
   * Handles Brazilian formatting like "1.234,56" or "1234.56"
   */
  parseToDecimal: (value: string | number | undefined | null): Decimal => {
    if (value === undefined || value === null || value === '') return new Decimal(0);
    if (typeof value === 'number') return new Decimal(value);
    
    // Tratamento de string: remove pontos de milhar, troca vírgula decimal por ponto,
    // e extrai apenas números, pontos e sinais.
    let cleaned = value.toString().trim();
    
    // Verifica se já tem ponto como separador decimal (formato inglês: 1234.56)
    // ou se tem vírgula (formato BR: 1234,56).
    // Se tiver ambos (1.234,56), limpa os pontos primeiro.
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    
    // Limpa moedas e espaços ("R$ 1.234,56" -> "1234.56")
    cleaned = cleaned.replace(/[^\d.-]/g, '');
    
    if (!cleaned || cleaned === '-' || cleaned === '.') return new Decimal(0);
    
    try {
      return new Decimal(cleaned);
    } catch {
      return new Decimal(0);
    }
  },

  /**
   * Parses a value and returns a Javascript primitive number (only for storage/legacy APIs).
   * Note: Whenever doing math, use parseToDecimal directly.
   */
  parse: (value: string | number | undefined | null): number => {
    return moneyUtils.parseToDecimal(value).toNumber();
  },

  /**
   * Safely adds multiple numbers
   */
  add: (...values: (string | number)[]): number => {
    const sum = values.reduce((acc: Decimal, val) => acc.plus(moneyUtils.parseToDecimal(val)), new Decimal(0));
    return sum.toDecimalPlaces(2).toNumber();
  },

  /**
   * Safely subtracts (a - b)
   */
  sub: (a: string | number, b: string | number): number => {
    const res = moneyUtils.parseToDecimal(a).minus(moneyUtils.parseToDecimal(b));
    return res.toDecimalPlaces(2).toNumber();
  },

  /**
   * Safely multiplies (a * b)
   */
  mul: (a: string | number, b: string | number): number => {
    const res = moneyUtils.parseToDecimal(a).times(moneyUtils.parseToDecimal(b));
    return res.toDecimalPlaces(2).toNumber();
  },

  /**
   * Safely divides (a / b)
   */
  div: (a: string | number, b: string | number): number => {
    const denom = moneyUtils.parseToDecimal(b);
    if (denom.isZero()) return 0;
    const res = moneyUtils.parseToDecimal(a).dividedBy(denom);
    return res.toDecimalPlaces(2).toNumber();
  },

  /**
   * Rounds a number to exactly 2 decimal places using financial rounding.
   */
  round: (value: number | string): number => {
    return moneyUtils.parseToDecimal(value).toDecimalPlaces(2).toNumber();
  },

  /**
   * Formats a number as a currency string.
   */
  format: (value: number | string, currency = 'BRL', locale = 'pt-BR'): string => {
    const numValue = moneyUtils.parseToDecimal(value).toNumber();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(numValue);
  },

  /**
   * Safely splits an amount into N parts, ensuring the sum of parts
   * exactly equals the original amount by adjusting the last part.
   * 
   * Example: split(10, 3) -> [3.33, 3.33, 3.34]
   */
  splitSafely: (totalAmount: number | string, parts: number): number[] => {
    if (parts <= 0) return [];
    
    const total = moneyUtils.parseToDecimal(totalAmount);
    if (parts === 1) return [total.toDecimalPlaces(2).toNumber()];

    const partAmount = total.dividedBy(parts).toDecimalPlaces(2, Decimal.ROUND_FLOOR);
    const result = Array(parts - 1).fill(partAmount.toNumber());
    
    // Calculate the last part to absorb any rounding difference
    const currentSum = partAmount.times(parts - 1);
    const lastPart = total.minus(currentSum).toDecimalPlaces(2);
    
    result.push(lastPart.toNumber());
    return result;
  },

  /**
   * Checks if a set of splits matches the total amount.
   */
  isValidSplit: (totalAmount: number | string, splits: (number | string)[]): boolean => {
    const total = moneyUtils.parseToDecimal(totalAmount);
    const sum = splits.reduce((acc: Decimal, val) => acc.plus(moneyUtils.parseToDecimal(val)), new Decimal(0));
    return total.toDecimalPlaces(2).equals(sum.toDecimalPlaces(2));
  },

  /**
   * Returns the currency symbol for a given currency code.
   */
  getSymbol: (currency: string = 'BRL'): string => {
    switch (currency.toUpperCase()) {
      case 'BRL': return 'R$';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      default: return '$';
    }
  }
};


