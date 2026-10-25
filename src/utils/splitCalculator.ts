import { TransactionSplitData } from "@/types/transactions";
import { moneyUtils } from "./money";
import { Decimal } from "decimal.js";

function allocatePercentages(
  amounts: number[],
  totalAmount: number,
  targetPercentage: Decimal
): number[] {
  if (amounts.length === 0) return [];

  if (totalAmount === 0) {
    const each = targetPercentage.dividedBy(amounts.length).toDecimalPlaces(6, Decimal.ROUND_FLOOR);
    return amounts.map((_, index) =>
      index === amounts.length - 1
        ? targetPercentage.minus(each.times(amounts.length - 1)).toNumber()
        : each.toNumber()
    );
  }

  const percentages = amounts
    .slice(0, -1)
    .map((amount) =>
      new Decimal(amount).dividedBy(totalAmount).times(100).toDecimalPlaces(6, Decimal.ROUND_FLOOR)
    );
  const allocated = percentages.reduce((sum, percentage) => sum.plus(percentage), new Decimal(0));
  const remainder = targetPercentage.minus(allocated);

  return [...percentages.map((percentage) => percentage.toNumber()), remainder.toNumber()];
}

export const splitCalculator = {
  redistributeSplits: (
    currentSplits: TransactionSplitData[],
    activeAmount: number,
    currentUserIncluded: boolean
  ): TransactionSplitData[] => {
    if (currentSplits.length === 0) return [];
    const totalPeople = currentUserIncluded ? currentSplits.length + 1 : currentSplits.length;
    const splitAmounts = moneyUtils.splitSafely(activeAmount, totalPeople);
    const offset = currentUserIncluded ? 1 : 0;
    const amounts = currentSplits.map((_, idx) => splitAmounts[idx + offset]);
    const myPercentage = currentUserIncluded
      ? activeAmount === 0
        ? new Decimal(100).dividedBy(totalPeople)
        : new Decimal(splitAmounts[0]).dividedBy(activeAmount).times(100)
      : new Decimal(0);
    const targetPercentage = new Decimal(100).minus(myPercentage);
    const percentages = allocatePercentages(amounts, activeAmount, targetPercentage);

    return currentSplits.map((s, idx) => {
      const amount = amounts[idx];
      return { ...s, percentage: percentages[idx], amount };
    });
  },

  applyPreset: (
    splits: TransactionSplitData[],
    activeAmount: number,
    myPct: number
  ): TransactionSplitData[] => {
    if (splits.length === 0) return [];
    const otherPct = new Decimal(100).minus(myPct);
    if (otherPct.lte(0)) return [];
    const totalOtherAmount = new Decimal(activeAmount)
      .times(otherPct)
      .dividedBy(100)
      .toDecimalPlaces(2)
      .toNumber();
    const otherAmounts = moneyUtils.splitSafely(totalOtherAmount, splits.length);
    const percentages = allocatePercentages(otherAmounts, activeAmount, otherPct);
    return splits.map((s, idx) => ({
      ...s,
      percentage: percentages[idx],
      amount: otherAmounts[idx],
    }));
  },
};
