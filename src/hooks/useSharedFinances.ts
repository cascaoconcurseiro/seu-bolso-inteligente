import { moneyUtils } from "@/utils/money";
import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from './useFamily';
import { toast } from 'sonner';
import { SettlementValidator } from '@/services/settlementValidation';
import { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import { dateUtils } from '@/lib/dateUtils';
import { rpcWithRetry } from '@/utils/rpcWithRetry';

type DBTransaction = Database['public']['Tables']['transactions']['Row'] & {
  category?: { id: string; name: string; icon: string | null; color: string | null } | null;
  transaction_splits?: DBSplit[];
  payer?: { id: string; name: string; user_id: string | null; linked_user_id: string | null } | null;
  currency?: string; // Estendendo manualmente
  competence_date?: string | null; // Estendendo manualmente
};

type DBSplit = Database['public']['Tables']['transaction_splits']['Row'] & {
  settled_by_debtor: boolean; // Forçando como obrigatório para o código
  settled_by_creditor: boolean; // Forçando como obrigatório para o código
};
type DBAccount = Pick<Database['public']['Tables']['accounts']['Row'], 'id' | 'type' | 'closing_day' | 'due_day' | 'user_id'>;

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
  settledAt?: string | null;
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
  // REGRA: Para cartões de crédito, calcular mês de VENCIMENTO a partir do competence_date (mês de fechamento)
  // Para outras contas, usar competence_date diretamente
  const calculateSharedDisplayDate = (
    transactionDate: string, 
    competenceDate: string | null,
    accountId: string | null, 
    accounts: DBAccount[]
  ): string => {
    // Se não tem competence_date, usar date
    if (!competenceDate) {
      return transactionDate;
    }
    
    // Se não tem account_id, usar competence_date
    if (!accountId) {
      return competenceDate;
    }

    // Buscar a conta
    const account = accounts.find(a => a.id === accountId);
    if (!account) return competenceDate;
    
    // Se não é cartão de crédito, usar competence_date
    if (account.type !== 'CREDIT_CARD') {
      return competenceDate;
    }

    // É CARTÃO DE CRÉDITO → calcular mês de VENCIMENTO usando dateUtils
    const closingDay = account.closing_day || 1;
    const dueDay = account.due_day || 10;
    const closingMonth = dateUtils.parseDate(competenceDate);
    
    let dueMonth = closingMonth.getMonth();
    let dueYear = closingMonth.getFullYear();
    
    if (dueDay <= closingDay) {
      dueMonth++;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear++;
      }
    }
    
    // Use dateUtils.getCompetenceDate to ensure proper UTC handling
    const dueDate = new Date(Date.UTC(dueYear, dueMonth, 1));
    return dateUtils.getCompetenceDate(dueDate);
  };


  // Invalida a query consolidada (única fonte de dados)
  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  // NOVO: Fetch de saldos consolidados via RPC nativo (Performance DBA)
  const { data: sharedBalances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ['shared-balances', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const data = await rpcWithRetry('get_current_shared_debts', {
          p_user_id: user.id
        });
        return data as Array<{
          member_id: string;
          currency: string;
          total_credits: number;
          total_debits: number;
          net_balance: number;
        }>;
      } catch (error) {
        logger.error('Erro ao buscar saldos via RPC', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // NOVO: Fetch consolidado via RPC para popular a lista de transações
  const { data: sharedData, isLoading, refetch } = useQuery({
    queryKey: ['shared-transactions-consolidated', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const data = await rpcWithRetry('get_shared_invoice_data', {
          p_user_id: user.id
        });
        return data;
      } catch (error) {
        logger.error('Erro ao buscar dados consolidados de finanças compartilhadas', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // REALTIME: Escutar mudanças em transaction_splits para atualizar a UI instantaneamente
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('shared_splits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_splits'
        },
        () => {
          logger.info('Realtime: Mudança detectada em splits, atualizando...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Mapear dados do RPC para os estados existentes
  const transactionsWithSplits = useMemo(() => ({
    transactions: sharedData?.transactions || [],
    accounts: sharedData?.accounts || []
  }), [sharedData]);

  // Atualizar membros se vierem do RPC (opcional, mas garante consistência)
  // const members = sharedData?.members || [];

  // Transações pagas por outros vêm da RPC consolidada (sem consulta extra)
  const paidByOthersTransactions = useMemo(() => {
    const txList: DBTransaction[] = sharedData?.transactions || [];
    return txList.filter(
      (t: DBTransaction) => t.user_id === user?.id && t.payer_id != null && t.source_transaction_id == null
    );
  }, [sharedData, user?.id]);

  const invoices = useMemo(() => {
    const invoiceMap: Record<string, InvoiceItem[]> = {};
    const processedTxIds = new Set<string>();
    
    const transactions = (transactionsWithSplits as { transactions: DBTransaction[] }).transactions || [];
    const accounts = (transactionsWithSplits as { accounts: DBAccount[] }).accounts || [];
    
    const myMemberId = members.find(m => m.linked_user_id === user?.id)?.id;

    // Initialize map for each member
    members.forEach(m => {
      invoiceMap[m.id] = [];
    });

    // LÓGICA CORRETA (SEM ESPELHAMENTO):
    
    // CASO 1: EU PAGUEI - Créditos (me devem)
    // Transações que EU criei e dividi com outros
    transactions.forEach(tx => {
      // Permitir EXPENSE e INCOME (como estorno)
      if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
      
      const isRefund = tx.type === 'INCOME';
      
      const splits = tx.transaction_splits || [];
      const txCurrency = tx.currency || 'BRL'; // Usar moeda da transação

      // NOVO: Determinar se EU sou o credor (quem pagou a conta)
      // Sou credor se: EU criei e NÃO marquei outro como pagador, OU se OUTRO criou mas marcou que EU paguei (payer_id)
      const isMeTheRealCreditor = (tx.user_id === user?.id && !tx.payer_id) || 
                                  (tx.payer_id === myMemberId && tx.payer_id != null);

      if (isMeTheRealCreditor) {
          splits.forEach((split) => {
            
            const memberId = split.member_id;
            // Pular se for minha própria parte OU se não tiver memberId
            if (!memberId || memberId === myMemberId) {
              return;
            }
          
          const uniqueKey = `${tx.id}-credit-${memberId}`;
          if (processedTxIds.has(uniqueKey)) {
            return;
          }
          processedTxIds.add(uniqueKey);
          
          const member = members.find(m => m.id === memberId);
          
          // Buscar nome do criador (quem pagou)
          const creator = members.find(m => m.linked_user_id === tx.user_id);
          const creatorName = creator?.name || (tx.user_id === user?.id ? 'Você' : 'Outro membro');
          
          if (!invoiceMap[memberId]) {
            invoiceMap[memberId] = [];
          }
          
          // Calculate validation flags
          const settlementStatus = SettlementValidator.getSettlementStatus(
            { id: tx.id, user_id: tx.user_id, is_settled: tx.is_settled || false },
            split as any // DBSplit has user_id: string | null, but TransactionSplit wants string | null now too, but there might be other small diffs
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
            amount: isRefund ? -split.amount : split.amount,
            type: isRefund ? 'DEBIT' : 'CREDIT',
            isPaid: split.is_settled === true || split.settled_by_creditor === true, // Credor: usa settled_by_creditor ou is_settled
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
            isSettled: split.is_settled === true,
            settledByDebtor: split.settled_by_debtor || false,
            settledByCreditor: split.settled_by_creditor || false,
            // NEW: Validation flags
            canEdit: settlementStatus.canEdit,
            canDelete: settlementStatus.canDelete,
            canAnticipate: settlementStatus.canAnticipate,
            // NEW: Block reason
            blockReason: settlementStatus.blockReason,
            settledAt: split.settled_at,
          });
        });
      } else {
        // CASO 1B: OUTRO PAGOU (ou eu criei mas marquei outro como pagador) e me incluiu em um split - DÉBITO (eu devo)
        // Encontrar o split onde EU sou o devedor
        const mySplit = splits.find((s) => s.member_id === myMemberId);
        
        if (mySplit) {
          // Encontrar o membro que representa o criador da transação
          const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
          
          if (creatorMember) {
            const uniqueKey = `${tx.id}-debit-${creatorMember.id}`;
            if (!processedTxIds.has(uniqueKey)) {
              processedTxIds.add(uniqueKey);
              
              if (!invoiceMap[creatorMember.id]) {
                invoiceMap[creatorMember.id] = [];
              }
              
              // Calculate validation flags
              const settlementStatus = SettlementValidator.getSettlementStatus(
                { id: tx.id, user_id: tx.user_id, is_settled: tx.is_settled || false },
                { ...mySplit, member_id: mySplit.member_id || "" } as any
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
                isPaid: mySplit.is_settled === true || mySplit.settled_by_debtor === true, // Devedor: usa settled_by_debtor ou is_settled
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
                isSettled: mySplit.is_settled === true,
                settledByDebtor: mySplit.settled_by_debtor || false,
                settledByCreditor: mySplit.settled_by_creditor || false,
                // NEW: Validation flags
                canEdit: settlementStatus.canEdit,
                canDelete: settlementStatus.canDelete,
                canAnticipate: settlementStatus.canAnticipate,
                // NEW: Block reason
                blockReason: settlementStatus.blockReason,
                settledAt: mySplit.settled_at,
              });
            }
          }
        }
      }
    });

    // CASO 2: OUTRO PAGOU - Débitos (eu devo)
    // Transações onde payer_id indica que outro membro pagou por mim
    paidByOthersTransactions.forEach((tx) => {
      if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
      
      const isRefund = tx.type === 'INCOME';
      
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
      
      // Use dateUtils.getCompetenceDate for consistent UTC handling
      const displayDate = tx.competence_date || dateUtils.formatDate(dateUtils.parseDate(tx.date));
      
      invoiceMap[targetMemberId].push({
        id: uniqueKey,
        originalTxId: tx.id,
        description: tx.description,
        date: displayDate,
        category: tx.category?.name,
        amount: isRefund ? -tx.amount : tx.amount,
        type: isRefund ? 'CREDIT' : 'DEBIT',
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
        settledAt: tx.settled_at,
      });
    });

    // CASO 3: Transações não divididas (is_shared = false) mas no domínio SHARED
    // Isso inclui atribuições diretas de 100% a outro membro (via related_member_id)
    // e transações de acerto (settlements).
    transactions.forEach(tx => {
      if (tx.is_shared) return;
      if (tx.domain !== 'SHARED') return;
      if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
      
      const txCurrency = tx.currency || 'BRL';

      // 3A: Atribuição direta via related_member_id (100% de um gasto para outro membro)
      if (tx.related_member_id) {
        const isPayerMe = tx.user_id === user?.id;
        const targetMemberId = tx.related_member_id;
        
        if (isPayerMe) {
          const uniqueKey = `${tx.id}-credit-${targetMemberId}`;
          if (!processedTxIds.has(uniqueKey)) {
            processedTxIds.add(uniqueKey);
            
            const member = members.find(m => m.id === targetMemberId);
            const displayDate = tx.competence_date || dateUtils.formatDate(dateUtils.parseDate(tx.date));
            
            if (!invoiceMap[targetMemberId]) {
              invoiceMap[targetMemberId] = [];
            }
            
            invoiceMap[targetMemberId].push({
              id: uniqueKey,
              originalTxId: tx.id,
              description: tx.description,
              date: displayDate,
              category: tx.category?.name,
              amount: Number(tx.amount),
              type: 'CREDIT',
              isPaid: tx.is_settled === true,
              tripId: tx.trip_id || undefined,
              memberId: targetMemberId,
              memberName: member?.name || 'Membro',
              currency: txCurrency,
              installmentNumber: tx.current_installment,
              totalInstallments: tx.total_installments,
              seriesId: tx.series_id,
              creatorUserId: tx.user_id,
              creatorName: 'Você',
              isSettled: tx.is_settled === true,
              settledByDebtor: tx.is_settled === true,
              settledByCreditor: tx.is_settled === true,
              canEdit: !tx.is_settled,
              canDelete: !tx.is_settled,
              canAnticipate: !tx.is_settled,
              settledAt: tx.settled_at,
            });
          }
        } else {
          const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
          if (creatorMember) {
            const uniqueKey = `${tx.id}-debit-${creatorMember.id}`;
            if (!processedTxIds.has(uniqueKey)) {
              processedTxIds.add(uniqueKey);
              
              const displayDate = tx.competence_date || dateUtils.formatDate(dateUtils.parseDate(tx.date));
              
              if (!invoiceMap[creatorMember.id]) {
                invoiceMap[creatorMember.id] = [];
              }
              
              invoiceMap[creatorMember.id].push({
                id: uniqueKey,
                originalTxId: tx.id,
                description: tx.description,
                date: displayDate,
                category: tx.category?.name,
                amount: Number(tx.amount),
                type: 'DEBIT',
                isPaid: tx.is_settled === true,
                tripId: tx.trip_id || undefined,
                memberId: creatorMember.id,
                memberName: creatorMember.name,
                currency: txCurrency,
                installmentNumber: tx.current_installment,
                totalInstallments: tx.total_installments,
                seriesId: tx.series_id,
                creatorUserId: tx.user_id,
                creatorName: creatorMember.name,
                isSettled: tx.is_settled === true,
                settledByDebtor: tx.is_settled === true,
                settledByCreditor: tx.is_settled === true,
                canEdit: !tx.is_settled,
                canDelete: !tx.is_settled,
                canAnticipate: !tx.is_settled,
                settledAt: tx.settled_at,
              });
            }
          }
        }
      }
      
      // 3B: Acerto de contas puro (e.g. description contém "Acerto" ou "Recebimento: carro" etc.)
      else if (tx.description?.includes('Acerto') || tx.description?.includes('acerto') || tx.is_settled) {
        const isCreatorMe = tx.user_id === user?.id;
        const otherMember = members.find(m => m.linked_user_id !== user?.id);
        
        if (otherMember) {
          const targetMemberId = otherMember.id;
          const uniqueKey = `${tx.id}-${tx.type === 'INCOME' ? 'credit' : 'debit'}-${targetMemberId}`;
          
          if (!processedTxIds.has(uniqueKey)) {
            processedTxIds.add(uniqueKey);
            
            const displayDate = tx.competence_date || tx.date;
            
            if (!invoiceMap[targetMemberId]) {
              invoiceMap[targetMemberId] = [];
            }
            
            const type = tx.type === 'EXPENSE' ? 'CREDIT' : 'DEBIT';
            
            invoiceMap[targetMemberId].push({
              id: uniqueKey,
              originalTxId: tx.id,
              description: tx.description,
              date: displayDate,
              category: 'Acerto',
              amount: Number(tx.amount),
              type: type,
              isPaid: true,
              tripId: tx.trip_id || undefined,
              memberId: targetMemberId,
              memberName: otherMember.name,
              currency: txCurrency,
              creatorUserId: tx.user_id,
              creatorName: isCreatorMe ? 'Você' : otherMember.name,
              isSettled: true,
              settledByDebtor: true,
              settledByCreditor: true,
              canEdit: false,
              canDelete: true,
              canAnticipate: false,
              settledAt: tx.settled_at || tx.created_at,
            });
          }
        }
      }
    });

    return invoiceMap;
  }, [transactionsWithSplits, paidByOthersTransactions, members, user?.id]);

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
      // TRAVEL: Mostrar TODOS os itens de viagens (sem filtro de mês)
      // As viagens são agrupadas por trip, então não faz sentido filtrar por mês
      const filtered = scopeFilteredItems
        .filter((i) => {
          return !!i.tripId; // Mostrar TODOS os itens de viagem
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      
      return filtered;
    } else if (activeTab === 'HISTORY') {
      // HISTORY: Mostrar apenas itens TOTALMENTE ACERTADOS filtrados pelo mês atual
      return scopeFilteredItems
        .filter(i => {
          // NOVO: Vai para o histórico se estiver TOTALMENTE acertado
          // OU se EU já fiz minha parte (isPaid reflete a minha ação baseada no meu papel)
          if (!i.isSettled && !i.isPaid) return false;

          // Filtrar pelo mês selecionado
          const [year, month] = i.date.split('-').map(Number);
          const itemMonth = month - 1;
          const itemYear = year;
          
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          
          return itemMonth === currentMonth && itemYear === currentYear;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // REGULAR: Mostrar apenas itens NÃO TOTALMENTE ACERTADOS não relacionados a viagens, filtrados pelo mês atual
      const filtered = scopeFilteredItems
        .filter(i => {
          // Não mostrar itens de viagens
          if (i.tripId) return false;
          
          // Não mostrar itens totalmente acertados (devem ir para o histórico)
          if (i.isSettled) return false;

          // NOVO: Não mostrar se EU já fiz minha parte (já foi para o histórico/aguardando outro)
          if (i.isPaid) return false;
          
          // CORREÇÃO CRÍTICA: Usar competence_date ao invés de date para filtrar parcelas
          // Isso garante que cada parcela apareça apenas no seu mês de competência
          const dateToUse = i.date; // Usar date pois é o que vem no InvoiceItem
          
          // Parse date as YYYY-MM-DD to avoid timezone issues
          const [year, month] = dateToUse.split('-').map(Number);
          
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          // Lógica de isolamento de competência de parcelas
          // Parcelas são exibidas estritamente no seu mês de vencimento correspondente, sem acúmulo
          const isInstallment = i.totalInstallments && i.totalInstallments > 1;
          if (isInstallment) {
            return (month - 1) === currentMonth && year === currentYear;
          }
          
          // Despesas fixas/recorrentes/comuns também devem ser exibidas ESTRITAMENTE no seu mês
          return (month - 1) === currentMonth && year === currentYear;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      
      
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
      totalsByCurrency[curr].net = moneyUtils.round(totalsByCurrency[curr].credits - totalsByCurrency[curr].debits);
    });

    return totalsByCurrency;
  };

  // Calculate global summary - SEPARADO POR MOEDA (NUNCA SOMAR MOEDAS DIFERENTES!)
  // Utilizando a NOVA RPC do Banco de Dados para aliviar o cálculo do Frontend
  const getSummary = () => {
    const summaryByCurrency: Record<string, { totalCredits: number; totalDebits: number; net: number }> = {};
    
    // Se a RPC retornou com sucesso os saldos mastigados do DB, usamos isso!
    if (sharedBalances && sharedBalances.length > 0) {
      sharedBalances.forEach(balance => {
        const curr = balance.currency || 'BRL';
        if (!summaryByCurrency[curr]) {
          summaryByCurrency[curr] = { totalCredits: 0, totalDebits: 0, net: 0 };
        }
        
        summaryByCurrency[curr].totalCredits += Number(balance.total_credits);
        summaryByCurrency[curr].totalDebits += Number(balance.total_debits);
        summaryByCurrency[curr].net += Number(balance.net_balance);
      });
      
      return {
        byCurrency: summaryByCurrency,
        hasMultipleCurrencies: Object.keys(summaryByCurrency).length > 1,
      };
    }
    
    // Fallback de segurança: calcula via Frontend caso a RPC falhe ou ainda não tenha sido injetada
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
    
    // Calcular net para cada moeda individualmente
    Object.keys(summaryByCurrency).forEach(curr => {
      summaryByCurrency[curr].net = moneyUtils.round(
        summaryByCurrency[curr].totalCredits - summaryByCurrency[curr].totalDebits
      );
    });

    return {
      byCurrency: summaryByCurrency,
      hasMultipleCurrencies: Object.keys(summaryByCurrency).length > 1,
    };
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


// Hook para confirmar ressarcimento de um split usando RPC seguro
export function useSettleSplit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ splitId, amount, accountId }: { splitId: string; amount: number; accountId: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase.rpc('settle_split', {
        p_split_id: splitId,
        p_amount: amount,
        p_account_id: accountId,
        p_user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Ressarcimento processado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao processar ressarcimento: ' + error.message);
    },
  });
}

// Hook para solicitar o acerto de múltiplos splits usando RPC (Passo 1)
export function useRequestSettlement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ splitIds, accountId, isPayment }: { splitIds: string[]; accountId: string; isPayment: boolean }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase.rpc('request_settlement', {
        p_split_ids: splitIds,
        p_account_id: accountId,
        p_user_id: user.id,
        p_is_payment: isPayment
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`${(data as any)?.processed_count || 0} acerto(s) informados. Aguardando confirmação!`);
    },
    onError: (error) => {
      toast.error('Erro ao processar pagamentos: ' + error.message);
    },
  });
}

// Hook para confirmar o recebimento de múltiplos splits usando RPC (Passo 2)
export function useConfirmSettlement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ splitIds, accountId, isReceiving }: { splitIds: string[]; accountId: string; isReceiving: boolean }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase.rpc('confirm_settlement', {
        p_split_ids: splitIds,
        p_account_id: accountId,
        p_user_id: user.id,
        p_is_receiving: isReceiving
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`${(data as any)?.confirmed_count || 0} recebimento(s) confirmados e liquidados!`);
    },
    onError: (error) => {
      toast.error('Erro ao confirmar recebimentos: ' + error.message);
    },
  });
}

// Hook para desfazer ressarcimento usando RPC seguro (undo_settlement)
export function useUnsettleSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      const { data, error } = await supabase.rpc('undo_settlement', {
        p_split_id: splitId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Ressarcimento desfeito e saldo restaurado!');
    },
    onError: (error) => {
      toast.error('Erro ao desfazer ressarcimento: ' + error.message);
    },
  });
}
