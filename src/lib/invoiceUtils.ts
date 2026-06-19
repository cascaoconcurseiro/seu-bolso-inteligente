// Utility functions for credit card invoice calculations
import { parseDate, formatDate, getCompetenceDate, addMonthsToDate } from '@/lib/dateUtils';

export interface InvoiceData {
  invoiceTotal: number;
  transactions: any[];
  status: 'OPEN' | 'CLOSED';
  daysToClose: number;
  closingDate: Date;
  dueDate: Date;
  startDate: Date;
}

/**
 * Determines which invoice month to show based on current date and closing day
 * Uses UTC-safe date operations via dateUtils
 */
export const getTargetDate = (date: Date, closingDay?: number): Date => {
  if (!closingDay) return date;
  
  const currentDay = date.getDate();
  
  // If today is after the closing day, show next month's invoice
  if (currentDay > closingDay) {
    return addMonthsToDate(date, 1);
  }
  
  return date;
};

/**
 * Calculates invoice data for a given card and reference date
 * Uses UTC-safe date operations via dateUtils
 */
export const getInvoiceData = (
  account: { id: string; closing_day: number | null; due_day: number | null },
  transactions: any[],
  referenceDate: Date
): InvoiceData => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const closingDay = account.closing_day || 1;
  
  // Create dates using UTC-safe operations
  // Closing date is the closing day of the reference month
  const closingDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`;
  const closingDate = parseDate(closingDateStr);
  
  // Start date is the day after closing of previous month
  const startDate = addMonthsToDate(closingDate, -1);
  const startDateStr = formatDate(addMonthsToDate(startDate, 0));
  
  // Due date
  const dueDay = account.due_day || 10;
  const dueDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
  let dueDate = parseDate(dueDateStr);
  
  // If due day <= closing day, due date is next month
  if (dueDay <= closingDay) {
    dueDate = addMonthsToDate(dueDate, 1);
  }
  
  // Filter transactions for this invoice period
  const startStr = formatDate(startDate);
  const endStr = formatDate(closingDate);
  
  const filteredTransactions = transactions.filter((t: any) => {
    if (t.account_id !== account.id && t.destination_account_id !== account.id) return false;
    
    // Only include:
    // 1. Expenses/Incomes in this account
    // 2. Transfers to this account (payments)
    if (t.type === 'TRANSFER' && t.destination_account_id !== account.id) return false;

    // Use competence_date to match the invoice month bucket
    // We compare year and month to ensure we get the right invoice period
    const txDate = t.competence_date ? parseDate(t.competence_date) : parseDate(t.date);
    return txDate.getMonth() === month && txDate.getFullYear() === year;
  });
  
  // Calculate total
  const total = filteredTransactions.reduce((acc: number, t: any) => {
    const amount = Number(t.amount);
    if (t.type === 'EXPENSE') return acc + amount;
    if (t.type === 'INCOME') return acc - amount;
    
    // Tratamento especial para Saldo Rotativo (Self-Transfers)
    if (t.type === 'TRANSFER' && t.account_id === account.id && t.destination_account_id === account.id) {
      if (t.description?.includes('Estorno Saldo Rotativo')) return acc - amount; // Funciona como pagamento
      if (t.description?.includes('Saldo Rotativo Fatura Anterior')) return acc + amount; // Funciona como cobrança
      return acc; // Ignora outros self-transfers
    }

    if (t.type === 'TRANSFER' && t.destination_account_id === account.id) return acc - amount;
    if (t.type === 'TRANSFER' && t.account_id === account.id) return acc + amount;
    return acc;
  }, 0);
  
  // Determine status
  const now = new Date();
  const status: 'OPEN' | 'CLOSED' = closingDate < now ? 'CLOSED' : 'OPEN';
  const daysToClose = Math.ceil(
    (closingDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
  );
  
  return {
    invoiceTotal: total,
    transactions: filteredTransactions,
    status,
    daysToClose,
    closingDate,
    dueDate,
    startDate
  };
};

/**
 * Format invoice cycle range string
 */
export const formatCycleRange = (startDate: Date, closingDate: Date): string => {
  const formatDay = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  return `${formatDay(startDate)} a ${formatDay(closingDate)}`;
};
