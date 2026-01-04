// Utility functions for credit card invoice calculations

export interface InvoiceData {
  invoiceTotal: number;
  transactions: any[];
  status: 'OPEN' | 'CLOSED';
  daysToClose: number;
  closingDate: Date;
  dueDate: Date;
  startDate: Date;
}

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Determines which invoice month to show based on current date and closing day
 */
export const getTargetDate = (date: Date, closingDay?: number): Date => {
  if (!closingDay) return date;
  
  const d = new Date(date);
  const currentDay = d.getDate();
  
  // If today is after the closing day, show next month's invoice
  if (currentDay > closingDay) {
    d.setMonth(d.getMonth() + 1);
  }
  
  return d;
};

/**
 * Calculates invoice data for a given card and reference date
 */
export const getInvoiceData = (
  account: { id: string; closing_day: number | null; due_day: number | null },
  transactions: any[],
  referenceDate: Date
): InvoiceData => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const closingDay = account.closing_day || 1;
  
  // Closing date is the closing day of the reference month
  const closingDate = new Date(year, month, closingDay);
  
  // Start date is the day after closing of previous month
  const startDate = new Date(year, month - 1, closingDay + 1);
  
  // Due date
  const dueDay = account.due_day || 10;
  const dueDate = new Date(year, month, dueDay);
  
  // If due day < closing day, due date is next month
  if (dueDay <= closingDay) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  // Filter transactions for this invoice period
  const startStr = formatLocalDate(startDate);
  const endStr = formatLocalDate(closingDate);
  
  const filteredTransactions = transactions.filter(t => {
    if (t.account_id !== account.id) return false;
    // Use competence_date for credit card transactions to respect invoice cycles
    const dateToCompare = t.competence_date || t.date;
    return dateToCompare >= startStr && dateToCompare <= endStr;
  });
  
  // Calculate total
  const total = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'EXPENSE') return acc + t.amount;
    if (t.type === 'INCOME') return acc - t.amount;
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
