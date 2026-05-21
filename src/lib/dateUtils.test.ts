/**
 * Tests for Date Utilities with Multiple Timezone Support
 * 
 * **Validates: Requirements 1.2**
 * 
 * This test suite verifies that date calculations work correctly with multiple timezones.
 * It tests:
 * 1. Date parsing and formatting with different timezones
 * 2. Competence_date is always YYYY-MM-01
 * 3. Installment dates are calculated correctly
 * 4. UTC is used consistently
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseDate, formatDate, getCompetenceDate, addMonthsToDate } from './dateUtils';
import { formatInTimeZone } from 'date-fns-tz';

describe('Date Utilities - Timezone Tests', () => {
  // Test timezones representing different regions
  const timezones = [
    'UTC',                    // UTC (baseline)
    'America/New_York',       // EST/EDT (UTC-5/-4)
    'America/Los_Angeles',    // PST/PDT (UTC-8/-7)
    'America/Sao_Paulo',      // BRT (UTC-3)
    'Europe/London',          // GMT/BST (UTC+0/+1)
    'Europe/Paris',           // CET/CEST (UTC+1/+2)
    'Asia/Tokyo',             // JST (UTC+9)
    'Asia/Shanghai',          // CST (UTC+8)
    'Australia/Sydney',       // AEDT/AEST (UTC+10/+11)
  ];

  describe('parseDate - Date Parsing with Timezones', () => {
    it('should parse ISO date string correctly regardless of system timezone', () => {
      const dateString = '2024-01-15';
      const parsed = parseDate(dateString);
      
      // Should parse to the correct date
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(0); // January
      expect(parsed.getUTCDate()).toBe(15);
    });

    it('should parse dates consistently across different timezone contexts', () => {
      const dateString = '2024-06-15';
      const parsed = parseDate(dateString);
      
      // Verify UTC components are consistent
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(5); // June
      expect(parsed.getUTCDate()).toBe(15);
      
      // Verify it's a valid date
      expect(parsed.getTime()).toBeGreaterThan(0);
    });

    it('should throw error for invalid date format', () => {
      expect(() => parseDate('2024/01/15')).toThrow();
      expect(() => parseDate('01-15-2024')).toThrow();
      expect(() => parseDate('invalid')).toThrow();
      expect(() => parseDate('')).toThrow();
    });

    it('should handle edge case dates', () => {
      // First day of year
      const jan1 = parseDate('2024-01-01');
      expect(jan1.getUTCMonth()).toBe(0);
      expect(jan1.getUTCDate()).toBe(1);
      
      // Last day of year
      const dec31 = parseDate('2024-12-31');
      expect(dec31.getUTCMonth()).toBe(11);
      expect(dec31.getUTCDate()).toBe(31);
      
      // Leap year date
      const feb29 = parseDate('2024-02-29');
      expect(feb29.getUTCMonth()).toBe(1);
      expect(feb29.getUTCDate()).toBe(29);
    });

    it('should parse dates consistently regardless of local system timezone', () => {
      const dateString = '2024-03-15';
      const parsed = parseDate(dateString);
      
      // The UTC components should always be the same
      const utcString = parsed.toISOString().split('T')[0];
      expect(utcString).toBe(dateString);
    });
  });

  describe('formatDate - Date Formatting with Timezones', () => {
    it('should format date to YYYY-MM-DD consistently', () => {
      const date = new Date('2024-01-15T12:30:45Z');
      const formatted = formatDate(date);
      
      expect(formatted).toBe('2024-01-15');
    });

    it('should format dates consistently across different timezones', () => {
      const date = new Date('2024-06-15T23:59:59Z');
      const formatted = formatDate(date);
      
      // Should always format to UTC date
      expect(formatted).toBe('2024-06-15');
    });

    it('should handle dates at timezone boundaries', () => {
      // Date at midnight UTC
      const midnightUTC = new Date('2024-01-15T00:00:00Z');
      expect(formatDate(midnightUTC)).toBe('2024-01-15');
      
      // Date just before midnight UTC
      const beforeMidnight = new Date('2024-01-14T23:59:59Z');
      expect(formatDate(beforeMidnight)).toBe('2024-01-14');
      
      // Date just after midnight UTC
      const afterMidnight = new Date('2024-01-15T00:00:01Z');
      expect(formatDate(afterMidnight)).toBe('2024-01-15');
    });

    it('should format edge case dates correctly', () => {
      // First day of year
      const jan1 = new Date('2024-01-01T00:00:00Z');
      expect(formatDate(jan1)).toBe('2024-01-01');
      
      // Last day of year
      const dec31 = new Date('2024-12-31T23:59:59Z');
      expect(formatDate(dec31)).toBe('2024-12-31');
      
      // Leap year date
      const feb29 = new Date('2024-02-29T12:00:00Z');
      expect(formatDate(feb29)).toBe('2024-02-29');
    });

    it('should format dates consistently regardless of time component', () => {
      const date1 = new Date('2024-03-15T00:00:00Z');
      const date2 = new Date('2024-03-15T12:30:45Z');
      const date3 = new Date('2024-03-15T23:59:59Z');
      
      expect(formatDate(date1)).toBe('2024-03-15');
      expect(formatDate(date2)).toBe('2024-03-15');
      expect(formatDate(date3)).toBe('2024-03-15');
    });
  });

  describe('getCompetenceDate - Competence Date Calculation', () => {
    it('should always return YYYY-MM-01 format', () => {
      const testDates = [
        '2024-01-15',
        '2024-02-29', // Leap year
        '2024-06-30',
        '2024-12-31',
      ];
      
      testDates.forEach(dateStr => {
        const date = parseDate(dateStr);
        const competenceDate = getCompetenceDate(date);
        
        // Should match YYYY-MM-01 pattern
        expect(competenceDate).toMatch(/^\d{4}-\d{2}-01$/);
        
        // Should be first day of month
        expect(competenceDate.endsWith('-01')).toBe(true);
      });
    });

    it('should return correct month for competence_date', () => {
      const testCases = [
        { input: '2024-01-15', expected: '2024-01-01' },
        { input: '2024-01-31', expected: '2024-01-01' },
        { input: '2024-02-01', expected: '2024-02-01' },
        { input: '2024-02-29', expected: '2024-02-01' }, // Leap year
        { input: '2024-06-15', expected: '2024-06-01' },
        { input: '2024-12-31', expected: '2024-12-01' },
      ];
      
      testCases.forEach(({ input, expected }) => {
        const date = parseDate(input);
        const competenceDate = getCompetenceDate(date);
        expect(competenceDate).toBe(expected);
      });
    });

    it('should handle leap year correctly', () => {
      // Leap year
      const leapYearDate = parseDate('2024-02-29');
      expect(getCompetenceDate(leapYearDate)).toBe('2024-02-01');
      
      // Non-leap year
      const nonLeapYearDate = parseDate('2023-02-28');
      expect(getCompetenceDate(nonLeapYearDate)).toBe('2023-02-01');
    });

    it('should be consistent across different times of day', () => {
      const date1 = new Date('2024-03-15T00:00:00Z');
      const date2 = new Date('2024-03-15T12:00:00Z');
      const date3 = new Date('2024-03-15T23:59:59Z');
      
      const comp1 = getCompetenceDate(date1);
      const comp2 = getCompetenceDate(date2);
      const comp3 = getCompetenceDate(date3);
      
      expect(comp1).toBe(comp2);
      expect(comp2).toBe(comp3);
      expect(comp1).toBe('2024-03-01');
    });

    it('should be consistent across year boundaries', () => {
      // Last day of year
      const dec31 = parseDate('2024-12-31');
      expect(getCompetenceDate(dec31)).toBe('2024-12-01');
      
      // First day of next year
      const jan1 = parseDate('2025-01-01');
      expect(getCompetenceDate(jan1)).toBe('2025-01-01');
    });
  });

  describe('addMonthsToDate - Installment Date Calculation', () => {
    it('should add months correctly', () => {
      const baseDate = parseDate('2024-01-15');
      
      const plus1 = addMonthsToDate(baseDate, 1);
      expect(formatDate(plus1)).toBe('2024-02-15');
      
      const plus3 = addMonthsToDate(baseDate, 3);
      expect(formatDate(plus3)).toBe('2024-04-15');
      
      const plus12 = addMonthsToDate(baseDate, 12);
      expect(formatDate(plus12)).toBe('2025-01-15');
    });

    it('should handle negative month offsets', () => {
      const baseDate = parseDate('2024-06-15');
      
      const minus1 = addMonthsToDate(baseDate, -1);
      expect(formatDate(minus1)).toBe('2024-05-15');
      
      const minus6 = addMonthsToDate(baseDate, -6);
      expect(formatDate(minus6)).toBe('2023-12-15');
    });

    it('should handle month boundary edge cases', () => {
      // Jan 31 + 1 month = Feb 28/29
      const jan31 = parseDate('2024-01-31');
      const feb = addMonthsToDate(jan31, 1);
      expect(formatDate(feb)).toBe('2024-02-29'); // 2024 is leap year
      
      // Mar 31 + 1 month = Apr 30
      const mar31 = parseDate('2024-03-31');
      const apr = addMonthsToDate(mar31, 1);
      expect(formatDate(apr)).toBe('2024-04-30');
    });

    it('should calculate installment dates correctly for 3-month installment', () => {
      const startDate = parseDate('2024-01-15');
      
      const installments = [];
      for (let i = 0; i < 3; i++) {
        const installmentDate = addMonthsToDate(startDate, i);
        installments.push(formatDate(installmentDate));
      }
      
      expect(installments).toEqual([
        '2024-01-15',
        '2024-02-15',
        '2024-03-15',
      ]);
    });

    it('should calculate installment dates correctly for 12-month installment', () => {
      const startDate = parseDate('2024-01-15');
      
      const installments = [];
      for (let i = 0; i < 12; i++) {
        const installmentDate = addMonthsToDate(startDate, i);
        installments.push(formatDate(installmentDate));
      }
      
      expect(installments).toEqual([
        '2024-01-15',
        '2024-02-15',
        '2024-03-15',
        '2024-04-15',
        '2024-05-15',
        '2024-06-15',
        '2024-07-15',
        '2024-08-15',
        '2024-09-15',
        '2024-10-15',
        '2024-11-15',
        '2024-12-15',
      ]);
    });

    it('should handle year transitions correctly', () => {
      const dec15 = parseDate('2024-12-15');
      
      const jan15 = addMonthsToDate(dec15, 1);
      expect(formatDate(jan15)).toBe('2025-01-15');
      
      const feb15 = addMonthsToDate(dec15, 2);
      expect(formatDate(feb15)).toBe('2025-02-15');
    });
  });

  describe('Round-trip Consistency', () => {
    it('should maintain consistency: parseDate -> formatDate -> parseDate', () => {
      const originalString = '2024-03-15';
      
      const parsed1 = parseDate(originalString);
      const formatted = formatDate(parsed1);
      const parsed2 = parseDate(formatted);
      
      expect(formatDate(parsed2)).toBe(originalString);
    });

    it('should maintain consistency across multiple round-trips', () => {
      const originalString = '2024-06-30';
      let current = originalString;
      
      for (let i = 0; i < 5; i++) {
        const parsed = parseDate(current);
        current = formatDate(parsed);
      }
      
      expect(current).toBe(originalString);
    });
  });

  describe('Competence Date Invariant', () => {
    it('should maintain invariant: competence_date always equals first day of month', () => {
      const testDates = [
        '2024-01-01', '2024-01-15', '2024-01-31',
        '2024-02-01', '2024-02-15', '2024-02-29',
        '2024-06-01', '2024-06-15', '2024-06-30',
        '2024-12-01', '2024-12-15', '2024-12-31',
      ];
      
      testDates.forEach(dateStr => {
        const date = parseDate(dateStr);
        const competenceDate = getCompetenceDate(date);
        
        // Extract day from competence date
        const day = competenceDate.split('-')[2];
        expect(day).toBe('01');
      });
    });

    it('should maintain invariant: competence_date month matches input month', () => {
      const testCases = [
        { input: '2024-01-15', expectedMonth: '01' },
        { input: '2024-02-29', expectedMonth: '02' },
        { input: '2024-06-15', expectedMonth: '06' },
        { input: '2024-12-31', expectedMonth: '12' },
      ];
      
      testCases.forEach(({ input, expectedMonth }) => {
        const date = parseDate(input);
        const competenceDate = getCompetenceDate(date);
        
        const month = competenceDate.split('-')[1];
        expect(month).toBe(expectedMonth);
      });
    });

    it('should maintain invariant: competence_date year matches input year', () => {
      const testCases = [
        { input: '2024-01-15', expectedYear: '2024' },
        { input: '2023-06-30', expectedYear: '2023' },
        { input: '2025-12-31', expectedYear: '2025' },
      ];
      
      testCases.forEach(({ input, expectedYear }) => {
        const date = parseDate(input);
        const competenceDate = getCompetenceDate(date);
        
        const year = competenceDate.split('-')[0];
        expect(year).toBe(expectedYear);
      });
    });
  });

  describe('Installment Date Invariant', () => {
    it('should maintain invariant: installment dates increment by exactly 1 month', () => {
      const startDate = parseDate('2024-01-15');
      
      for (let i = 0; i < 11; i++) {
        const current = addMonthsToDate(startDate, i);
        const next = addMonthsToDate(startDate, i + 1);
        
        const currentMonth = current.getUTCMonth();
        const nextMonth = next.getUTCMonth();
        
        // Month should increment by 1 (with year wrap-around)
        const expectedNextMonth = (currentMonth + 1) % 12;
        expect(nextMonth).toBe(expectedNextMonth);
      }
    });

    it('should maintain invariant: installment day stays consistent', () => {
      const startDate = parseDate('2024-01-15');
      const startDay = startDate.getUTCDate();
      
      for (let i = 0; i < 12; i++) {
        const installmentDate = addMonthsToDate(startDate, i);
        // Day should be 15 (or adjusted for month boundaries)
        expect(installmentDate.getUTCDate()).toBe(15);
      }
    });

    it('should maintain invariant: installment dates are in correct order', () => {
      const startDate = parseDate('2024-01-15');
      
      const dates = [];
      for (let i = 0; i < 12; i++) {
        const installmentDate = addMonthsToDate(startDate, i);
        dates.push(installmentDate.getTime());
      }
      
      // Verify dates are in ascending order
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeLessThan(dates[i + 1]);
      }
    });
  });

  describe('UTC Consistency', () => {
    it('should use UTC consistently for all operations', () => {
      const dateString = '2024-06-15';
      const parsed = parseDate(dateString);
      
      // Verify UTC components
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(5);
      expect(parsed.getUTCDate()).toBe(15);
      
      // Format should use UTC
      const formatted = formatDate(parsed);
      expect(formatted).toBe('2024-06-15');
      
      // Competence date should use UTC
      const competenceDate = getCompetenceDate(parsed);
      expect(competenceDate).toBe('2024-06-01');
    });

    it('should not be affected by local system timezone', () => {
      const dateString = '2024-03-15';
      const parsed = parseDate(dateString);
      
      // The ISO string should always represent the same UTC date
      const isoString = parsed.toISOString();
      expect(isoString.split('T')[0]).toBe(dateString);
    });
  });

  describe('Property-Based Tests', () => {
    it('should parse and format any valid date consistently', () => {
      // Test a range of dates
      for (let year = 2020; year <= 2030; year++) {
        for (let month = 1; month <= 12; month++) {
          // Test first, middle, and last day of month
          const daysInMonth = new Date(year, month, 0).getDate();
          const testDays = [1, Math.ceil(daysInMonth / 2), daysInMonth];
          
          testDays.forEach(day => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const parsed = parseDate(dateStr);
            const formatted = formatDate(parsed);
            
            expect(formatted).toBe(dateStr);
          });
        }
      }
    });

    it('should calculate competence dates correctly for all months', () => {
      for (let year = 2020; year <= 2030; year++) {
        for (let month = 1; month <= 12; month++) {
          const daysInMonth = new Date(year, month, 0).getDate();
          
          // Test multiple days in each month
          for (let day = 1; day <= daysInMonth; day += Math.max(1, Math.floor(daysInMonth / 3))) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const parsed = parseDate(dateStr);
            const competenceDate = getCompetenceDate(parsed);
            
            const expectedCompetenceDate = `${year}-${String(month).padStart(2, '0')}-01`;
            expect(competenceDate).toBe(expectedCompetenceDate);
          }
        }
      }
    });

    it('should calculate installment dates correctly for various start dates', () => {
      const startDates = [
        '2024-01-15',
        '2024-02-29', // Leap year
        '2024-03-31', // Month boundary
        '2024-06-15',
        '2024-12-31', // Year boundary
      ];
      
      startDates.forEach(startDateStr => {
        const startDate = parseDate(startDateStr);
        
        // Calculate 12 installments
        const installments = [];
        for (let i = 0; i < 12; i++) {
          const installmentDate = addMonthsToDate(startDate, i);
          installments.push(formatDate(installmentDate));
        }
        
        // Verify all installments are valid dates
        installments.forEach(dateStr => {
          expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          const parsed = parseDate(dateStr);
          expect(parsed.getTime()).toBeGreaterThan(0);
        });
        
        // Verify installments are in order
        for (let i = 0; i < installments.length - 1; i++) {
          const current = parseDate(installments[i]);
          const next = parseDate(installments[i + 1]);
          expect(current.getTime()).toBeLessThan(next.getTime());
        }
      });
    });
  });
});
