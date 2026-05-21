/**
 * Financial Calculation Utilities
 * Centralized financial calculations using SafeFinancialCalculator
 */

import { SafeFinancialCalculator } from '@/services/SafeFinancialCalculator';

/**
 * Calculate total amount from an array of items
 */
export const calculateTotal = (items: Array<{ amount: number }>): number => {
  return SafeFinancialCalculator.safeSum(items.map(i => i.amount));
};

/**
 * Calculate total amount filtered by type
 */
export const calculateTotalByType = (
  items: Array<{ amount: number; type: string }>,
  type: string
): number => {
  const filtered = items.filter(i => i.type === type);
  return calculateTotal(filtered);
};

/**
 * Calculate net amount (credits - debits)
 */
export const calculateNetAmount = (
  items: Array<{ amount: number; type: 'CREDIT' | 'DEBIT' }>
): number => {
  const credits = calculateTotalByType(items, 'CREDIT');
  const debits = calculateTotalByType(items, 'DEBIT');
  return SafeFinancialCalculator.subtract(credits, debits);
};

/**
 * Calculate total income from transactions
 */
export const calculateTotalIncome = (
  transactions: Array<{ amount: number; type: string }>
): number => {
  return calculateTotalByType(transactions, 'INCOME');
};

/**
 * Calculate total expenses from transactions
 */
export const calculateTotalExpenses = (
  transactions: Array<{ amount: number; type: string }>
): number => {
  return calculateTotalByType(transactions, 'EXPENSE');
};

/**
 * Calculate savings (income - expenses)
 */
export const calculateSavings = (
  transactions: Array<{ amount: number; type: string }>
): number => {
  const income = calculateTotalIncome(transactions);
  const expenses = calculateTotalExpenses(transactions);
  return SafeFinancialCalculator.subtract(income, expenses);
};

/**
 * Calculate percentage of a value
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return SafeFinancialCalculator.multiply(
    SafeFinancialCalculator.divide(value, total),
    100
  );
};

/**
 * Calculate budget usage percentage
 */
export const calculateBudgetUsage = (spent: number, budget: number): number => {
  return calculatePercentage(spent, budget);
};

/**
 * Calculate remaining budget
 */
export const calculateRemainingBudget = (budget: number, spent: number): number => {
  return SafeFinancialCalculator.subtract(budget, spent);
};

/**
 * Group amounts by currency
 */
export const groupByCurrency = <T extends { amount: number; currency?: string }>(
  items: T[]
): Record<string, { items: T[]; total: number }> => {
  const grouped: Record<string, { items: T[]; total: number }> = {};

  items.forEach(item => {
    const currency = item.currency || 'BRL';
    if (!grouped[currency]) {
      grouped[currency] = { items: [], total: 0 };
    }
    grouped[currency].items.push(item);
    grouped[currency].total = SafeFinancialCalculator.add(
      grouped[currency].total,
      item.amount
    );
  });

  return grouped;
};

/**
 * Calculate totals by currency for credits and debits
 */
export const calculateTotalsByCurrency = (
  items: Array<{ amount: number; type: 'CREDIT' | 'DEBIT'; currency?: string; isPaid?: boolean }>
): Record<string, { credits: number; debits: number; net: number }> => {
  const totals: Record<string, { credits: number; debits: number; net: number }> = {};

  items.forEach(item => {
    // Skip paid items if isPaid field exists
    if (item.isPaid !== undefined && item.isPaid) return;

    const currency = item.currency || 'BRL';
    if (!totals[currency]) {
      totals[currency] = { credits: 0, debits: 0, net: 0 };
    }

    if (item.type === 'CREDIT') {
      totals[currency].credits = SafeFinancialCalculator.add(
        totals[currency].credits,
        item.amount
      );
    } else {
      totals[currency].debits = SafeFinancialCalculator.add(
        totals[currency].debits,
        item.amount
      );
    }
  });

  // Calculate net for each currency
  Object.keys(totals).forEach(currency => {
    totals[currency].net = SafeFinancialCalculator.subtract(
      totals[currency].credits,
      totals[currency].debits
    );
  });

  return totals;
};

/**
 * Calculate average amount
 */
export const calculateAverage = (items: Array<{ amount: number }>): number => {
  if (items.length === 0) return 0;
  const total = calculateTotal(items);
  return SafeFinancialCalculator.divide(total, items.length);
};

/**
 * Find maximum amount
 */
export const findMaxAmount = (items: Array<{ amount: number }>): number => {
  if (items.length === 0) return 0;
  return Math.max(...items.map(i => i.amount));
};

/**
 * Find minimum amount
 */
export const findMinAmount = (items: Array<{ amount: number }>): number => {
  if (items.length === 0) return 0;
  return Math.min(...items.map(i => i.amount));
};
