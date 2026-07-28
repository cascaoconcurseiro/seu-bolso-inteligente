/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { moneyUtils } from "@/utils/money";
import type { Transaction } from "@/hooks/transactions/types";

interface UseTransactionDuplicatesProps {
  allTransactions: any[];
  amount: string;
  description: string;
  date: Date;
  activeTab: string;
  accountId: string;
  initialData?: Partial<Transaction>;
}

export function useTransactionDuplicates({
  allTransactions,
  amount,
  description,
  date,
  activeTab,
  accountId,
  initialData,
}: UseTransactionDuplicatesProps) {
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    if (!allTransactions || allTransactions.length === 0) {
      setDuplicateWarning(false);
      return;
    }
    const handler = setTimeout(() => {
      const numericAmount = moneyUtils.parse(amount) || 0;
      if (!description || numericAmount === 0 || !date) {
        setDuplicateWarning(false);
        return;
      }
      const hasDuplicate = allTransactions.some((tx) => {
        if (tx.is_optimistic || tx.id.startsWith("temp-")) return false;
        if (initialData && tx.id === initialData.id) return false;
        if (initialData && initialData.series_id && tx.series_id === initialData.series_id)
          return false;
        if (tx.type !== activeTab) return false;
        if (accountId && tx.account_id !== accountId) return false;

        const amountMatch = Math.abs(tx.amount - numericAmount) < 0.01;

        const desc1 = tx.description.toLowerCase().trim();
        const desc2 = description.toLowerCase().trim();
        const descMatch = desc1 === desc2;

        if (!tx.created_at) return false;
        const msSinceCreation = new Date().getTime() - new Date(tx.created_at).getTime();
        const withinWindow = msSinceCreation >= 0 && msSinceCreation <= 30 * 60 * 1000;

        const txDateStr = tx.date;
        const formDateStr = format(date, "yyyy-MM-dd");
        const dateMatch = txDateStr?.slice(0, 10) === formDateStr?.slice(0, 10);

        return amountMatch && descMatch && withinWindow && dateMatch;
      });
      setDuplicateWarning(hasDuplicate);
    }, 500);
    return () => clearTimeout(handler);
  }, [amount, description, date, activeTab, allTransactions, initialData, accountId]);

  return duplicateWarning;
}
