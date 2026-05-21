/**
 * Financial Precision Utility
 * 
 * Handles all monetary calculations and formatting to ensure consistency
 * and prevent rounding errors across the application.
 */

export const moneyUtils = {
  /**
   * Rounds a number to exactly 2 decimal places using financial rounding.
   */
  round: (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  },

  /**
   * Formats a number as a currency string.
   */
  format: (value: number, currency = 'BRL', locale = 'pt-BR'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(value);
  },

  /**
   * Safely splits an amount into N parts, ensuring the sum of parts
   * exactly equals the original amount by adjusting the last part.
   * 
   * Example: split(10, 3) -> [3.33, 3.33, 3.34]
   */
  splitSafely: (total: number, parts: number): number[] => {
    if (parts <= 0) return [];
    if (parts === 1) return [moneyUtils.round(total)];

    const partAmount = moneyUtils.round(total / parts);
    const result = Array(parts - 1).fill(partAmount);
    
    // Calculate the last part to absorb any rounding difference
    const currentSum = result.reduce((a, b) => a + b, 0);
    const lastPart = moneyUtils.round(total - currentSum);
    
    result.push(lastPart);
    return result;
  },

  /**
   * Checks if a set of splits matches the total amount.
   */
  isValidSplit: (total: number, splits: number[]): boolean => {
    const sum = splits.reduce((a, b) => a + b, 0);
    return Math.abs(moneyUtils.round(total) - moneyUtils.round(sum)) < 0.001;
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

export default moneyUtils;
