import { moneyUtils } from "@/utils/money";
import { Decimal } from "decimal.js";
import { logger } from "@/utils/logger";

/**
 * SafeFinancialCalculator
 * Provides safe financial calculations avoiding floating point errors using decimal.js
 * All methods return Decimal for precision. Convert to number only at display time with .toNumber().
 */

export class SafeFinancialCalculator {
  static readonly PRECISION = 2;
  static readonly MULTIPLIER = new Decimal(Math.pow(10, SafeFinancialCalculator.PRECISION));
  /** Zero constante para comparações */
  static readonly ZERO = new Decimal(0);

  /**
   * Helper safely converts any value to Decimal
   */
  static toDecimal(val: any, defaultValue: Decimal = SafeFinancialCalculator.ZERO): Decimal {
    if (val === null || val === undefined) return defaultValue;
    if (val instanceof Decimal) return val;
    if (typeof val === "number" && isNaN(val)) return defaultValue;
    if (typeof val === "string") {
      const stripped = val.replace(/[^0-9.-]+/g, "");
      if (!stripped || isNaN(parseFloat(stripped))) return defaultValue;
      const parsed = moneyUtils.parse(val);
      if (isNaN(parsed)) return defaultValue;
      return new Decimal(parsed);
    }
    try {
      return new Decimal(val);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Convert to safe integer representation (cents)
   */
  static toSafeNumber(value: number | string, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === "number" && isNaN(value)) return defaultValue;
    if (typeof value === "string") {
      const stripped = value.replace(/[^0-9.-]+/g, "");
      if (!stripped || isNaN(parseFloat(stripped))) return defaultValue;
    }

    try {
      let num: number;
      if (typeof value === "string") {
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
   * Convert from safe integer back to decimal string
   */
  static fromSafeNumber(value: number): Decimal {
    return SafeFinancialCalculator.toDecimal(value).dividedBy(SafeFinancialCalculator.MULTIPLIER);
  }

  /**
   * Safe addition — returns Decimal
   */
  static add(a: number | Decimal, b: number | Decimal): Decimal {
    const decA = SafeFinancialCalculator.toDecimal(a).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const decB = SafeFinancialCalculator.toDecimal(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return decA.plus(decB);
  }

  /**
   * Safe subtraction — returns Decimal
   */
  static subtract(a: number | Decimal, b: number | Decimal): Decimal {
    const decA = SafeFinancialCalculator.toDecimal(a).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const decB = SafeFinancialCalculator.toDecimal(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return decA.minus(decB);
  }

  /**
   * Safe multiplication — returns Decimal
   */
  static multiply(amount: number | Decimal, factor: number | Decimal): Decimal {
    const decAmount = SafeFinancialCalculator.toDecimal(amount).toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_UP
    );
    const decFactor = SafeFinancialCalculator.toDecimal(factor);
    return decAmount.times(decFactor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Safe division — returns Decimal
   */
  static divide(amount: number | Decimal, divisor: number | Decimal): Decimal {
    const decDivisor = SafeFinancialCalculator.toDecimal(divisor);
    if (decDivisor.isZero()) throw new Error("Division by zero");
    const decAmount = SafeFinancialCalculator.toDecimal(amount).toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_UP
    );
    return decAmount.dividedBy(decDivisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Safe sum of array — returns Decimal
   */
  static safeSum(values: (number | Decimal)[]): Decimal {
    const sum = values.reduce(
      (acc, val) => acc.plus(SafeFinancialCalculator.toDecimal(val)),
      new Decimal(0)
    );
    return sum.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Calculate percentage — returns Decimal
   */
  static percentage(value: number | Decimal, percent: number | Decimal): Decimal {
    const decValue = SafeFinancialCalculator.toDecimal(value);
    const decPercent = SafeFinancialCalculator.toDecimal(percent).dividedBy(100);
    return decValue.times(decPercent).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Round to 2 decimal places — returns Decimal
   */
  static round(value: number | Decimal): Decimal {
    return SafeFinancialCalculator.toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Format as currency
   */
  static formatCurrency(value: number | Decimal, currency: string = "BRL"): string {
    const num = value instanceof Decimal ? value.toNumber() : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(num);
  }

  /**
   * Validate split amounts don't exceed total.
   * A soma pode ser menor que o total (o sistema auto-completa com a parte do
   * criador), mas não pode exceder o total além de 1 centavo de arredondamento —
   * mesma semântica da validação de splits do validationService.
   */
  static validateSplits(
    total: number | Decimal,
    splits: Array<{ amount: number | Decimal }>
  ): boolean {
    const splitSum = SafeFinancialCalculator.safeSum(splits.map((s) => s.amount));
    const totalSafe = SafeFinancialCalculator.toSafeNumber(
      total instanceof Decimal ? total.toNumber() : total
    );
    const splitSumSafe = SafeFinancialCalculator.toSafeNumber(splitSum.toNumber());

    return splitSumSafe <= totalSafe + 1;
  }

  /**
   * Calculate installment amount — returns Decimal
   */
  static calculateInstallment(total: number | Decimal, installments: number): Decimal {
    if (installments <= 0) throw new Error("Invalid number of installments");
    return SafeFinancialCalculator.divide(total, installments);
  }

  /**
   * Distribute amount across splits maintaining total
   */
  static distributeSplits(
    total: number | Decimal,
    splits: Array<{ percentage: number }>
  ): Array<{ percentage: number; amount: Decimal }> {
    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);

    if (Math.abs(totalPercentage - 100) > 0.01 && totalPercentage !== 0) {
      logger.warn("Split percentages do not sum to 100%");
    }

    const result = splits.map((split) => ({
      percentage: split.percentage,
      amount: SafeFinancialCalculator.percentage(total, split.percentage),
    }));

    // Adjust last split to ensure exact total only if percentages sum to 100%
    const isCloseTo100 = Math.abs(totalPercentage - 100) < 0.01;
    const calculatedSum = SafeFinancialCalculator.safeSum(result.map((r) => r.amount));
    const difference = SafeFinancialCalculator.subtract(total, calculatedSum);

    if (isCloseTo100 && !difference.isZero() && result.length > 0) {
      result[result.length - 1].amount = SafeFinancialCalculator.add(
        result[result.length - 1].amount,
        difference
      );
    }

    return result;
  }

  /**
   * Calculate inflation-adjusted target amount — returns Decimal
   * @param targetAmount The original target amount in today's money
   * @param monthsToTarget Number of months until the target date
   * @param annualInflationRate Annual inflation rate in percentage (e.g., 4.72 for 4.72%)
   */
  static calculateInflationAdjustedTarget(
    targetAmount: number | Decimal,
    monthsToTarget: number,
    annualInflationRate: number
  ): Decimal {
    if (monthsToTarget <= 0) return SafeFinancialCalculator.toDecimal(targetAmount);

    const decTarget = SafeFinancialCalculator.toDecimal(targetAmount);
    if (decTarget.isZero() || decTarget.isNegative()) return decTarget;

    // Convert annual rate (e.g., 4.72%) to decimal (0.0472)
    const annualRateDec = SafeFinancialCalculator.toDecimal(annualInflationRate).dividedBy(100);

    const base = annualRateDec.plus(1).toNumber();
    const monthlyRateDecimal = Math.pow(base, 1 / 12) - 1;

    const compoundFactor = Math.pow(1 + monthlyRateDecimal, monthsToTarget);

    return decTarget.times(compoundFactor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}
