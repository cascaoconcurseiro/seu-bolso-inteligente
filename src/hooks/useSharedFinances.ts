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
      
      // First get mirror transactions
      const { data: mirrors, error: mirrorsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_shared', true)
        .not('source_transaction_id', 'is', null)
        .order('date', { ascending: false });
      
      if (mirrorsError) throw mirrorsError;
      if (!mirrors || mirrors.length === 0) return [];
      
      // Get source transaction IDs
      const sourceIds = mirrors
        .map(m => m.source_transaction_id)
        .filter(Boolean);
      
      if (sourceIds.length === 0) return mirrors;
      
      // Fetch source transactions to get user_id
      const { data: sources, error: sourcesError } = await supabase
        .from('transactions')
        .select('id, user_id')
        .in('id', sourceIds);
      
      if (sourcesError) throw sourcesError;
      
      // Map source user_id to mirrors
      const sourcesMap = new Map(sources?.map(s => [s.id, s.user_id]) || []);
      
      return mirrors.map(mirror => ({
        ...mirror,
        source_transaction: {
          user_id: sourcesMap.get(mirror.source_transaction_id)
        }
      }));
    },
    enabled: !!user,
  });

  // Fetch transactions paid by others (payer_id != user_id) - these are debts I owe
  const { data: paidByOthersTransactions = [] } = useQuery({
    queryKey: ['paid-by-others-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get transactions where payer_id is set and different from user
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          payer:family_members!payer_id (
            id,
            name,
            user_id,
            linked_user_id
          )
        `)
        .eq('user_id', user.id)
        .not('payer_id', 'is', null)
        .is('source_transaction_id', null)
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

    // CASE 3: PAID BY OTHER (payer_id) - Transactions where another family member paid for me (DEBITS)
    paidByOthersTransactions.forEach((tx: any) => {
      if (tx.type !== 'EXPENSE') return;
      
      const txCurrency = 'BRL';
      const payer = tx.payer;
      
      if (!payer) {
        console.warn('Payer not found for transaction:', tx.id);
        return;
      }
      
      const targetMemberId = payer.id;
      
      if (!invoiceMap[targetMemberId]) {
        invoiceMap[targetMemberId] = [];
      }
      
      // Check if this transaction is already added (avoid duplicates with mirror transactions)
      const existingItem = invoiceMap[targetMemberId].find(
        item => item.originalTxId === tx.id && item.type === 'DEBIT'
      );
      
      if (!existingItem) {
        invoiceMap[targetMemberId].push({
          id: `${tx.id}-debit-paidby-${targetMemberId}`,
          originalTxId: tx.id,
          description: tx.description,
          date: tx.competence_date || tx.date, // Use competence_date for monthly filtering
          amount: tx.amount,
          type: 'DEBIT',
          isPaid: tx.is_settled || false,
          tripId: tx.trip_id || undefined,
          memberId: targetMemberId,
          memberName: payer.name,
          currency: txCurrency,
          installmentNumber: tx.current_installment,
          totalInstallments: tx.total_installments,
          creatorUserId: tx.user_id
        });
      }
    });

    return invoiceMap;
  }, [transactionsWithSplits, mirrorTransactions, paidByOthersTransactions, members]);

  const getFilteredInvoice = (memberId: string): InvoiceItem[] => {
    const allItems = invoices[memberId] || [];
    
    // Buscar configuração de escopo do membro
    const member = members.find(m => m.id === memberId);
    
    // Aplicar filtro de escopo
    let scopeFilteredItems = allItems;
    if (member && member.sharing_scope !== 'all') {
      scopeFilteredItems = allItems.filter(item => {
        switch (member.sharing_scope) {
          case 'trips_only':
            // Apenas transações de viagens
            return !!item.tripId;
          
          case 'date_range':
            // Apenas transações no período
            if (!member.scope_start_date && !member.scope_end_date) return true;
            const itemDate = new Date(item.date);
            const startDate = member.scope_start_date ? new Date(member.scope_start_date) : null;
            const endDate = member.scope_end_date ? new Date(member.scope_end_date) : null;
            
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            return true;
          
          case 'specific_trip':
            // Apenas transações de uma viagem específica
            return item.tripId === member.scope_trip_id;
          
          default:
            return true;
        }
      });
    }

    if (activeTab === 'TRAVEL') {
      return scopeFilteredItems
        .filter(i => !!i.tripId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeTab === 'HISTORY') {
      return scopeFilteredItems
        .filter(i => i.isPaid)
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // REGULAR: Show unpaid items not related to trips, filtered by current month
      return scopeFilteredItems
        .filter(i => {
          if (i.tripId) return false;
          if (i.isPaid) return false;
          
          // Filter ALL transactions by current month (not just installments)
          const itemDate = new Date(i.date);
          return itemDate.getMonth() === currentDate.getMonth() && 
                 itemDate.getFullYear() === currentDate.getFullYear();
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
