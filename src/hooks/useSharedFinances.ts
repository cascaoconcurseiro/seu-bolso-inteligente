import { useMemo } from 'react';
import { useFamilyMembers } from './useFamily';
import { useTransactions } from './useTransactions';

export interface InvoiceItem {
  id: string;
  originalTxId: string;
  description: string;
  date: string;
  category?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  isPaid: boolean;
  tripId?: string;
  memberId: string;
  currency: string;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  creatorUserId?: string;
}

interface UseSharedFinancesProps {
  currentDate: Date;
  activeTab: 'REGULAR' | 'TRAVEL' | 'HISTORY';
}

export const useSharedFinances = ({ currentDate, activeTab }: UseSharedFinancesProps) => {
  const { data: transactions = [] } = useTransactions({ domain: 'SHARED' });
  const { data: members = [] } = useFamilyMembers();

  const invoices = useMemo(() => {
    const invoiceMap: Record<string, InvoiceItem[]> = {};
    members.forEach(m => invoiceMap[m.id] = []);

    transactions.forEach(t => {
      const isSharedExpense = t.type === 'EXPENSE' && (t.is_shared || t.payer_id);
      if (!isSharedExpense) return;

      const txCurrency = 'BRL';

      // CREDIT LOGIC: User Paid, Others Owe (via transaction_splits)
      if (!t.payer_id) {
        // We would need to fetch splits here - for now skip
      }
      // DEBIT LOGIC: Other Paid, User Owes
      else if (t.payer_id) {
        const payerMember = members.find(m => m.user_id === t.payer_id);
        const targetMemberId = payerMember ? payerMember.id : t.payer_id;

        if (!invoiceMap[targetMemberId]) invoiceMap[targetMemberId] = [];

        invoiceMap[targetMemberId].push({
          id: `${t.id}-debit-${targetMemberId}`,
          originalTxId: t.id,
          description: t.description,
          date: t.date,
          category: t.category?.name,
          amount: t.amount,
          type: 'DEBIT',
          isPaid: false,
          tripId: t.trip_id || undefined,
          memberId: targetMemberId,
          currency: txCurrency,
          installmentNumber: t.current_installment,
          totalInstallments: t.total_installments,
          creatorUserId: t.user_id
        });
      }
    });

    return invoiceMap;
  }, [transactions, members]);

  const getFilteredInvoice = (memberId: string) => {
    const allItems = invoices[memberId] || [];

    if (activeTab === 'TRAVEL') {
      return allItems.filter(i => !!i.tripId).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } else if (activeTab === 'HISTORY') {
      return allItems.filter(i => i.isPaid).sort((a, b) => b.date.localeCompare(a.date));
    } else {
      return allItems.filter(i => !i.tripId && !i.isPaid).sort((a, b) => 
        b.date.localeCompare(a.date)
      );
    }
  };

  const getTotals = (items: InvoiceItem[]) => {
    const totalsByCurrency: Record<string, { credits: number, debits: number, net: number }> = {};

    items.forEach(i => {
      const curr = i.currency || 'BRL';
      if (!totalsByCurrency[curr]) totalsByCurrency[curr] = { credits: 0, debits: 0, net: 0 };

      if (!i.isPaid) {
        if (i.type === 'CREDIT') totalsByCurrency[curr].credits += i.amount;
        else totalsByCurrency[curr].debits += i.amount;
      }
    });

    Object.keys(totalsByCurrency).forEach(curr => {
      totalsByCurrency[curr].net = totalsByCurrency[curr].credits - totalsByCurrency[curr].debits;
    });

    return totalsByCurrency;
  };

  return { invoices, getFilteredInvoice, getTotals, members, transactions };
};
