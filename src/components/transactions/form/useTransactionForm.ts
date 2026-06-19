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
  const [transferType, setTransferType] = useState<'account'|'goal'>('account');
  const [goalId, setGoalId] = useState<string>('');
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

  // Form State
  const [activeTab, setActiveTab] = useState<TabType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [hasUserSelectedCategoryManually, setHasUserSelectedCategoryManually] = useState(false);
  const lastAppliedCategoryIdRef = useRef<string | null>(null);
  const [tripId, setTripId] = useState('');
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [destinationAmount, setDestinationAmount] = useState('');

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

  // Autocompletar a descrição não é mais utilizado conforme regra de negócio

  // Context application
  useEffect(() => {
    if (context?.tripId) setTripId(context.tripId);
    if (context?.accountId) setAccountId(context.accountId);
    if (context?.categoryId) setCategoryId(context.categoryId);
  }, [context]);

  // Resetar a escolha manual se o usuário limpar a descrição para nova digitação
  useEffect(() => {
    if (description.trim() === '') {
      setHasUserSelectedCategoryManually(false);
      lastAppliedCategoryIdRef.current = null;
    }
  }, [description]);

  // AI Auto-categoria inteligente e blindada contra race conditions
  useEffect(() => {
    if (predictedCategoryId) {
      // Se a categoria atual na tela foi colocada pela IA (igual a lastAppliedCategoryIdRef.current) 
      // ou se o usuário ainda não alterou manualmente, podemos atualizar livremente!
      const isCurrentCategoryFromAI = categoryId === lastAppliedCategoryIdRef.current;
      
      if (!hasUserSelectedCategoryManually || isCurrentCategoryFromAI) {
        setCategoryId(predictedCategoryId);
        lastAppliedCategoryIdRef.current = predictedCategoryId;
        // Se foi atualizado pela IA, garante que não seja considerado escolha manual travada
        setHasUserSelectedCategoryManually(false);
      }
    }
  }, [predictedCategoryId, hasUserSelectedCategoryManually, categoryId]);

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    setHasUserSelectedCategoryManually(true);
  };

  const { data: tripMembers = [] } = useTripMembers(tripId || null);

  useEffect(() => {
    if (context?.accountId && context?.tripId === tripId) return;
    setAccountId('');
  }, [tripId, context?.accountId, context?.tripId]);

  // Advanced Options State
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [payerId, setPayerId] = useState<string>('me');
  const [splits, setSplits] = useState<TransactionSplitData[]>([]);
  const [isRefund, setIsRefund] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [recurrenceDay, setRecurrenceDay] = useState(1);
  const [enableNotification, setEnableNotification] = useState(false);
  const [notificationDate, setNotificationDate] = useState<Date | undefined>();

  const updateTransaction = useUpdateTransaction();

  // Populate from initialData
  useEffect(() => {
    if (initialData && typeof initialData === 'object') {
      const data = initialData as any;
      if (data.type) setActiveTab(data.type);
      if (data.amount !== undefined && data.amount !== null) setAmount(data.amount.toString());
      if (data.description) setDescription(data.description);
      if (data.date) setDate(typeof data.date === 'string' ? parseISO(data.date as string) : data.date as Date);
      if (data.account_id) setAccountId(data.account_id);
      if (data.destination_account_id) setDestinationAccountId(data.destination_account_id);
      if (data.category_id) setCategoryId(data.category_id);
      if (data.trip_id) setTripId(data.trip_id);
      if (data.notes) setNotes(data.notes);
      if (data.payer_id) setPayerId(data.payer_id);
      if (data.is_installment) setIsInstallment(data.is_installment);
      if (data.total_installments) setTotalInstallments(data.total_installments);
      
      if (data.transaction_splits && Array.isArray(data.transaction_splits) && data.transaction_splits.length > 0) {
        setSplits(data.transaction_splits.map((s: any) => ({
          memberId: s.member_id || s.memberId,
          percentage: s.percentage,
          amount: s.amount
        })));
      } else if (data.splits && Array.isArray(data.splits) && data.splits.length > 0) {
        setSplits(data.splits.map((s: any) => ({
          memberId: s.member_id || s.memberId,
          percentage: s.percentage,
          amount: s.amount
        })));
      }
    }
  }, [initialData]);

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
      setPayerId('me');
    } else if (myMemberRecord?.id && payerId === myMemberRecord.id) {
      setPayerId('me');
    }
  }, [user?.id, myMemberRecord?.id, payerId]);
  
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
    setDestinationAmount(val);
    const numAmount = moneyUtils.parse(amount);
    const numDest = moneyUtils.parse(val);
    if (numAmount > 0 && numDest > 0) {
      const computedRate = (numAmount / numDest).toFixed(4);
      setExchangeRate(computedRate);
    } else {
      setExchangeRate('');
    }
  };

  // Se o amount de origem mudar, recalcular a taxa de câmbio
  useEffect(() => {
    if (showExchangePanel) {
      const numAmount = moneyUtils.parse(amount);
      const numDest = moneyUtils.parse(destinationAmount);
      if (numAmount > 0 && numDest > 0) {
        const computedRate = (numAmount / numDest).toFixed(4);
        setExchangeRate(computedRate);
      } else {
        setExchangeRate('');
      }
    }
  }, [amount, showExchangePanel, destinationAmount]);

  // Limpar contas caso não aplicável
  useEffect(() => {
    if (isPaidByOther) setAccountId('');
  }, [isPaidByOther]);

  // Limpar conta selecionada se mudar para receita e for um cartão de crédito
  useEffect(() => {
    if (activeTab === 'INCOME' && selectedAccount?.type === 'CREDIT_CARD') {
      setAccountId('');
    }
  }, [activeTab, selectedAccount]);

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
  }, [accounts, accountId, selectedTrip, activeTab]);

  useEffect(() => {
    if (accountId && filteredAccounts && filteredAccounts.length > 0) {
      const isAccountValid = filteredAccounts.some(acc => acc.id === accountId);
      if (!isAccountValid) {
        setAccountId('');
      }
    }
  }, [filteredAccounts, accountId]);

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
    
    activeTab, setActiveTab,
    amount, setAmount,
    description, setDescription,
    date, setDate,
    accountId, setAccountId,
    destinationAccountId, setDestinationAccountId,
    categoryId, handleCategoryChange,
    tripId, setTripId,
    notes, setNotes,
    exchangeRate, setExchangeRate,
    destinationAmount, setDestinationAmount,
    
    isInstallment, setIsInstallment,
    totalInstallments, setTotalInstallments,
    showSplitModal, setShowSplitModal,
    payerId, setPayerId,
    splits, setSplits,
    isRefund, setIsRefund,
    isRecurring, setIsRecurring,
    frequency, setFrequency,
    recurrenceDay, setRecurrenceDay,
    enableNotification, setEnableNotification,
    notificationDate, setNotificationDate,
    
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
    performSubmit
  };
}
