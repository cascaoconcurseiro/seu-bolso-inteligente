import { TransactionSplitData } from "@/types/transactions";
import { moneyUtils } from "./money";
import { Decimal } from "decimal.js";

function toPct(amount: number, total: number): number {
  if (total === 0) return 0;
  return new Decimal(amount).dividedBy(total).times(100).toDecimalPlaces(1).toNumber();
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
    return currentSplits.map((s, idx) => {
      const amount = splitAmounts[idx + offset];
      return { ...s, percentage: toPct(amount, activeAmount), amount };
    });
  },

  applyPreset: (
    splits: TransactionSplitData[],
    activeAmount: number,
    myPct: number
  ): TransactionSplitData[] => {
    if (splits.length === 0) return [];
    const otherPct = new Decimal(100).minus(myPct);
    const totalOtherAmount = new Decimal(activeAmount)
      .times(otherPct)
      .dividedBy(100)
      .toDecimalPlaces(2)
      .toNumber();
    const otherAmounts = moneyUtils.splitSafely(totalOtherAmount, splits.length);
    const perSplitPct = otherPct.dividedBy(splits.length).toDecimalPlaces(1).toNumber();
    return splits.map((s, idx) => ({ ...s, percentage: perSplitPct, amount: otherAmounts[idx] }));
  },
};
