import { describe, it, expect } from 'vitest';
import { SafeFinancialCalculator } from '../SafeFinancialCalculator';

describe('SafeFinancialCalculator', () => {
  describe('toSafeNumber', () => {
    it('should convert float to integer cents', () => {
      expect(SafeFinancialCalculator.toSafeNumber(10.55)).toBe(1055);
      expect(SafeFinancialCalculator.toSafeNumber(10.555)).toBe(1056); // rounding
      expect(SafeFinancialCalculator.toSafeNumber('10.55')).toBe(1055);
    });

    it('should handle invalid values with default', () => {
      expect(SafeFinancialCalculator.toSafeNumber('abc', 100)).toBe(100);
      expect(SafeFinancialCalculator.toSafeNumber(NaN, 50)).toBe(50);
    });
  });

  describe('arithmetic operations', () => {
    it('should add numbers without floating point errors', () => {
      // 0.1 + 0.2 is 0.30000000000000004 in standard JS
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(SafeFinancialCalculator.add(0.1, 0.2)).toBe(0.3);
    });

    it('should subtract numbers safely', () => {
      expect(SafeFinancialCalculator.subtract(0.3, 0.2)).toBe(0.1);
    });

    it('should multiply numbers safely', () => {
      expect(SafeFinancialCalculator.multiply(10.5, 3)).toBe(31.5);
    });

    it('should divide numbers safely', () => {
      expect(SafeFinancialCalculator.divide(10, 3)).toBe(3.33);
      expect(() => SafeFinancialCalculator.divide(10, 0)).toThrow('Division by zero');
    });
  });

  describe('percentage and sum', () => {
    it('should calculate percentage correctly', () => {
      expect(SafeFinancialCalculator.percentage(100, 15)).toBe(15);
      expect(SafeFinancialCalculator.percentage(33.33, 10)).toBe(3.33);
    });

    it('should sum array of numbers safely', () => {
      expect(SafeFinancialCalculator.safeSum([0.1, 0.2, 0.3])).toBe(0.6);
    });
  });

  describe('splits and installments', () => {
    it('should validate splits within 1 cent margin', () => {
      const splits = [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.34 }];
      expect(SafeFinancialCalculator.validateSplits(100, splits)).toBe(true);
      
      const invalidSplits = [{ amount: 40 }, { amount: 70 }];
      expect(SafeFinancialCalculator.validateSplits(100, invalidSplits)).toBe(false);
    });

    it('should distribute splits and adjust the last one for precision', () => {
      const total = 100;
      const splitDefinitions = [
        { percentage: 33.33 },
        { percentage: 33.33 },
        { percentage: 33.34 }
      ];
      
      const result = SafeFinancialCalculator.distributeSplits(total, splitDefinitions);
      
      const sum = SafeFinancialCalculator.safeSum(result.map(r => r.amount));
      expect(sum).toBe(100);
      expect(result[0].amount).toBe(33.33);
      expect(result[1].amount).toBe(33.33);
      expect(result[2].amount).toBe(33.34);
    });

    it('should calculate installment amount rounding to 2 decimals', () => {
      expect(SafeFinancialCalculator.calculateInstallment(100, 3)).toBe(33.33);
      expect(SafeFinancialCalculator.calculateInstallment(100, 2)).toBe(50);
    });
  });
});
