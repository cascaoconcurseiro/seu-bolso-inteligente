import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from './useFamily';

export interface InvoiceItem {
  id: string;
  originalTxId: string;
  splitId?: string;
  description: string;
  date: string;
  category?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  isPaid: boolean;
  tripId?: string;
  memberId: string;
  memberName?: string;
  currency: string;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  creatorUserId?: string;
}

interface UseSharedFinancesProps {
  currentDate?: Date;
  activeTab: 'REGULAR' | 'TRAVEL' | 'HISTORY';
}

export const useSharedFinances = ({ currentDate = new Date(), activeTab }: UseSharedFinancesProps) => {
  const { user } = useAuth();
  const { data: members = [] } = useFamilyMembers();

  // Fetch shared transactions with their splits
  const { data: transactionsWithSplits = [], isLoading, refetch } = useQuery({
    queryKey: ['shared-transactions-with-splits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Specify the FK relationship explicitly to avoid ambiguity
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_splits!transaction_splits_transaction_id_fkey (
            id,
            member_id,
            user_id,
            name,
            amount,
            percentage,
            is_settled,
            settled_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_shared', true)
        .is('source_transaction_id', null)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch mirror transactions (where I owe others)
  const { data: mirrorTransactions = [] } = useQuery({
    queryKey: ['mirror-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          source_transaction:source_transaction_id (
            user_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_shared', true)
        .not('source_transaction_id', 'is', null)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const invoices = useMemo(() => {
    const invoiceMap: Record<string, InvoiceItem[]> = {};
    
    // Initialize map for each member
    members.forEach(m => {
      invoiceMap[m.id] = [];
    });

    // CASE 1: I PAID - Process transaction splits (CREDITS)
    transactionsWithSplits.forEach(tx => {
      if (tx.type !== 'EXPENSE') return;
      
      const splits = tx.transaction_splits || [];
      const txCurrency = 'BRL';

      // For each split, create a CREDIT item (someone owes me)
      splits.forEach((split: any) => {
        const memberId = split.member_id;
        if (!memberId) return;
        
        // Find member info
        const member = members.find(m => m.id === memberId);
        
        if (!invoiceMap[memberId]) {
          invoiceMap[memberId] = [];
        }
        
        invoiceMap[memberId].push({
          id: `${tx.id}-credit-${memberId}`,
          originalTxId: tx.id,
          splitId: split.id,
          description: tx.description,
          date: tx.date,
          amount: split.amount,
          type: 'CREDIT',
          isPaid: split.is_settled || false,
          tripId: tx.trip_id || undefined,
          memberId: memberId,
          memberName: member?.name || split.name,
          currency: txCurrency,
          installmentNumber: tx.current_installment,
          totalInstallments: tx.total_installments,
          creatorUserId: tx.user_id
        });
      });
    });

    // CASE 2: SOMEONE ELSE PAID - Process mirror transactions (DEBITS)
    mirrorTransactions.forEach((tx: any) => {
      if (tx.type !== 'EXPENSE') return;
      
      const txCurrency = 'BRL';
      
      // Get payer user_id from source transaction
      const payerUserId = tx.source_transaction?.user_id;
      
      if (!payerUserId) {
        console.warn('Payer user_id not found for mirror transaction:', tx.id);
        return;
      }
      
      // Find the member who paid (by user_id or linked_user_id match)
      const payerMember = members.find(m => 
        m.user_id === payerUserId || m.linked_user_id === payerUserId
      );
      
      if (!payerMember) {
        console.warn('Payer member not found for user_id:', payerUserId);
        return;
      }
      
      const targetMemberId = payerMember.id;
      
      if (!invoiceMap[targetMemberId]) {
        invoiceMap[targetMemberId] = [];
      }
      
      invoiceMap[targetMemberId].push({
        id: `${tx.id}-debit-${targetMemberId}`,
        originalTxId: tx.source_transaction_id || tx.id,
        description: tx.description,
        date: tx.date,
        amount: tx.amount,
        type: 'DEBIT',
        isPaid: tx.is_settled || false,
        tripId: tx.trip_id || undefined,
        memberId: targetMemberId,
        memberName: payerMember?.name,
        currency: txCurrency,
        installmentNumber: tx.current_installment,
        totalInstallments: tx.total_installments,
        creatorUserId: payerUserId
      });
    });

    return invoiceMap;
  }, [transactionsWithSplits, mirrorTransactions, members]);

  const getFilteredInvoice = (memberId: string): InvoiceItem[] => {
    const allItems = invoices[memberId] || [];

    if (activeTab === 'TRAVEL') {
      return allItems
        .filter(i => !!i.tripId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeTab === 'HISTORY') {
      return allItems
        .filter(i => i.isPaid)
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // REGULAR: Show unpaid items not related to trips
      return allItems
        .filter(i => {
          if (i.tripId) return false;
          if (i.isPaid) return false;
          
          // For installments, check if it's current month
          const isInstallment = (i.totalInstallments || 0) > 1;
          if (isInstallment) {
            const itemDate = new Date(i.date);
            return itemDate.getMonth() === currentDate.getMonth() && 
                   itemDate.getFullYear() === currentDate.getFullYear();
          }
          
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    }
  };

  const getTotals = (items: InvoiceItem[]) => {
    const totalsByCurrency: Record<string, { credits: number; debits: number; net: number }> = {};

    items.forEach(i => {
      const curr = i.currency || 'BRL';
      if (!totalsByCurrency[curr]) {
        totalsByCurrency[curr] = { credits: 0, debits: 0, net: 0 };
      }

      if (!i.isPaid) {
        if (i.type === 'CREDIT') {
          totalsByCurrency[curr].credits += i.amount;
        } else {
          totalsByCurrency[curr].debits += i.amount;
        }
      }
    });

    Object.keys(totalsByCurrency).forEach(curr => {
      totalsByCurrency[curr].net = totalsByCurrency[curr].credits - totalsByCurrency[curr].debits;
    });

    return totalsByCurrency;
  };

  // Calculate global summary
  const getSummary = () => {
    let totalCredits = 0;
    let totalDebits = 0;
    
    Object.values(invoices).forEach(items => {
      items.forEach(item => {
        if (!item.isPaid) {
          if (item.type === 'CREDIT') {
            totalCredits += item.amount;
          } else {
            totalDebits += item.amount;
          }
        }
      });
    });
    
    return {
      totalCredits,
      totalDebits,
      net: totalCredits - totalDebits
    };
  };

  return { 
    invoices, 
    getFilteredInvoice, 
    getTotals, 
    getSummary,
    members, 
    transactions: transactionsWithSplits,
    isLoading,
    refetch
  };
};
