import { moneyUtils } from "@/utils/money";
import { Decimal } from "decimal.js";
import { logger } from '@/utils/logger';

/**
 * SafeFinancialCalculator
 * Provides safe financial calculations avoiding floating point errors using decimal.js
 */

export class SafeFinancialCalculator {
  private static readonly PRECISION = 2;
  private static readonly MULTIPLIER = Math.pow(10, SafeFinancialCalculator.PRECISION);

  /**
   * Helper safely converts any value to Decimal
   */
  private static toDecimal(val: any, defaultValue: number = 0): Decimal {
    if (val === null || val === undefined) return new Decimal(defaultValue);
    if (typeof val === 'number' && isNaN(val)) return new Decimal(defaultValue);
    if (typeof val === 'string') {
      const stripped = val.replace(/[^0-9.-]+/g, "");
      if (!stripped || isNaN(parseFloat(stripped))) return new Decimal(defaultValue);
      const parsed = moneyUtils.parse(val);
      if (isNaN(parsed)) return new Decimal(defaultValue);
      return new Decimal(parsed);
    }
    try {
      return new Decimal(val);
    } catch {
      return new Decimal(defaultValue);
    }
  }

  /**
   * Convert to safe integer representation (cents)
   */
  static toSafeNumber(value: number | string, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'number' && isNaN(value)) return defaultValue;
    if (typeof value === 'string') {
      const stripped = value.replace(/[^0-9.-]+/g, "");
      if (!stripped || isNaN(parseFloat(stripped))) return defaultValue;
    }
    
    // We try to convert to Decimal. If toDecimal falls back to 0 when it shouldn't, 
    // it means it was invalid, but we already caught the main invalid cases above.
    try {
      let num: number;
      if (typeof value === 'string') {
        num = moneyUtils.parse(value);
        if (isNaN(num)) return defaultValue;
      } else {
        num = Number(value);
      }
      return new Decimal(num)
        .times(SafeFinancialCalculator.MULTIPLIER)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
    } catch {
      return defaultValue;
    }
  }

  /**
   * Convert from safe integer back to decimal
   */
  static fromSafeNumber(value: number): number {
    return SafeFinancialCalculator.toDecimal(value)
      .dividedBy(SafeFinancialCalculator.MULTIPLIER)
      .toNumber();
  }

  /**
   * Safe addition
   */
  static add(a: number, b: number): number {
    const decA = SafeFinancialCalculator.toDecimal(a).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const decB = SafeFinancialCalculator.toDecimal(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return decA.plus(decB).toNumber();
  }

  /**
   * Safe subtraction
   */
  static subtract(a: number, b: number): number {
    const decA = SafeFinancialCalculator.toDecimal(a).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const decB = SafeFinancialCalculator.toDecimal(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return decA.minus(decB).toNumber();
  }

  /**
   * Safe multiplication
   */
  static multiply(amount: number, factor: number): number {
    const decAmount = SafeFinancialCalculator.toDecimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const decFactor = SafeFinancialCalculator.toDecimal(factor);
    return decAmount.times(decFactor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Safe division
   */
  static divide(amount: number, divisor: number): number {
    const decDivisor = SafeFinancialCalculator.toDecimal(divisor);
    if (decDivisor.isZero()) throw new Error('Division by zero');
    const decAmount = SafeFinancialCalculator.toDecimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return decAmount.dividedBy(decDivisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Safe sum of array
   */
  static safeSum(values: number[]): number {
    const sum = values.reduce((acc, val) => acc.plus(SafeFinancialCalculator.toDecimal(val)), new Decimal(0));
    return sum.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Calculate percentage
   */
  static percentage(value: number, percent: number): number {
    const decValue = SafeFinancialCalculator.toDecimal(value);
    const decPercent = SafeFinancialCalculator.toDecimal(percent).dividedBy(100);
    return decValue.times(decPercent).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Round to 2 decimal places
   */
  static round(value: number): number {
    return SafeFinancialCalculator.toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Format as currency
   */
  static formatCurrency(value: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  }

  /**
   * Validate split amounts don't exceed total
   */
  static validateSplits(total: number, splits: Array<{ amount: number }>): boolean {
    const splitSum = SafeFinancialCalculator.safeSum(splits.map(s => s.amount));
    const totalSafe = SafeFinancialCalculator.toSafeNumber(total);
    const splitSumSafe = SafeFinancialCalculator.toSafeNumber(splitSum);
    
    // Allow 1 cent margin for rounding
    return splitSumSafe <= totalSafe + 1;
  }

  /**
   * Calculate installment amount
   */
  static calculateInstallment(total: number, installments: number): number {
    if (installments <= 0) throw new Error('Invalid number of installments');
    return SafeFinancialCalculator.divide(total, installments);
  }

  /**
   * Distribute amount across splits maintaining total
   */
  static distributeSplits(
    total: number,
    splits: Array<{ percentage: number }>
  ): Array<{ percentage: number; amount: number }> {
    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01 && totalPercentage !== 0) {
      logger.warn('Split percentages do not sum to 100%');
    }

    const result = splits.map(split => ({
      percentage: split.percentage,
      amount: SafeFinancialCalculator.percentage(total, split.percentage),
    }));

    // Adjust last split to ensure exact total only if percentages sum to 100%
    const isCloseTo100 = Math.abs(totalPercentage - 100) < 0.01;
    const calculatedSum = SafeFinancialCalculator.safeSum(result.map(r => r.amount));
    const difference = SafeFinancialCalculator.subtract(total, calculatedSum);
    
    if (isCloseTo100 && Math.abs(difference) > 0.01 && result.length > 0) {
      result[result.length - 1].amount = SafeFinancialCalculator.add(
        result[result.length - 1].amount,
        difference
      );
    }

    return result;
  }

  /**
   * Calculate inflation-adjusted target amount
   * @param targetAmount The original target amount in today's money
   * @param monthsToTarget Number of months until the target date
   * @param annualInflationRate Annual inflation rate in percentage (e.g., 4.72 for 4.72%)
   */
  static calculateInflationAdjustedTarget(
    targetAmount: number,
    monthsToTarget: number,
    annualInflationRate: number
  ): number {
    if (monthsToTarget <= 0 || targetAmount <= 0) return targetAmount;
    
    // Using Decimal for inflation calculation to avoid floating point compounding errors
    const decTarget = SafeFinancialCalculator.toDecimal(targetAmount);
    
    // Convert annual rate (e.g., 4.72%) to decimal (0.0472)
    const annualRateDec = SafeFinancialCalculator.toDecimal(annualInflationRate).dividedBy(100);
    
    // Convert annual rate to monthly rate: (1 + annual)^(1/12) - 1
    // Decimal.js doesn't natively support fractional powers in all versions,
    // but Math.pow is acceptable here since rates are small and it's a compounding approximation.
    // However, if we want full precision:
    const base = annualRateDec.plus(1).toNumber();
    const monthlyRateDecimal = Math.pow(base, 1 / 12) - 1;
    
    const compoundFactor = Math.pow(1 + monthlyRateDecimal, monthsToTarget);
    
    return decTarget.times(compoundFactor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }
}
