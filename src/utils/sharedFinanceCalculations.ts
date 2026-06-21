import { SettlementValidator } from '@/services/settlementValidation';
import { dateUtils } from '@/lib/dateUtils';
import { Database } from '@/types/database';
import { SafeFinancialCalculator } from '@/services/SafeFinancialCalculator';
import type { TransactionSplit } from '@/services/settlementValidation';

export interface SplitInput {
  member_id: string;
  percentage: number;
  [key: string]: any;
}

/**
 * Calcula os valores de split garantindo que a soma exata seja igual ao valor da transação (precisão de centavos).
 * O criador da transação é priorizado para absorver qualquer dízima/diferença de centavos.
 */
export const calculateTransactionSplits = <T extends SplitInput>(
  transactionAmount: number,
  splits: T[],
  creatorMemberId?: string
): (T & { amount: number })[] => {
  if (!splits || splits.length === 0) return [];

  // Ordenar para garantir que o 'Criador' fique por último e absorva o resíduo de centavos
  const sortedSplits = [...splits].sort((a, b) => {
    if (a.member_id === creatorMemberId) return 1;
    if (b.member_id === creatorMemberId) return -1;
    return 0;
  });

  let allocatedSum = 0;
  
  return sortedSplits.map((split, index) => {
    let splitAmount = 0;
    if (index === sortedSplits.length - 1) {
      // O último (idealmente o criador) absorve a diferença para fechar os centavos
      splitAmount = SafeFinancialCalculator.subtract(transactionAmount, allocatedSum);
    } else {
      splitAmount = SafeFinancialCalculator.percentage(transactionAmount, split.percentage);
      allocatedSum = SafeFinancialCalculator.add(allocatedSum, splitAmount);
    }
    
    return {
      ...split,
      amount: splitAmount
    };
  });
};

export interface InvoiceItem {
  id: string;
  originalTxId: string;
  splitId?: string;
  sourceTransactionId?: string;
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
  seriesId?: string | null;
  creatorUserId?: string;
  creatorName?: string;
  isSettled: boolean;
  settledByDebtor: boolean;
  settledByCreditor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAnticipate: boolean;
  blockReason?: string;
  settledAt?: string | null;
  originalDate: string;
  accountName?: string;
}

type DBTransaction = Database['public']['Tables']['transactions']['Row'] & {
  category?: { id: string; name: string; icon: string | null; color: string | null } | null;
  transaction_splits?: DBSplit[];
  payer?: { id: string; name: string; user_id: string | null; linked_user_id: string | null } | null;
  currency?: string;
  competence_date?: string | null;
};

type DBSplit = Database['public']['Tables']['transaction_splits']['Row'] & {
  settled_by_debtor: boolean;
  settled_by_creditor: boolean;
};

type DBAccount = Pick<Database['public']['Tables']['accounts']['Row'], 'id' | 'type' | 'closing_day' | 'due_day' | 'user_id' | 'name'>;

export const calculateSharedDisplayDate = (
  transactionDate: string, 
  competenceDate: string | null,
  accountId: string | null, 
  accounts: DBAccount[],
  family?: any
): string => {
  if (!competenceDate) {
    return transactionDate;
  }
  
  if (!accountId) {
    return competenceDate;
  }

  const account = accounts.find(a => a.id === accountId);
  if (!account) return competenceDate;
  
  if (account.type !== 'CREDIT_CARD') {
    const closingMonth = dateUtils.parseDate(competenceDate);
    let dueMonth = closingMonth.getMonth() + 1;
    let dueYear = closingMonth.getFullYear();
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear++;
    }
    const dueDate = new Date(Date.UTC(dueYear, dueMonth, 1));
    return dateUtils.getCompetenceDate(dueDate);
  }

  let closingDay = account.closing_day || 1;
  let dueDay = account.due_day || 10;

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
  
  const dueDate = new Date(Date.UTC(dueYear, dueMonth, 1));
  return dateUtils.getCompetenceDate(dueDate);
};

