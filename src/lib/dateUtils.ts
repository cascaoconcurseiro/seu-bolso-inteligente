/**
 * Date Utilities using date-fns with UTC
 * 
 * All functions use UTC to avoid timezone issues.
 * Never use new Date(year, month-1, day) constructor.
 * 
 * **Validates: Requirements 1.2**
 */

import { parseISO, format, addMonths, startOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Parse ISO string (YYYY-MM-DD) using date-fns
 * 
 * @param dateString - ISO date string in format YYYY-MM-DD
 * @returns Parsed Date object in UTC
 * @throws Error if date string is invalid
 * 
 * @example
 * const date = parseDate('2024-01-15');
 * // Returns: Date object for 2024-01-15 00:00:00 UTC
 */
export function parseDate(dateString: string): Date {
  try {
    const date = parseISO(dateString);
    // Check if the parsed date is valid
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    }
    return date;
  } catch (error) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
}

/**
 * Format date to YYYY-MM-DD string using UTC
 * 
 * @param date - Date object to format
 * @returns Formatted date string in YYYY-MM-DD format (UTC)
 * 
 * @example
 * const dateStr = formatDate(new Date('2024-01-15'));
 * // Returns: '2024-01-15'
 */
export function formatDate(date: Date): string {
  // Use formatInTimeZone with UTC to ensure consistent formatting
  return formatInTimeZone(date, 'UTC', 'yyyy-MM-dd');
}

/**
 * Get competence_date (first day of month in YYYY-MM-01 format)
 * 
 * Used for grouping transactions by their accounting period.
 * Always returns the first day of the month.
 * 
 * @param date - Date object to get competence date from
 * @returns Competence date string in YYYY-MM-01 format (UTC)
 * 
 * @example
 * const competenceDate = getCompetenceDate(new Date('2024-01-15'));
 * // Returns: '2024-01-01'
 * 
 * const competenceDate = getCompetenceDate(new Date('2024-12-31'));
 * // Returns: '2024-12-01'
 */
export function getCompetenceDate(date: Date): string {
  const firstDayOfMonth = startOfMonth(date);
  return formatInTimeZone(firstDayOfMonth, 'UTC', 'yyyy-MM-dd');
}

/**
 * Add months to a date
 * 
 * Used for calculating installment dates.
 * Handles month boundaries correctly (e.g., Jan 31 + 1 month = Feb 28/29).
 * 
 * @param date - Base date
 * @param months - Number of months to add (can be negative)
 * @returns New Date object with months added
 * 
 * @example
 * const nextMonth = addMonthsToDate(new Date('2024-01-15'), 1);
 * // Returns: Date object for 2024-02-15
 * 
 * const threeMonthsLater = addMonthsToDate(new Date('2024-01-31'), 3);
 * // Returns: Date object for 2024-04-30 (handles month boundary)
 */
export function addMonthsToDate(date: Date, months: number): Date {
  return addMonths(date, months);
}

/**
 * Export all functions as a namespace for convenience
 */
export const dateUtils = {
  parseDate,
  formatDate,
  getCompetenceDate,
  addMonthsToDate,
};
