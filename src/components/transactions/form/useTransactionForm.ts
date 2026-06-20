import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Wallet,
  Landmark,
  BellRing,
} from 'lucide-react';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { SplitModal } from './SplitModal';
import { TransactionSplitData, TabType } from '@/types/transactions';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAccounts } from '@/hooks/useAccounts';
import { useGoals } from '@/hooks/useGoals';
import { useCategoriesHierarchical, useCreateDefaultCategories } from '@/hooks/useCategories';
import {
  useCreateTransaction,
  useUpdateTransaction,
  useTransactions,
  TransactionType,
  CreateTransactionInput,
} from '@/hooks/useTransactions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrips } from '@/hooks/useTrips';
import { useFamilyMembers } from '@/hooks/useFamily';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { validateTransaction } from '@/services/validationService';
import { useAIPrediction } from '@/hooks/useAIPrediction';
import { logger } from '@/utils/logger';
import { haptics } from '@/utils/haptics';
import { useTransactionStore } from '@/store/useTransactionStore';

import { moneyUtils } from "@/utils/money";

interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
  context?: {
    tripId?: string;
    accountId?: string;
    categoryId?: string;
  };
}

export function useTransactionForm({ onSuccess, onCancel, context, initialData }: TransactionFormProps) {
  const navigate = useNavigate();
  const { setShowTransactionModal } = useTransactionModal();
  const { user } = useAuth();
  const { contributeToGoal, goals } = useGoals();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesHierarchical();
  const { data: trips } = useTrips();
  const { data: familyMembers = [], isLoading: membersLoading } = useFamilyMembers();
  const myMemberRecord = useMemo(() => {
    return (familyMembers || []).find(m => m.linked_user_id === user?.id);
  }, [familyMembers, user?.id]);
  const { data: allTransactions = [] } = useTransactions();
  const createTransaction = useCreateTransaction();
  const createDefaultCategories = useCreateDefaultCategories();

  // Zustand Store Integration
  const store = useTransactionStore();
  
  const activeTab = store.activeTab;
  const amount = store.amount;
  const description = store.description;
  const date = store.date;
  const accountId = store.accountId;
  const destinationAccountId = store.destinationAccountId;
  const categoryId = store.categoryId;
  const tripId = store.tripId;
  const notes = store.notes;
  const exchangeRate = store.exchangeRate;
  const destinationAmount = store.destinationAmount;
  
  const isInstallment = store.isInstallment;
  const totalInstallments = store.totalInstallments;
  const showSplitModal = store.showSplitModal;
  const payerId = store.payerId;
  const splits = store.splits;
  const isRefund = store.isRefund;
  const isRecurring = store.isRecurring;
  const frequency = store.frequency;
  const recurrenceDay = store.recurrenceDay;
  const enableNotification = store.enableNotification;
  const notificationDate = store.notificationDate;

  const transferType = store.transferType;
  const goalId = store.goalId;

  const lastAppliedCategoryIdRef = useRef<string | null>(null);

  const predictionType = useMemo(() => {
    if (activeTab === 'INCOME') return 'income';
    if (activeTab === 'EXPENSE') return 'expense';
    return null;
  }, [activeTab]);

  const { suggestion, predictedCategoryId, isPredicting } = useAIPrediction(
    description,
    predictionType || 'expense',
    !!predictionType
  );

  // Context application
  useEffect(() => {
    if (context?.tripId) store.setTripId(context.tripId);
    if (context?.accountId) store.setAccountId(context.accountId);
    if (context?.categoryId) store.setCategoryId(context.categoryId);
  }, [context, store]);

  // Resetar a escolha manual se o usuário limpar a descrição para nova digitação
  useEffect(() => {
    if (description.trim() === '') {
      lastAppliedCategoryIdRef.current = null;
    }
  }, [description]);

  // AI Auto-categoria inteligente e blindada contra race conditions
  useEffect(() => {
    if (predictedCategoryId) {
      const isCurrentCategoryFromAI = categoryId === lastAppliedCategoryIdRef.current;
      
      if (!store.hasUserSelectedCategoryManually || isCurrentCategoryFromAI) {
        store.setCategoryId(predictedCategoryId);
        lastAppliedCategoryIdRef.current = predictedCategoryId;
        store.setHasUserSelectedCategoryManually(false);
      }
    }
  }, [predictedCategoryId, store.hasUserSelectedCategoryManually, categoryId, store]);

  const handleCategoryChange = (val: string) => {
    store.setCategoryId(val);
    store.setHasUserSelectedCategoryManually(true);
  };

  const { data: tripMembers = [] } = useTripMembers(tripId || null);

  useEffect(() => {
    if (context?.accountId && context?.tripId === tripId) return;
    store.setAccountId('');
  }, [tripId, context?.accountId, context?.tripId, store]);

  const updateTransaction = useUpdateTransaction();

  // Populate from initialData
  useEffect(() => {
    if (initialData && typeof initialData === 'object' && Object.keys(initialData).length > 0) {
      store.initFromData(initialData);
    }
  }, [initialData, store]);

  // Validation & Warnings
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<unknown>(null);

  // Default Categories Check
  const [categoriesChecked, setCategoriesChecked] = useState(false);
  useEffect(() => {
    if (!categoriesLoading && !categoriesChecked) {
      setCategoriesChecked(true);
      if (categories?.length === 0) createDefaultCategories.mutate();
    }
  }, [categoriesLoading, categoriesChecked, categories?.length, createDefaultCategories]);

  // Duplicate detection
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
        if (initialData && tx.id === initialData.id) return false;
        if (initialData && initialData.series_id && tx.series_id === initialData.series_id) return false;
        if (tx.type !== activeTab) return false;
        const amountMatch = Math.abs(tx.amount - numericAmount) < 0.01;
        const descMatch = tx.description.toLowerCase().includes(description.toLowerCase().trim()) ||
          description.toLowerCase().trim().includes(tx.description.toLowerCase());
        const txDate = typeof tx.date === 'string' ? parseISO(tx.date) : tx.date;
        const daysDiff = Math.abs(differenceInDays(txDate, date));
        return amountMatch && descMatch && daysDiff <= 3;
      });
      setDuplicateWarning(hasDuplicate);
    }, 500);
    return () => clearTimeout(handler);
  }, [amount, description, date, activeTab, allTransactions, initialData]);

  // Available Members logic
  const availableMembers = useMemo(() => {
    // If it's a trip
    if (tripId && tripMembers && tripMembers.length > 0) {
      const payerUserId = payerId === 'me' ? user?.id : payerId;
      return tripMembers
        .filter(tm => tm.user_id !== payerUserId)
        .map(tm => ({
          id: tm.user_id,
          name: tm.profiles?.full_name || tm.profiles?.email || 'Membro',
          linked_user_id: tm.user_id,
          role: 'viewer' as const,
          status: 'active' as const,
        }));
    }
    
    // If it's family
    const familyMembersList = familyMembers || [];
    const payerMemberId = payerId === 'me' ? myMemberRecord?.id : payerId;
    
    return familyMembersList.filter(m => m.id !== payerMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, tripMembers, familyMembers, user?.id, payerId]);

  // A limpeza automática de splits (setSplits([])) quando o payerId mudava 
  // foi removida pois apagava os splits recém-carregados na edição. O UX no modal 
  // lida bem com a manutenção dos splits caso o usuário troque "Eu Paguei" / "Outro Pagou".

  const creditCards = (accounts || []).filter((a) => a.type === 'CREDIT_CARD');
  const transferAccounts = (accounts || []).filter((a) => a.type !== 'CREDIT_CARD');
  const isCreditCard = creditCards.some((c) => c.id === accountId);
  const isExpense = activeTab === 'EXPENSE';
  const selectedTrip = trips?.find((t) => t.id === tripId);
  const hasSharing = splits.length > 0 || (payerId !== 'me' && payerId !== '');
  const isPaidByOther = !membersLoading && payerId !== 'me' && payerId !== '' && payerId !== myMemberRecord?.id && payerId !== user?.id;
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const selectedDestAccount = accounts?.find((a) => a.id === destinationAccountId);

  // Corrigir payerId vindo do banco caso seja o próprio usuário
  useEffect(() => {
    if (payerId === user?.id) {
      store.setPayerId('me');
    } else if (myMemberRecord?.id && payerId === myMemberRecord.id) {
      store.setPayerId('me');
    }
  }, [user?.id, myMemberRecord?.id, payerId, store]);
  
  const isExchangeTransfer = activeTab === 'TRANSFER' && 
    selectedAccount && 
    selectedDestAccount && 
    selectedAccount.currency !== selectedDestAccount.currency;

  const isCrossCurrencyTripExpense = isExpense &&
    selectedTrip &&
    selectedAccount &&
    selectedAccount.currency !== selectedTrip.currency;

  const showExchangePanel = isExchangeTransfer || isCrossCurrencyTripExpense;

  const handleDestAmountChange = (val: string) => {
    store.setDestinationAmount(val);
    const numAmount = moneyUtils.parse(amount);
    const numDest = moneyUtils.parse(val);
    if (numAmount > 0 && numDest > 0) {
      const computedRate = (numAmount / numDest).toFixed(4);
      store.setExchangeRate(computedRate);
    } else {
      store.setExchangeRate('');
    }
  };

  // Se o amount de origem mudar, recalcular a taxa de câmbio
  useEffect(() => {
    if (showExchangePanel) {
      const numAmount = moneyUtils.parse(amount);
      const numDest = moneyUtils.parse(destinationAmount);
      if (numAmount > 0 && numDest > 0) {
        const computedRate = (numAmount / numDest).toFixed(4);
        store.setExchangeRate(computedRate);
      } else {
        store.setExchangeRate('');
      }
    }
  }, [amount, showExchangePanel, destinationAmount, store]);

  // Limpar contas caso não aplicável
  useEffect(() => {
    if (isPaidByOther) store.setAccountId('');
  }, [isPaidByOther, store]);

  // Limpar conta selecionada se mudar para receita e for um cartão de crédito
  useEffect(() => {
    if (activeTab === 'INCOME' && selectedAccount?.type === 'CREDIT_CARD') {
      store.setAccountId('');
    }
  }, [activeTab, selectedAccount, store]);

  const transactionCurrency = selectedTrip?.currency || (selectedAccount?.is_international ? selectedAccount.currency : null) || 'BRL';

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      if (activeTab === 'INCOME' && acc.type === 'CREDIT_CARD') {
        return false;
      }
      if ((activeTab === 'INCOME' || activeTab === 'EXPENSE') && (acc.type === 'INVESTMENT' || acc.type === 'EMERGENCY_FUND')) {
        return false;
      }
      if (activeTab === 'TRANSFER') {
        return true;
      }
      if (selectedTrip) {
        if (selectedTrip.currency === 'BRL') return !acc.is_international;
        return acc.is_international && acc.currency === selectedTrip.currency;
      }
      return !acc.is_international;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, accountId, selectedTrip, activeTab]);

  useEffect(() => {
    if (accountId && filteredAccounts && filteredAccounts.length > 0) {
      const isAccountValid = filteredAccounts.some(acc => acc.id === accountId);
      if (!isAccountValid) {
        store.setAccountId('');
      }
    }
  }, [filteredAccounts, accountId, store]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { 'BRL': 'R$', 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥' };
    return symbols[currency] || currency;
  };

  const performSubmit = async (transactionData: CreateTransactionInput) => {
    if (initialData && initialData.id) {
      await updateTransaction.mutateAsync({ ...transactionData, id: initialData.id });
    } else {
      await createTransaction.mutateAsync(transactionData);
    }
    
    if (user && categoryId && description && activeTab !== 'TRANSFER') {
      try {
        await CategoryPredictionService.learnFromUser(description, categoryId, user.id, !!(prediction && prediction.categoryId !== categoryId));
      } catch (error) {
        logger.error('Erro ao registrar aprendizado de categoria:', error);
      }
    }
    haptics.success();
    if (onSuccess) onSuccess(); else navigate('/transacoes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setValidationWarnings([]);
    const numericAmount = moneyUtils.parse(amount) || 0;
    const transactionSplits = activeTab === 'EXPENSE' ? splits.map((s) => ({
      member_id: s.memberId,
      percentage: s.percentage,
      amount: Number(((numericAmount * s.percentage) / 100).toFixed(2)),
    })) : [];
    const isShared = transactionSplits.length > 0 || (activeTab === 'EXPENSE' && payerId !== 'me');

    if (isShared && payerId === 'me' && transactionSplits.length === 0) {
      toast.error('Selecione pelo menos um membro para dividir a despesa');
      setShowSplitModal(true);
      return;
    }
    if (numericAmount <= 0) { toast.error('O valor da transação deve ser maior que zero'); return; }
    if (!description.trim()) { toast.error('A descrição é obrigatória'); return; }
    if (activeTab === 'EXPENSE' && !categoryId) { toast.error('A categoria é obrigatória para despesas'); return; }
    if (!accountId && payerId === 'me') { toast.error('A conta de origem é obrigatória'); return; }
    if (activeTab === 'TRANSFER') {
      if (transferType === 'goal') {
        if (!goalId) { toast.error('Selecione uma meta de destino'); return; }
        setPendingSubmit(true);
        contributeToGoal({
          id: goalId,
          amount: numericAmount,
          accountId: accountId,
          description: description || 'Transferência para Meta'
        }, {
          onSuccess: () => {
            setPendingSubmit(false);
            onSuccess?.();
          },
          onError: () => {
            setPendingSubmit(false);
          }
        });
        return;
      }
      if (!destinationAccountId) { toast.error('A conta de destino é obrigatória'); return; }
    }

    if (tripId && selectedTrip && selectedAccount) {
      if (selectedAccount.currency !== selectedTrip.currency) {
        if (!destinationAmount || moneyUtils.parse(destinationAmount) <= 0) {
          toast.error(`Para gastos multi-moeda, informe o valor real na moeda da viagem (${selectedTrip.currency}).`);
          return;
        }
      }
    }

    const resolvedPayerId = (() => {
      if (!isShared && payerId === 'me') return undefined;
      if (payerId !== 'me') return payerId || undefined;
      const me = familyMembers.find(m => m.linked_user_id === user?.id);
      if (me) return me.id;
      const meFallback = familyMembers.find(m => m.name.toLowerCase().includes('wesley') || m.role === 'admin');
      return meFallback?.id;
    })();

    if (isShared && !resolvedPayerId) {
      toast.error('Não foi possível identificar seu perfil de membro na família. Verifique suas configurações.');
      return;
    }

    const isActuallyInstallment = isCreditCard 
      ? totalInstallments > 1 
      : isInstallment && totalInstallments > 1;

    let calculatedCompetenceDate = format(date, 'yyyy-MM-01');
    const isEdit = !!initialData && !!initialData.id;
    const isInstallmentTx = isEdit ? initialData.is_installment : isActuallyInstallment;

    if (isEdit && isInstallmentTx && initialData.competence_date) {
      calculatedCompetenceDate = initialData.competence_date;
    } else if (selectedAccount?.type === 'CREDIT_CARD' && selectedAccount.closing_day) {
      const txDay = date.getDate();
      if (txDay >= selectedAccount.closing_day) {
        // Se a data da compra for >= ao dia de fechamento, a competência é no mês seguinte
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        calculatedCompetenceDate = format(nextMonth, 'yyyy-MM-01');
      }
    }

    const transactionData: CreateTransactionInput = {
      amount: numericAmount,
      description: description.trim(),
      date: format(date, 'yyyy-MM-dd'),
      competence_date: calculatedCompetenceDate,
      type: activeTab as TransactionType,
      account_id: payerId === 'me' ? accountId || undefined : undefined,
      destination_account_id: activeTab === 'TRANSFER' ? destinationAccountId : undefined,
      category_id: categoryId || undefined,
      trip_id: tripId || undefined,
      currency: transactionCurrency,
      domain: tripId ? 'TRAVEL' : isShared ? 'SHARED' : 'PERSONAL',
      is_shared: isShared,
      payer_id: resolvedPayerId,
      is_installment: isActuallyInstallment,
      total_installments: isActuallyInstallment ? totalInstallments : undefined,
      notes: notes || undefined,
      exchange_rate: showExchangePanel && exchangeRate ? moneyUtils.parse(exchangeRate) : undefined,
      destination_amount: showExchangePanel && destinationAmount ? moneyUtils.parse(destinationAmount) : undefined,
      destination_currency: isExchangeTransfer && selectedDestAccount ? selectedDestAccount.currency : (isCrossCurrencyTripExpense && selectedTrip ? selectedTrip.currency : undefined),
      splits: transactionSplits,
      is_refund: isRefund,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency : undefined,
      recurrence_day: isRecurring && frequency === 'MONTHLY' ? recurrenceDay : undefined,
      enable_notification: enableNotification,
      notification_date: enableNotification && notificationDate ? format(notificationDate, 'yyyy-MM-dd') : undefined,
    };

    const validation = validateTransaction(
      { ...transactionData, id: isEdit ? initialData?.id : undefined, series_id: isEdit ? initialData?.series_id : undefined } as Partial<Transaction>,
      selectedAccount,
      accounts?.find(a => a.id === destinationAccountId),
      selectedTrip,
      allTransactions,
      isPaidByOther,
      myMemberRecord?.id,
      user?.id
    );
    if (!validation.isValid) { setValidationErrors(validation.errors); toast.error('Corrija os erros antes de continuar'); return; }
    if (validation.warnings.length > 0) { setValidationWarnings(validation.warnings); setPendingSubmit(transactionData); setShowWarningModal(true); return; }
    await performSubmit(transactionData);
  };

  return {
    navigate,
    setShowTransactionModal,
    user,
    accounts,
    accountsLoading,
    categories,
    categoriesLoading,
    trips,
    familyMembers,
    myMemberRecord,
    allTransactions,
    createTransaction,
    updateTransaction,
    
    ...store,
    
    duplicateWarning,
    validationErrors,
    validationWarnings,
    showWarningModal, setShowWarningModal,
    pendingSubmit, setPendingSubmit,
    
    predictedCategoryId,
    isPredicting,
    
    availableMembers,
    creditCards,
    transferAccounts,
    isCreditCard,
    isExpense,
    selectedTrip,
    hasSharing,
    isPaidByOther,
    selectedAccount,
    selectedDestAccount,
    showExchangePanel,
    isCrossCurrencyTripExpense,
    transactionCurrency,
    filteredAccounts,
    
    handleDestAmountChange,
    getCurrencySymbol,
    handleSubmit,
    performSubmit,
    goals
  };
}
