import { TransactionSplitData } from '@/types/transactions';
import { moneyUtils } from './money';

/**
 * Utilitários para dividir transações uniformemente entre membros
 */
export const splitCalculator = {
  /**
   * Recalcula a porcentagem e valores mantendo a mesma precisão do sistema (dinheiro).
   */
  redistributeSplits: (
    currentSplits: TransactionSplitData[],
    activeAmount: number,
    currentUserIncluded: boolean
  ): TransactionSplitData[] => {
    if (currentSplits.length === 0) return [];
    
    const totalPeople = currentUserIncluded ? currentSplits.length + 1 : currentSplits.length;
    const splitAmounts = moneyUtils.splitSafely(activeAmount, totalPeople);

    return currentSplits.map((s, idx) => {
      // Se current user included, a minha parte (index 0) não entra na array de splits dos outros
      const offset = currentUserIncluded ? 1 : 0;
      const amount = splitAmounts[idx + offset];
      return {
        ...s,
        percentage: Number(((amount / activeAmount) * 100).toFixed(1)),
        amount,
      };
    });
  },

  /**
   * Aplica um preset (ex: 50% / 50%)
   */
  applyPreset: (
    splits: TransactionSplitData[],
    activeAmount: number,
    myPct: number
  ): TransactionSplitData[] => {
    if (splits.length === 0) return [];
    const otherPct = 100 - myPct;
    const totalOtherAmount = (activeAmount * otherPct) / 100;
    const otherAmounts = moneyUtils.splitSafely(totalOtherAmount, splits.length);

    return splits.map((s, idx) => ({
      ...s,
      percentage: Number((otherPct / splits.length).toFixed(1)),
      amount: otherAmounts[idx],
    }));
  }
};
