import { moneyUtils } from "@/utils/money";
/**
 * Currency Formatting Utilities
 * Centralized currency formatting for consistent display across the app
 */

/**
 * Format amount as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: BRL)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'BRL'
): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format amount as compact currency (e.g., R$ 1,2 mil)
 * @param amount - The amount to format
 * @param currency - The currency code (default: BRL)
 * @returns Formatted compact currency string
 */
export const formatCurrencyCompact = (
  amount: number,
  currency: string = 'BRL'
): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(amount);
};

/**
 * Format amount without currency symbol
 * @param amount - The amount to format
 * @returns Formatted number string
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format amount with custom decimal places
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatAmountWithDecimals = (
  amount: number,
  decimals: number = 2
): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  decimals: number = 1
): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Get currency symbol
 * @param currency - The currency code (default: BRL)
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: string = 'BRL'): string => {
  const symbols: Record<string, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    ARS: '$',
    CLP: '$',
    UYU: '$',
    PYG: '₲',
  };
  return symbols[currency] || currency;
};

/**
 * Format currency with color based on value (positive/negative)
 * @param amount - The amount to format
 * @param currency - The currency code (default: BRL)
 * @returns Object with formatted value and color class
 */
export const formatCurrencyWithColor = (
  amount: number,
  currency: string = 'BRL'
): { formatted: string; colorClass: string } => {
  const formatted = formatCurrency(amount, currency);
  const colorClass = amount >= 0 ? 'text-green-600' : 'text-red-600';
  return { formatted, colorClass };
};

/**
 * Format currency for input (without symbol, with decimal separator)
 * @param amount - The amount to format
 * @returns Formatted string for input
 */
export const formatCurrencyForInput = (amount: number): string => {
  return amount.toFixed(2).replace('.', ',');
};

/**
 * Parse currency input to number
 * @param value - The input string
 * @returns Parsed number
 */
export const parseCurrencyInput = (value: string): number => {
  // Remove currency symbols and spaces
  const cleaned = value.replace(/[R$\s]/g, '');
  // Replace comma with dot for decimal
  const normalized = cleaned.replace(',', '.');
  return moneyUtils.parse(normalized) || 0;
};

/**
 * Format multiple currencies (for multi-currency display)
 * @param amounts - Array of {amount, currency} objects
 * @returns Formatted string with all currencies
 */
export const formatMultipleCurrencies = (
  amounts: Array<{ amount: number; currency: string }>
): string => {
  return amounts
    .map(({ amount, currency }) => formatCurrency(amount, currency))
    .join(' + ');
};

/**
 * Format currency with sign (+ or -)
 * @param amount - The amount to format
 * @param currency - The currency code (default: BRL)
 * @returns Formatted currency with sign
 */
export const formatCurrencyWithSign = (
  amount: number,
  currency: string = 'BRL'
): string => {
  const formatted = formatCurrency(Math.abs(amount), currency);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
};
