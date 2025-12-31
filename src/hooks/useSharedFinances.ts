import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from './useFamily';

export interface InvoiceItem {
  id: string;
  originalTxId: string;
  splitId?: string;
  sourceTransactionId?: string; // ID da transação original (quando é DEBIT de mirror transaction)
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
  const queryClient = useQueryClient();

  // DEBUG: Log members
  console.log('🔍 [useSharedFinances] Members from useFamilyMembers:', {
    count: members.length,
    members: members.map(m => ({ id: m.id, name: m.name, linked_user_id: m.linked_user_id }))
  });

  // Função para invalidar todas as queries relacionadas
  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] }),
      queryClient.invalidateQueries({ queryKey: ['paid-by-others-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  // Fetch shared transactions with their splits
  const { data: transactionsWithSplits = [], isLoading, refetch } = useQuery({
    queryKey: ['shared-transactions-with-splits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Buscar transações compartilhadas CRIADAS POR MIM
      const { data: myTransactions, error: myTxError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_shared', true)
        .order('date', { ascending: false });
      
      if (myTxError) {
        console.error('❌ [Query Error - My Transactions]:', myTxError);
        throw myTxError;
      }
      
      // Buscar transações compartilhadas onde EU FUI INCLUÍDO em um split
      const { data: mySplits, error: mySplitsError } = await supabase
        .from('transaction_splits')
        .select('*, transaction:transactions!transaction_id(*)')
        .eq('user_id', user.id);
      
      if (mySplitsError) {
        console.error('❌ [Query Error - My Splits]:', mySplitsError);
        throw mySplitsError;
      }
      
      console.log('✅ [Query Result - My Splits]:', {
        count: mySplits?.length || 0,
        splits: mySplits
      });
      
      // Extrair transações dos splits (transações criadas por outros)
      const othersTransactions = (mySplits || [])
        .map((split: any) => split.transaction)
        .filter((tx: any) => tx && tx.user_id !== user.id); // Apenas transações de outros
      
      // Combinar minhas transações + transações de outros
      const allTransactions = [...(myTransactions || []), ...othersTransactions];
      
      // Remover duplicatas
      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(tx => [tx.id, tx])).values()
      );
      
      if (uniqueTransactions.length === 0) {
        console.log('ℹ️ [Query Result] Nenhuma transação compartilhada encontrada');
        return [];
      }
      
      // Buscar splits para todas as transações
      const transactionIds = uniqueTransactions.map(t => t.id);
      console.log('🔍 [Query] Buscando splits para transactionIds:', transactionIds);
      
      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select('*')
        .in('transaction_id', transactionIds);
      
      if (splitsError) {
        console.error('❌ [Query Error - Splits]:', splitsError);
        throw splitsError;
      }
      
      console.log('✅ [Query Result - Splits]:', {
        count: splits?.length || 0,
        splits: splits
      });
      
      // Combinar transações com seus splits
      const transactionsWithSplitsData = uniqueTransactions.map(tx => ({
        ...tx,
        transaction_splits: splits?.filter(s => s.transaction_id === tx.id) || []
      }));
      
      console.log('✅ [Query Result] Transações com splits:', {
        count: transactionsWithSplitsData.length,
        transactions: transactionsWithSplitsData.map(t => ({
          id: t.id,
          description: t.description,
          user_id: t.user_id,
          splits: t.transaction_splits?.length || 0,
          splitsData: t.transaction_splits
        }))
      });
      
      return transactionsWithSplitsData;
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
    const processedTxIds = new Set<string>();
    
    console.log('🔍 [useMemo] Iniciando processamento:', {
      membersCount: members.length,
      membersData: members.map(m => ({ id: m.id, name: m.name })),
      transactionsCount: transactionsWithSplits.length,
      transactionsData: transactionsWithSplits.map(t => ({
        id: t.id,
        description: t.description,
        splits: t.transaction_splits?.length || 0
      }))
    });
    
    // Initialize map for each member
    members.forEach(m => {
      invoiceMap[m.id] = [];
      console.log('✅ [useMemo] Inicializando invoiceMap para membro:', m.id, m.name);
    });

    // DEBUG: Log dados recebidos
    console.log('🔍 [useSharedFinances] DEBUG:', {
      transactionsWithSplits: transactionsWithSplits.length,
      paidByOthersTransactions: paidByOthersTransactions.length,
      members: members.length,
      activeTab,
      currentDate
    });

    // LÓGICA CORRETA (SEM ESPELHAMENTO):
    
    // CASO 1: EU PAGUEI - Créditos (me devem)
    // Transações que EU criei e dividi com outros
    transactionsWithSplits.forEach(tx => {
      if (tx.type !== 'EXPENSE') return;
      
      const splits = tx.transaction_splits || [];
      const txCurrency = 'BRL';

      console.log('🔍 [CASO 1] Processando tx:', {
        id: tx.id,
        description: tx.description,
        user_id: tx.user_id,
        current_user_id: user?.id,
        is_my_transaction: tx.user_id === user?.id,
        splits: splits.length,
        splitsData: splits,
        date: tx.date,
        competence_date: tx.competence_date
      });

      // Se EU criei a transação, os splits são CRÉDITOS (me devem)
      if (tx.user_id === user?.id) {
        splits.forEach((split: any) => {
          console.log('🔍 [CASO 1A - EU PAGUEI] Processando split:', split);
          
          const memberId = split.member_id;
          if (!memberId) {
            console.warn('⚠️ [CASO 1A] Split sem member_id!', split);
            return;
          }
          
          const uniqueKey = `${tx.id}-credit-${memberId}`;
          if (processedTxIds.has(uniqueKey)) {
            console.warn('⚠️ [CASO 1A] Item já processado:', uniqueKey);
            return;
          }
          processedTxIds.add(uniqueKey);
          
          const member = members.find(m => m.id === memberId);
          
          if (!invoiceMap[memberId]) {
            console.warn('⚠️ [CASO 1A] Member não encontrado no invoiceMap:', memberId);
            invoiceMap[memberId] = [];
          }
          
          invoiceMap[memberId].push({
            id: uniqueKey,
            originalTxId: tx.id,
            splitId: split.id,
            description: tx.description,
            date: tx.competence_date || tx.date,
            amount: split.amount,
            type: 'CREDIT',
            isPaid: split.is_settled === true,
            tripId: tx.trip_id || undefined,
            memberId: memberId,
            memberName: member?.name || split.name,
            currency: txCurrency,
            installmentNumber: tx.current_installment,
            totalInstallments: tx.total_installments,
            creatorUserId: tx.user_id
          });

          console.log('✅ [CASO 1A] CRÉDITO criado:', {
            memberId,
            memberName: member?.name,
            amount: split.amount,
            date: tx.competence_date || tx.date
          });
        });
      } else {
        // CASO 1B: OUTRO PAGOU e me incluiu em um split - DÉBITO (eu devo)
        // Encontrar o split onde EU sou o devedor
        const mySplit = splits.find((s: any) => s.user_id === user?.id);
        
        if (mySplit) {
          console.log('🔍 [CASO 1B - OUTRO PAGOU] Encontrei meu split:', mySplit);
          
          // Encontrar o membro que representa o criador da transação
          const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
          
          if (creatorMember) {
            const uniqueKey = `${tx.id}-debit-${creatorMember.id}`;
            if (!processedTxIds.has(uniqueKey)) {
              processedTxIds.add(uniqueKey);
              
              if (!invoiceMap[creatorMember.id]) {
                invoiceMap[creatorMember.id] = [];
              }
              
              invoiceMap[creatorMember.id].push({
                id: uniqueKey,
                originalTxId: tx.id,
                splitId: mySplit.id,
                description: tx.description,
                date: tx.competence_date || tx.date,
                amount: mySplit.amount,
                type: 'DEBIT',
                isPaid: mySplit.is_settled === true,
                tripId: tx.trip_id || undefined,
                memberId: creatorMember.id,
                memberName: creatorMember.name,
                currency: txCurrency,
                installmentNumber: tx.current_installment,
                totalInstallments: tx.total_installments,
                creatorUserId: tx.user_id
              });

              console.log('✅ [CASO 1B] DÉBITO criado:', {
                memberId: creatorMember.id,
                memberName: creatorMember.name,
                amount: mySplit.amount,
                date: tx.competence_date || tx.date
              });
            }
          } else {
            console.warn('⚠️ [CASO 1B] Criador da transação não encontrado nos membros:', tx.user_id);
          }
        }
      }
    });

    // CASO 2: OUTRO PAGOU - Débitos (eu devo)
    // Transações onde payer_id indica que outro membro pagou por mim
    paidByOthersTransactions.forEach((tx: any) => {
      if (tx.type !== 'EXPENSE') return;
      
      const txCurrency = 'BRL';
      const payer = tx.payer;
      
      if (!payer) return;
      
      const targetMemberId = payer.id;
      
      const uniqueKey = `${tx.id}-debit-${targetMemberId}`;
      if (processedTxIds.has(uniqueKey)) return;
      processedTxIds.add(uniqueKey);
      
      if (!invoiceMap[targetMemberId]) {
        invoiceMap[targetMemberId] = [];
      }
      
      invoiceMap[targetMemberId].push({
        id: uniqueKey,
        originalTxId: tx.id,
        description: tx.description,
        date: tx.competence_date || tx.date,
        amount: tx.amount,
        type: 'DEBIT',
        isPaid: tx.is_settled === true,
        tripId: tx.trip_id || undefined,
        memberId: targetMemberId,
        memberName: payer.name,
        currency: txCurrency,
        installmentNumber: tx.current_installment,
        totalInstallments: tx.total_installments,
        creatorUserId: tx.user_id
      });
    });

    console.log('📊 [useSharedFinances] Invoice Map Final:', {
      totalMembers: Object.keys(invoiceMap).length,
      itemsPerMember: Object.entries(invoiceMap).map(([id, items]) => ({
        memberId: id,
        memberName: members.find(m => m.id === id)?.name,
        itemCount: items.length
      }))
    });

    return invoiceMap;
  }, [transactionsWithSplits, paidByOthersTransactions, members]);

  const getFilteredInvoice = (memberId: string): InvoiceItem[] => {
    const allItems = invoices[memberId] || [];
    
    console.log('🔍 [getFilteredInvoice] Filtrando para membro:', {
      memberId,
      memberName: members.find(m => m.id === memberId)?.name,
      allItemsCount: allItems.length,
      activeTab,
      currentDate: currentDate.toISOString()
    });
    
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
      // TRAVEL: Mostrar TODOS os itens de viagens (pagos e não pagos)
      return scopeFilteredItems
        .filter(i => !!i.tripId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeTab === 'HISTORY') {
      // HISTORY: Mostrar apenas itens pagos
      return scopeFilteredItems
        .filter(i => i.isPaid)
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // REGULAR: Mostrar TODOS os itens não relacionados a viagens (pagos e não pagos), filtrados pelo mês atual
      const filtered = scopeFilteredItems
        .filter(i => {
          if (i.tripId) return false;
          
          // Filter ALL transactions by current month (not just installments)
          const itemDate = new Date(i.date);
          const matches = itemDate.getMonth() === currentDate.getMonth() && 
                 itemDate.getFullYear() === currentDate.getFullYear();
          
          console.log('🔍 [REGULAR Filter] Item:', {
            description: i.description,
            date: i.date,
            itemMonth: itemDate.getMonth(),
            itemYear: itemDate.getFullYear(),
            currentMonth: currentDate.getMonth(),
            currentYear: currentDate.getFullYear(),
            matches
          });
          
          return matches;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      
      console.log('✅ [getFilteredInvoice] Resultado REGULAR:', {
        filteredCount: filtered.length
      });
      
      return filtered;
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
    refetch: refetchAll // Usar refetchAll para invalidar todas as queries
  };
};


// Hook para confirmar ressarcimento de um split
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSettleSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      const { data, error } = await supabase
        .from('transaction_splits')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
        })
        .eq('id', splitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Ressarcimento confirmado!');
    },
    onError: (error) => {
      toast.error('Erro ao confirmar ressarcimento: ' + error.message);
    },
  });
}

// Hook para confirmar ressarcimento de múltiplos splits
export function useSettleMultipleSplits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitIds: string[]) => {
      const { data, error } = await supabase
        .from('transaction_splits')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
        })
        .in('id', splitIds)
        .select();

      if (error) throw error;
      return { settledCount: data?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${data.settledCount} ressarcimento(s) confirmado(s)!`);
    },
    onError: (error) => {
      toast.error('Erro ao confirmar ressarcimentos: ' + error.message);
    },
  });
}

// Hook para desfazer ressarcimento
export function useUnsettleSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      const { data, error } = await supabase
        .from('transaction_splits')
        .update({
          is_settled: false,
          settled_at: null,
        })
        .eq('id', splitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Ressarcimento desfeito!');
    },
    onError: (error) => {
      toast.error('Erro ao desfazer ressarcimento: ' + error.message);
    },
  });
}
