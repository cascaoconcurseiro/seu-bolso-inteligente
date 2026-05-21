export interface TransactionSplitData {
  memberId: string;
  percentage: number;
  amount: number;
}

export type TabType = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'WITHDRAWAL' | 'DEPOSIT';
