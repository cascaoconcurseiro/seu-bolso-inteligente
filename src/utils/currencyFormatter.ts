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
export const formatCurrency = (amount: number, currency: string = "BRL"): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Get currency symbol
 * @param currency - The currency code (default: BRL)
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: string = "BRL"): string => {
  const symbols: Record<string, string> = {
    BRL: "R$",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    ARS: "$",
    CLP: "$",
    UYU: "$",
    PYG: "₲",
  };
  return symbols[currency] || currency;
};
