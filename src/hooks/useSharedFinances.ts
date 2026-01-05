import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from './useFamily';
import { toast } from 'sonner';
import { SettlementValidator } from '@/services/settlementValidation';

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
  seriesId?: string | null; // ID da série de parcelas
  creatorUserId?: string;
  creatorName?: string; // Nome de quem pagou/criou a transação
  
  // NEW: Settlement status fields
  isSettled: boolean;
  settledByDebtor: boolean;
  settledByCreditor: boolean;
  
  // NEW: Validation flags
  canEdit: boolean;
  canDelete: boolean;
  canAnticipate: boolean;
  
  // NEW: Block reason (if operation is blocked)
  blockReason?: string;
}

interface UseSharedFinancesProps {
  currentDate?: Date;
  activeTab: 'REGULAR' | 'TRAVEL' | 'HISTORY';
}

export const useSharedFinances = ({ currentDate = new Date(), activeTab }: UseSharedFinancesProps) => {
  const { user } = useAuth();
  const { data: members = [] } = useFamilyMembers();
  const queryClient = useQueryClient();

  // Função para calcular a data de vencimento de uma transação de cartão de crédito
  // Função EXCLUSIVA para calcular data de exibição no Compartilhados
  // REGRA SIMPLES: Usar o competence_date da transação original
  // Isso garante que todos vejam a transação no MESMO mês
  const calculateSharedDisplayDate = (
    transactionDate: string, 
    competenceDate: string | null,
    accountId: string | null, 
    accounts: any[]
  ): string => {
    // SEMPRE usar competence_date se disponível, senão usar date
    // Isso garante que a transação apareça no mesmo mês para todos
    const result = competenceDate || transactionDate;
    
    console.log('🔍 [calculateSharedDisplayDate] SIMPLIFIED:', {
      transactionDate,
      competenceDate,
      accountId,
      result
    });
    
    return result;
  };

  // DEBUG: Log members
  // // console.log('🔍 [useSharedFinances] Members from useFamilyMembers:', {
  //   count: members.length,
  //   members: members.map(m => ({ id: m.id, name: m.name, linked_user_id: m.linked_user_id }))
  // });

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
      
      // Buscar família do usuário
      const { data: familyData } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();
      
      // Buscar IDs de todos os membros da família
      let familyUserIds = [user.id];
      if (familyData?.family_id) {
        const { data: familyMembers } = await supabase
          .from('family_members')
          .select('user_id, linked_user_id')
          .eq('family_id', familyData.family_id);
        
        if (familyMembers) {
          familyUserIds = familyMembers
            .map(m => m.linked_user_id || m.user_id)
            .filter((id): id is string => id !== null);
        }
      }
      
      console.log('🔍 [useSharedFinances] familyUserIds para buscar contas:', familyUserIds);
      
      // Buscar transações compartilhadas CRIADAS POR MIM
      const { data: myTransactions, error: myTxError } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, icon, color)
        `)
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
        .select(`
          *,
          transaction:transactions!transaction_id(
            *,
            category:categories(id, name, icon, color)
          )
        `)
        .eq('user_id', user.id);
      
      if (mySplitsError) {
        console.error('❌ [Query Error - My Splits]:', mySplitsError);
        throw mySplitsError;
      }
      
      // Extrair transações dos splits (transações criadas por outros)
      const othersTransactions = (mySplits || [])
        .map((split: any) => split.transaction)
        .filter((tx: any) => tx && tx.user_id !== user.id);
      
      // Combinar minhas transações + transações de outros
      const allTransactions = [...(myTransactions || []), ...othersTransactions];
      
      // Coletar TODOS os user_ids únicos das transações (criadores)
      const transactionUserIds = Array.from(
        new Set(allTransactions.map(tx => tx.user_id).filter(Boolean))
      );
      
      console.log('🔍 [useSharedFinances] transactionUserIds (criadores):', transactionUserIds);
      
      // Coletar TODOS os account_ids únicos das transações
      const transactionAccountIds = Array.from(
        new Set(allTransactions.map(tx => tx.account_id).filter(Boolean))
      );
      
      console.log('🔍 [useSharedFinances] transactionAccountIds:', transactionAccountIds);
      
      // Buscar contas de TODOS os usuários que criaram transações compartilhadas
      // E também buscar contas específicas pelos IDs encontrados nas transações
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, type, closing_day, due_day, user_id')
        .or(`user_id.in.(${transactionUserIds.join(',')}),id.in.(${transactionAccountIds.join(',')})`);
      
      if (accountsError) {
        console.error('❌ [Query Error - Accounts]:', accountsError);
        throw accountsError;
      }
      
      console.log('🔍 [useSharedFinances] TODAS as contas encontradas:', {
        count: accounts?.length,
        accounts: accounts?.map(a => ({
          id: a.id,
          type: a.type,
          closing_day: a.closing_day,
          due_day: a.due_day,
          user_id: a.user_id
        }))
      });
      
      // Log individual de cada conta
      accounts?.forEach((a, index) => {
        console.log(`📋 Conta ${index + 1}:`, {
          id: a.id,
          type: a.type,
          closing_day: a.closing_day,
          due_day: a.due_day,
          user_id: a.user_id
        });
      });
      
      // Filtrar apenas cartões de crédito
      const creditCardAccounts = accounts?.filter(a => a.type === 'CREDIT_CARD') || [];
      
      console.log('🔍 [useSharedFinances] Contas de cartão encontradas:', {
        count: creditCardAccounts?.length,
        accounts: creditCardAccounts?.map(a => ({
          id: a.id,
          type: a.type,
          closing_day: a.closing_day,
          due_day: a.due_day,
          user_id: a.user_id
        }))
      });
      
      // Log individual de cada cartão
      creditCardAccounts?.forEach((a, index) => {
        console.log(`💳 Cartão ${index + 1}:`, {
          id: a.id,
          type: a.type,
          closing_day: a.closing_day,
          due_day: a.due_day,
          user_id: a.user_id
        });
      });
      
      console.log('🔍 [useSharedFinances] Contas de cartão encontradas:', {
        count: creditCardAccounts?.length,
        accounts: creditCardAccounts?.map(a => ({
          id: a.id,
          type: a.type,
          closing_day: a.closing_day,
          due_day: a.due_day,
          user_id: a.user_id
        }))
      });
      
      // Remover duplicatas das transações
      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(tx => [tx.id, tx])).values()
      );
      
      if (uniqueTransactions.length === 0) {
        return [];
      }
      
      // Buscar splits para todas as transações
      const transactionIds = uniqueTransactions.map(t => t.id);
      
      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select('*')
        .in('transaction_id', transactionIds);
      
      if (splitsError) {
        console.error('❌ [Query Error - Splits]:', splitsError);
        throw splitsError;
      }
      
      // console.log('✅ [Query Result - Splits]:', {
      //   count: splits?.length || 0,
      //   splits: splits
      // });
      
      // Combinar transações com seus splits
      const transactionsWithSplitsData = uniqueTransactions.map(tx => ({
        ...tx,
        transaction_splits: splits?.filter(s => s.transaction_id === tx.id) || []
      }));
      
      // console.log('✅ [Query Result] Transações com splits:', {
      //   count: transactionsWithSplitsData.length,
      //   transactions: transactionsWithSplitsData.map(t => ({
      //     id: t.id,
      //     description: t.description,
      //     user_id: t.user_id,
      //     splits: t.transaction_splits?.length || 0,
      //     splitsData: t.transaction_splits
      //   }))
      // });
      
      return { transactions: transactionsWithSplitsData, accounts: creditCardAccounts || [] };
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
          category:categories(id, name, icon, color),
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
    
    const transactions = transactionsWithSplits?.transactions || [];
    const accounts = transactionsWithSplits?.accounts || [];
    
    // console.log('🔍 [useMemo] Iniciando processamento:', {
    //   membersCount: members.length,
    //   membersData: members.map(m => ({ id: m.id, name: m.name })),
    //   transactionsCount: transactions.length,
    //   transactionsData: transactions.map(t => ({
    //     id: t.id,
    //     description: t.description,
    //     splits: t.transaction_splits?.length || 0
    //   }))
    // });
    
    // Initialize map for each member
    members.forEach(m => {
      invoiceMap[m.id] = [];
      // console.log('✅ [useMemo] Inicializando invoiceMap para membro:', m.id, m.name);
    });

    // DEBUG: Log dados recebidos
    // console.log('🔍 [useSharedFinances] DEBUG:', {
    //   transactionsCount: transactions.length,
    //   paidByOthersTransactions: paidByOthersTransactions.length,
    //   members: members.length,
    //   activeTab,
    //   currentDate
    // });

    // LÓGICA CORRETA (SEM ESPELHAMENTO):
    
    // CASO 1: EU PAGUEI - Créditos (me devem)
    // Transações que EU criei e dividi com outros
    transactions.forEach(tx => {
      if (tx.type !== 'EXPENSE') return;
      
      const splits = tx.transaction_splits || [];
      const txCurrency = tx.currency || 'BRL'; // Usar moeda da transação

      // // console.log('🔍 [CASO 1] Processando tx:', {
      //   id: tx.id,
      //   description: tx.description,
      //   user_id: tx.user_id,
      //   current_user_id: user?.id,
      //   is_my_transaction: tx.user_id === user?.id,
      //   splits: splits.length,
      //   splitsData: splits,
      //   date: tx.date,
      //   competence_date: tx.competence_date,
      //   currency: txCurrency
      // });

      // Se EU criei a transação, os splits são CRÉDITOS (me devem)
      if (tx.user_id === user?.id) {
        splits.forEach((split: any) => {
          // // console.log('🔍 [CASO 1A - EU PAGUEI] Processando split:', split);
          
          const memberId = split.member_id;
          if (!memberId) {
            // console.warn('⚠️ [CASO 1A] Split sem member_id!', split);
            return;
          }
          
          const uniqueKey = `${tx.id}-credit-${memberId}`;
          if (processedTxIds.has(uniqueKey)) {
            // console.warn('⚠️ [CASO 1A] Item já processado:', uniqueKey);
            return;
          }
          processedTxIds.add(uniqueKey);
          
          const member = members.find(m => m.id === memberId);
          
          // Buscar nome do criador (quem pagou)
          const creator = members.find(m => m.linked_user_id === tx.user_id);
          const creatorName = creator?.name || (tx.user_id === user?.id ? 'Você' : 'Outro membro');
          
          if (!invoiceMap[memberId]) {
            // console.warn('⚠️ [CASO 1A] Member não encontrado no invoiceMap:', memberId);
            invoiceMap[memberId] = [];
          }
          
          // console.log('🔍 [CASO 1A] Criando CRÉDITO com tripId:', tx.trip_id);
          
          // Calculate validation flags
          const settlementStatus = SettlementValidator.getSettlementStatus(
            { id: tx.id, user_id: tx.user_id, is_settled: tx.is_settled },
            split
          );
          
          // Para Compartilhados: usar data de exibição calculada
          const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts);
          
          invoiceMap[memberId].push({
            id: uniqueKey,
            originalTxId: tx.id,
            splitId: split.id,
            description: tx.description,
            date: displayDate,
            category: tx.category?.name,
            amount: split.amount,
            type: 'CREDIT',
            isPaid: split.settled_by_creditor === true, // Credor: usa settled_by_creditor
            tripId: tx.trip_id || undefined,
            memberId: memberId,
            memberName: member?.name || split.name,
            currency: txCurrency,
            installmentNumber: tx.current_installment,
            totalInstallments: tx.total_installments,
            seriesId: tx.series_id,
            creatorUserId: tx.user_id,
            creatorName: creatorName,
            // NEW: Settlement status fields
            isSettled: settlementStatus.isSettled,
            settledByDebtor: split.settled_by_debtor || false,
            settledByCreditor: split.settled_by_creditor || false,
            // NEW: Validation flags
            canEdit: settlementStatus.canEdit,
            canDelete: settlementStatus.canDelete,
            canAnticipate: settlementStatus.canAnticipate,
            // NEW: Block reason
            blockReason: settlementStatus.blockReason,
          });

          // console.log('✅ [CASO 1A] CRÉDITO criado:', {
          //   memberId,
          //   memberName: member?.name,
          //   amount: split.amount,
          //   date: tx.competence_date || tx.date,
          //   tripId: tx.trip_id
          // });
        });
      } else {
        // CASO 1B: OUTRO PAGOU e me incluiu em um split - DÉBITO (eu devo)
        // Encontrar o split onde EU sou o devedor
        const mySplit = splits.find((s: any) => s.user_id === user?.id);
        
        if (mySplit) {
          // console.log('🔍 [CASO 1B - OUTRO PAGOU] Encontrei meu split:', mySplit);
          // console.log('🔍 [CASO 1B] Transação completa:', tx);
          
          // Encontrar o membro que representa o criador da transação
          const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
          
          if (creatorMember) {
            const uniqueKey = `${tx.id}-debit-${creatorMember.id}`;
            if (!processedTxIds.has(uniqueKey)) {
              processedTxIds.add(uniqueKey);
              
              if (!invoiceMap[creatorMember.id]) {
                invoiceMap[creatorMember.id] = [];
              }
              
              // console.log('🔍 [CASO 1B] Criando DÉBITO com tripId:', tx.trip_id);
              
              // Buscar nome do criador (quem pagou) - neste caso é o próprio usuário logado
              const creatorName = 'Você'; // Eu devo para o criador, então o criador sou eu
              
              // Calculate validation flags
              const settlementStatus = SettlementValidator.getSettlementStatus(
                { id: tx.id, user_id: tx.user_id, is_settled: tx.is_settled },
                mySplit
              );
              
              // Para Compartilhados: usar data de exibição calculada
              const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts);
              
              invoiceMap[creatorMember.id].push({
                id: uniqueKey,
                originalTxId: tx.id,
                splitId: mySplit.id,
                description: tx.description,
                date: displayDate,
                category: tx.category?.name,
                amount: mySplit.amount,
                type: 'DEBIT',
                isPaid: mySplit.settled_by_debtor === true, // Devedor: usa settled_by_debtor
                tripId: tx.trip_id || undefined,
                memberId: creatorMember.id,
                memberName: creatorMember.name,
                currency: txCurrency,
                installmentNumber: tx.current_installment,
                totalInstallments: tx.total_installments,
                seriesId: tx.series_id,
                creatorUserId: tx.user_id,
                creatorName: creatorMember.name, // Quem pagou foi o criador
                // NEW: Settlement status fields
                isSettled: settlementStatus.isSettled,
                settledByDebtor: mySplit.settled_by_debtor || false,
                settledByCreditor: mySplit.settled_by_creditor || false,
                // NEW: Validation flags
                canEdit: settlementStatus.canEdit,
                canDelete: settlementStatus.canDelete,
                canAnticipate: settlementStatus.canAnticipate,
                // NEW: Block reason
                blockReason: settlementStatus.blockReason,
              });

              // console.log('✅ [CASO 1B] DÉBITO criado:', {
              //   memberId: creatorMember.id,
              //   memberName: creatorMember.name,
              //   amount: mySplit.amount,
              //   date: tx.competence_date || tx.date,
              //   tripId: tx.trip_id
              // });
            }
          } else {
            // // console.warn('⚠️ [CASO 1B] Criador da transação não encontrado nos membros:', tx.user_id);
          }
        }
      }
    });

    // CASO 2: OUTRO PAGOU - Débitos (eu devo)
    // Transações onde payer_id indica que outro membro pagou por mim
    paidByOthersTransactions.forEach((tx: any) => {
      if (tx.type !== 'EXPENSE') return;
      
      const txCurrency = tx.currency || 'BRL'; // Usar moeda da transação
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
        category: tx.category?.name,
        amount: tx.amount,
        type: 'DEBIT',
        isPaid: tx.is_settled === true,
        tripId: tx.trip_id || undefined,
        memberId: targetMemberId,
        memberName: payer.name,
        currency: txCurrency,
        installmentNumber: tx.current_installment,
        totalInstallments: tx.total_installments,
        seriesId: tx.series_id,
        creatorUserId: tx.user_id,
        creatorName: payer.name, // Quem pagou foi o payer
        // NEW: Settlement status fields
        isSettled: tx.is_settled === true,
        settledByDebtor: false, // No split info available for this case
        settledByCreditor: false,
        // NEW: Validation flags
        canEdit: !tx.is_settled,
        canDelete: !tx.is_settled,
        canAnticipate: !tx.is_settled,
        // NEW: Block reason
        blockReason: tx.is_settled ? 'Esta transação já foi acertada e não pode ser modificada' : undefined,
      });
    });

    // console.log('📊 [useSharedFinances] Invoice Map Final:', {
    //   totalMembers: Object.keys(invoiceMap).length,
    //   itemsPerMember: Object.entries(invoiceMap).map(([id, items]) => ({
    //     memberId: id,
    //     memberName: members.find(m => m.id === id)?.name,
    //     itemCount: items.length
    //   }))
    // });

    return invoiceMap;
  }, [transactionsWithSplits, paidByOthersTransactions, members]);

  const getFilteredInvoice = (memberId: string): InvoiceItem[] => {
    const allItems = invoices[memberId] || [];
    
    // console.log('🔍 [getFilteredInvoice] Filtrando para membro:', {
    //   memberId,
    //   memberName: members.find(m => m.id === memberId)?.name,
    //   allItemsCount: allItems.length,
    //   allItems: allItems.map(i => ({
    //     description: i.description,
    //     date: i.date,
    //     tripId: i.tripId,
    //     type: i.type,
    //     isPaid: i.isPaid
    //   })),
    //   activeTab,
    //   currentDate: currentDate.toISOString()
    // });
    
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
      // TRAVEL: Mostrar TODOS os itens de viagens (sem filtro de mês)
      // As viagens são agrupadas por trip, então não faz sentido filtrar por mês
      const filtered = scopeFilteredItems
        .filter(i => {
          if (!i.tripId) {
            // console.log('🔍 [TRAVEL Filter] Item sem tripId:', i);
            return false;
          }
          
          // console.log('🔍 [TRAVEL Filter] Item com tripId:', {
          //   description: i.description,
          //   date: i.date,
          //   tripId: i.tripId,
          //   type: i.type,
          //   isPaid: i.isPaid
          // });
          
          return true; // Mostrar TODOS os itens de viagem
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // console.log('✅ [getFilteredInvoice] Resultado TRAVEL:', {
      //   filteredCount: filtered.length,
      //   items: filtered.map(i => ({
      //     description: i.description,
      //     date: i.date,
      //     tripId: i.tripId,
      //     type: i.type,
      //     isPaid: i.isPaid
      //   }))
      // });
      
      return filtered;
    } else if (activeTab === 'HISTORY') {
      // HISTORY: Mostrar apenas itens pagos filtrados pelo mês atual
      return scopeFilteredItems
        .filter(i => {
          if (!i.isPaid) return false;
          
          // Filtrar pelo mês selecionado
          const [year, month, day] = i.date.split('-').map(Number);
          const itemMonth = month - 1;
          const itemYear = year;
          
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          
          return itemMonth === currentMonth && itemYear === currentYear;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // REGULAR: Mostrar apenas itens NÃO PAGOS não relacionados a viagens, filtrados pelo mês atual
      const filtered = scopeFilteredItems
        .filter(i => {
          // Não mostrar itens de viagens
          if (i.tripId) return false;
          
          // Não mostrar itens já pagos (devem ir para o histórico)
          if (i.isPaid) return false;
          
          // CORREÇÃO CRÍTICA: Usar competence_date ao invés de date para filtrar parcelas
          // Isso garante que cada parcela apareça apenas no seu mês de competência
          const dateToUse = i.date; // Usar date pois é o que vem no InvoiceItem
          
          // Parse date as YYYY-MM-DD to avoid timezone issues
          const [year, month, day] = dateToUse.split('-').map(Number);
          const itemMonth = month - 1; // JavaScript months are 0-indexed
          const itemYear = year;
          
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          
          const matches = itemMonth === currentMonth && itemYear === currentYear;
          
          // // console.log('🔍 [REGULAR Filter] Item:', {
          //   description: i.description,
          //   date: i.date,
          //   itemMonth,
          //   itemYear,
          //   currentMonth,
          //   currentYear,
          //   matches
          // });
          
          return matches;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      
      // // console.log('✅ [getFilteredInvoice] Resultado REGULAR:', {
      //   filteredCount: filtered.length
      // });
      
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

  // Calculate global summary - SEPARADO POR MOEDA (NUNCA SOMAR MOEDAS DIFERENTES!)
  const getSummary = () => {
    const summaryByCurrency: Record<string, { totalCredits: number; totalDebits: number; net: number }> = {};
    
    Object.values(invoices).forEach(items => {
      items.forEach(item => {
        const curr = item.currency || 'BRL';
        if (!summaryByCurrency[curr]) {
          summaryByCurrency[curr] = { totalCredits: 0, totalDebits: 0, net: 0 };
        }
        
        if (!item.isPaid) {
          if (item.type === 'CREDIT') {
            summaryByCurrency[curr].totalCredits += item.amount;
          } else {
            summaryByCurrency[curr].totalDebits += item.amount;
          }
        }
      });
    });
    
    // Calcular net para cada moeda
    Object.keys(summaryByCurrency).forEach(curr => {
      summaryByCurrency[curr].net = summaryByCurrency[curr].totalCredits - summaryByCurrency[curr].totalDebits;
    });
    
    return summaryByCurrency;
  };

  return { 
    invoices, 
    getFilteredInvoice, 
    getTotals, 
    getSummary,
    members, 
    transactions: transactionsWithSplits?.transactions || [],
    isLoading,
    refetch: refetchAll // Usar refetchAll para invalidar todas as queries
  };
};


// Hook para confirmar ressarcimento de um split
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
