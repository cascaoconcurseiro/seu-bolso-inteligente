/**
 * SafeFinancialCalculator
 * Provides safe financial calculations avoiding floating point errors
 */

export class SafeFinancialCalculator {
  private static readonly PRECISION = 2;
  private static readonly MULTIPLIER = Math.pow(10, SafeFinancialCalculator.PRECISION);

  /**
   * Convert to safe integer representation (cents)
   */
  static toSafeNumber(value: number | string, defaultValue: number = 0): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return defaultValue;
    return Math.round(num * SafeFinancialCalculator.MULTIPLIER);
  }

  /**
   * Convert from safe integer back to decimal
   */
  static fromSafeNumber(value: number): number {
    return value / SafeFinancialCalculator.MULTIPLIER;
  }

  /**
   * Safe addition
   */
  static add(a: number, b: number): number {
    const safeA = SafeFinancialCalculator.toSafeNumber(a);
    const safeB = SafeFinancialCalculator.toSafeNumber(b);
    return SafeFinancialCalculator.fromSafeNumber(safeA + safeB);
  }

  /**
   * Safe subtraction
   */
  static subtract(a: number, b: number): number {
    const safeA = SafeFinancialCalculator.toSafeNumber(a);
    const safeB = SafeFinancialCalculator.toSafeNumber(b);
    return SafeFinancialCalculator.fromSafeNumber(safeA - safeB);
  }

  /**
   * Safe multiplication
   */
  static multiply(a: number, b: number): number {
    const safeA = SafeFinancialCalculator.toSafeNumber(a);
    const safeB = SafeFinancialCalculator.toSafeNumber(b);
    return SafeFinancialCalculator.fromSafeNumber(
      Math.round((safeA * safeB) / SafeFinancialCalculator.MULTIPLIER)
    );
  }

  /**
   * Safe division
   */
  static divide(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    const safeA = SafeFinancialCalculator.toSafeNumber(a);
    const safeB = SafeFinancialCalculator.toSafeNumber(b);
    return SafeFinancialCalculator.fromSafeNumber(
      Math.round((safeA * SafeFinancialCalculator.MULTIPLIER) / safeB)
    );
  }

  /**
   * Safe sum of array
   */
  static safeSum(values: number[]): number {
    const safeValues = values.map(v => SafeFinancialCalculator.toSafeNumber(v));
    const sum = safeValues.reduce((acc, val) => acc + val, 0);
    return SafeFinancialCalculator.fromSafeNumber(sum);
  }

  /**
   * Calculate percentage
   */
  static percentage(value: number, percent: number): number {
    return SafeFinancialCalculator.multiply(value, percent / 100);
  }

  /**
   * Round to 2 decimal places
   */
  static round(value: number): number {
    return Math.round(value * 100) / 100;
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
    return SafeFinancialCalculator.round(total / installments);
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
      console.warn('Split percentages do not sum to 100%');
    }

    const result = splits.map(split => ({
      percentage: split.percentage,
      amount: SafeFinancialCalculator.percentage(total, split.percentage),
    }));

    // Adjust last split to ensure exact total
    const calculatedSum = SafeFinancialCalculator.safeSum(result.map(r => r.amount));
    const difference = SafeFinancialCalculator.subtract(total, calculatedSum);
    
    if (Math.abs(difference) > 0.01 && result.length > 0) {
      result[result.length - 1].amount = SafeFinancialCalculator.add(
        result[result.length - 1].amount,
        difference
      );
    }

    return result;
  }
}