export const generateInvoices = (
  transactions: DBTransaction[],
  accounts: DBAccount[],
  paidByOthersTransactions: DBTransaction[],
  members: Record<string, any>[],
  userId: string | undefined,
  profile?: any,
  family?: any
): Record<string, InvoiceItem[]> => {
  const invoiceMap: Record<string, InvoiceItem[]> = {};
  const processedTxIds = new Set<string>();
  
  const myMemberId = members.find(m => m.linked_user_id === userId)?.id;

  members.forEach(m => {
    invoiceMap[m.id] = [];
  });

  transactions.forEach(tx => {
    if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
    
    const isRefund = tx.type === 'INCOME';
    const splits = tx.transaction_splits || [];
    const txCurrency = tx.currency || 'BRL';

    const isMeTheRealCreditor = (tx.user_id === userId && !tx.payer_id) || 
                                (tx.payer_id === myMemberId && tx.payer_id != null);

    if (isMeTheRealCreditor) {
      splits.forEach((split) => {
        const memberId = split.member_id;
        if (!memberId || memberId === myMemberId) return;
        
        const uniqueKey = `${tx.id}-credit-${memberId}`;
        if (processedTxIds.has(uniqueKey)) return;
        processedTxIds.add(uniqueKey);
        
        const member = members.find(m => m.id === memberId);
        const creator = members.find(m => m.linked_user_id === tx.user_id);
        const creatorName = creator?.name || (tx.user_id === userId ? 'Você' : 'Outro membro');
        
        if (!invoiceMap[memberId]) invoiceMap[memberId] = [];
        
        const settlementStatus = SettlementValidator.getSettlementStatus(
          { id: tx.id, user_id: tx.user_id, is_settled: tx.is_settled || false },
          split as unknown as TransactionSplit
        );
        
        const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts, profile, family);
        
        invoiceMap[memberId].push({
          id: uniqueKey,
          originalTxId: tx.id,
          splitId: split.id,
          description: tx.description,
          date: displayDate,
          category: tx.category?.name,
          amount: isRefund ? -split.amount : split.amount,
          type: isRefund ? 'DEBIT' : 'CREDIT',
          isPaid: split.is_settled === true || split.settled_by_creditor === true,
          tripId: tx.trip_id || undefined,
          memberId: memberId,
          memberName: member?.name || split.name,
          currency: txCurrency,
          installmentNumber: tx.current_installment,
          totalInstallments: tx.total_installments,
          seriesId: tx.series_id,
          creatorUserId: tx.user_id,
          creatorName: creatorName,
          isSettled: split.is_settled === true,
          settledByDebtor: split.settled_by_debtor || false,
          settledByCreditor: split.settled_by_creditor || false,
          canEdit: settlementStatus.canEdit,
          canDelete: settlementStatus.canDelete,
          canAnticipate: settlementStatus.canAnticipate,
          blockReason: settlementStatus.blockReason,
          settledAt: split.settled_at,
          originalDate: tx.date,
          accountName: accounts.find(a => a.id === tx.account_id)?.name,
        });
      });
    } else {
      const mySplit = splits.find((s) => s.member_id === myMemberId);
      if (mySplit) {
        const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
        if (creatorMember) {
          const uniqueKey = `${tx.id}-debit-${creatorMember.id}`;
          if (!processedTxIds.has(uniqueKey)) {
            processedTxIds.add(uniqueKey);
            if (!invoiceMap[creatorMember.id]) invoiceMap[creatorMember.id] = [];
            
            const settlementStatus = SettlementValidator.getSettlementStatus(
              { id: tx.id, user_id: tx.user_id, is_settled: tx.is_settled || false },
              { ...mySplit, member_id: mySplit.member_id || "" } as unknown as TransactionSplit
            );
            
            const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts, profile, family);
            
            invoiceMap[creatorMember.id].push({
              id: uniqueKey,
              originalTxId: tx.id,
              splitId: mySplit.id,
              description: tx.description,
              date: displayDate,
              category: tx.category?.name,
              amount: mySplit.amount,
              type: 'DEBIT',
              isPaid: mySplit.is_settled === true || mySplit.settled_by_debtor === true,
              tripId: tx.trip_id || undefined,
              memberId: creatorMember.id,
              memberName: creatorMember.name,
              currency: txCurrency,
              installmentNumber: tx.current_installment,
              totalInstallments: tx.total_installments,
              seriesId: tx.series_id,
              creatorUserId: tx.user_id,
              creatorName: creatorMember.name,
              isSettled: mySplit.is_settled === true,
              settledByDebtor: mySplit.settled_by_debtor || false,
              settledByCreditor: mySplit.settled_by_creditor || false,
              canEdit: settlementStatus.canEdit,
              canDelete: settlementStatus.canDelete,
              canAnticipate: settlementStatus.canAnticipate,
              blockReason: settlementStatus.blockReason,
              settledAt: mySplit.settled_at,
              originalDate: tx.date,
              accountName: accounts.find(a => a.id === tx.account_id)?.name,
            });
          }
        }
      }
    }
  });

  paidByOthersTransactions.forEach((tx) => {
    if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
    const isRefund = tx.type === 'INCOME';
    const txCurrency = tx.currency || 'BRL';
    const payer = tx.payer;
    if (!payer) return;
    const targetMemberId = payer.id;
    
    const uniqueKey = `${tx.id}-debit-${targetMemberId}`;
    if (processedTxIds.has(uniqueKey)) return;
    processedTxIds.add(uniqueKey);
    
    if (!invoiceMap[targetMemberId]) invoiceMap[targetMemberId] = [];
    const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts, profile, family);
    
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
      creatorName: payer.name,
      isSettled: tx.is_settled === true,
      settledByDebtor: false,
      settledByCreditor: false,
      canEdit: !tx.is_settled,
      canDelete: !tx.is_settled,
      canAnticipate: !tx.is_settled,
      blockReason: tx.is_settled ? 'Esta transação já foi acertada e não pode ser modificada' : undefined,
      settledAt: tx.settled_at,
      originalDate: tx.date,
      accountName: accounts.find(a => a.id === tx.account_id)?.name,
    });
  });

  transactions.forEach(tx => {
    if (tx.is_shared) return;
    if (tx.domain !== 'SHARED') return;
    if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
    
    const txCurrency = tx.currency || 'BRL';

    if (tx.related_member_id) {
      const isPayerMe = tx.user_id === userId;
      const targetMemberId = tx.related_member_id;
      
      if (isPayerMe) {
        const uniqueKey = `${tx.id}-credit-${targetMemberId}`;
        if (!processedTxIds.has(uniqueKey)) {
          processedTxIds.add(uniqueKey);
          const member = members.find(m => m.id === targetMemberId);
          const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts, profile, family);
          if (!invoiceMap[targetMemberId]) invoiceMap[targetMemberId] = [];
          
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
            originalDate: tx.date,
            accountName: accounts.find(a => a.id === tx.account_id)?.name,
          });
        }
      } else {
        const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
        if (creatorMember) {
          const uniqueKey = `${tx.id}-debit-${creatorMember.id}`;
          if (!processedTxIds.has(uniqueKey)) {
            processedTxIds.add(uniqueKey);
            const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts, profile, family);
            if (!invoiceMap[creatorMember.id]) invoiceMap[creatorMember.id] = [];
            
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
              originalDate: tx.date,
              accountName: accounts.find(a => a.id === tx.account_id)?.name,
            });
          }
        }
      }
    } else if (tx.description?.includes('Acerto') || tx.description?.includes('acerto') || tx.is_settled) {
      const isCreatorMe = tx.user_id === userId;
      const otherMember = members.find(m => m.linked_user_id !== userId);
      
      if (otherMember) {
        const targetMemberId = otherMember.id;
        const uniqueKey = `${tx.id}-${tx.type === 'INCOME' ? 'credit' : 'debit'}-${targetMemberId}`;
        
        if (!processedTxIds.has(uniqueKey)) {
          processedTxIds.add(uniqueKey);
          const displayDate = calculateSharedDisplayDate(tx.date, tx.competence_date, tx.account_id, accounts, profile, family);
          if (!invoiceMap[targetMemberId]) invoiceMap[targetMemberId] = [];
          
          invoiceMap[targetMemberId].push({
            id: uniqueKey,
            originalTxId: tx.id,
            description: tx.description,
            date: displayDate,
            category: 'Acerto',
            amount: Number(tx.amount),
            type: tx.type === 'EXPENSE' ? 'CREDIT' : 'DEBIT',
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
            originalDate: tx.date,
            accountName: accounts.find(a => a.id === tx.account_id)?.name,
          });
        }
      }
    }
  });

  return invoiceMap;
};
