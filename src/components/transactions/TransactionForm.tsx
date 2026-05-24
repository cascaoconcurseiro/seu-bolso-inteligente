import { useState, useEffect, useMemo } from 'react';
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
import { useCategoryPrediction } from '@/hooks/useCategoryPrediction';
import { CategoryPredictionService } from '@/services/categoryPredictionService';
import { logger } from '@/utils/logger';

// Refactored Sub-components
import { AmountInput } from './form/AmountInput';
import { BasicInfoSection } from './form/BasicInfoSection';
import { TripSelector } from './form/TripSelector';
import { AccountSelector } from './form/AccountSelector';
import { AdvancedOptions } from './form/AdvancedOptions';


interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: unknown;
  context?: {
    tripId?: string;
    accountId?: string;
    categoryId?: string;
  };
}

export function TransactionForm({ onSuccess, onCancel, context, initialData }: TransactionFormProps) {
  const navigate = useNavigate();
  const { setShowTransactionModal } = useTransactionModal();
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesHierarchical();
  const { data: trips } = useTrips();
  const { data: familyMembers = [] } = useFamilyMembers();
  const myMemberRecord = useMemo(() => {
    return (familyMembers || []).find(m => m.linked_user_id === user?.id);
  }, [familyMembers, user?.id]);
  const { data: allTransactions = [] } = useTransactions();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const createDefaultCategories = useCreateDefaultCategories();

  // Form State
  const [activeTab, setActiveTab] = useState<TabType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tripId, setTripId] = useState('');
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [destinationAmount, setDestinationAmount] = useState('');

  const predictionType = useMemo(() => {
    if (activeTab === 'INCOME') return 'income';
    if (activeTab === 'EXPENSE') return 'expense';
    return null;
  }, [activeTab]);

  const { prediction } = useCategoryPrediction(
    description,
    (predictionType as any) || 'expense',
    !!predictionType
  );

  // Context application
  useEffect(() => {
    if (context?.tripId) setTripId(context.tripId);
    if (context?.accountId) setAccountId(context.accountId);
    if (context?.categoryId) setCategoryId(context.categoryId);
  }, [context]);

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

  // Populate from initialData when editing
  useEffect(() => {
    if (initialData) {
      const tx = initialData as any;
      setActiveTab(tx.type || 'EXPENSE');
      setAmount(tx.amount ? String(Math.abs(tx.amount)) : '');
      setDescription(tx.description || '');
      setDate(tx.date ? new Date(tx.date + 'T12:00:00') : new Date());
      setAccountId(tx.account_id || '');
      setDestinationAccountId(tx.destination_account_id || '');
      setCategoryId(tx.category_id || '');
      setTripId(tx.trip_id || '');
      setNotes(tx.notes || '');
      setExchangeRate(tx.exchange_rate ? String(tx.exchange_rate) : '');
      setDestinationAmount(tx.destination_amount ? String(tx.destination_amount) : '');
      
      // Advanced options
      setIsInstallment(tx.is_installment || false);
      setTotalInstallments(tx.total_installments || (tx.is_installment ? 2 : 1));
      setIsRefund(tx.is_refund || false);
      setIsRecurring(tx.is_recurring || false);
      if (tx.frequency) {
        setFrequency(tx.frequency);
      }
      if (tx.recurrence_day) {
        setRecurrenceDay(tx.recurrence_day);
      }
      
      // Splits
      if (tx.transaction_splits && tx.transaction_splits.length > 0) {
        const mappedSplits = tx.transaction_splits.map((s: any) => ({
          memberId: s.member_id,
          percentage: s.percentage,
        }));
        setSplits(mappedSplits);
        setPayerId(tx.payer_id || 'me');
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
      const numericAmount = parseFloat(amount) || 0;
      if (!description || numericAmount === 0 || !date) {
        setDuplicateWarning(false);
        return;
      }
      const hasDuplicate = allTransactions.some((tx) => {
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
  }, [amount, description, date, activeTab, allTransactions]);

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

  // Limpar divisões de gastos (splits) se o pagador mudar para evitar dados inconsistentes
  useEffect(() => {
    setSplits([]);
  }, [payerId]);

  const creditCards = (accounts || []).filter((a) => a.type === 'CREDIT_CARD');
  const transferAccounts = (accounts || []).filter((a) => a.type !== 'CREDIT_CARD');
  const isCreditCard = creditCards.some((c) => c.id === accountId);
  const isExpense = activeTab === 'EXPENSE';
  const selectedTrip = trips?.find((t) => t.id === tripId);
  const hasSharing = splits.length > 0 || (payerId !== 'me' && payerId !== '');
  const isPaidByOther = payerId !== 'me' && payerId !== '';
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const selectedDestAccount = accounts?.find((a) => a.id === destinationAccountId);
  
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
    const numAmount = parseFloat(amount);
    const numDest = parseFloat(val);
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
      const numAmount = parseFloat(amount);
      const numDest = parseFloat(destinationAmount);
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
    if (initialData && (initialData as any).id) {
      await updateTransaction.mutateAsync({
        id: (initialData as any).id,
        ...transactionData,
      } as any);
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
    if (onSuccess) onSuccess(); else navigate('/transacoes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setValidationWarnings([]);
    const numericAmount = parseFloat(amount) || 0;
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

    if (tripId && selectedTrip && selectedAccount) {
      if (selectedAccount.currency !== selectedTrip.currency) {
        if (!destinationAmount || parseFloat(destinationAmount) <= 0) {
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

    const transactionData: CreateTransactionInput = {
      amount: numericAmount,
      description: description.trim(),
      date: format(date, 'yyyy-MM-dd'),
      competence_date: format(date, 'yyyy-MM-01'),
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
      exchange_rate: showExchangePanel && exchangeRate ? parseFloat(exchangeRate) : undefined,
      destination_amount: showExchangePanel && destinationAmount ? parseFloat(destinationAmount) : undefined,
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
      transactionData as any,
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

  if (accountsLoading || categoriesLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!accounts || accounts.length === 0) return <div className="max-w-lg mx-auto text-center py-16 space-y-4"><div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center"><ArrowDownLeft className="h-8 w-8 text-muted-foreground" /></div><h2 className="text-xl font-semibold">Nenhuma conta encontrada</h2><p className="text-muted-foreground">Crie uma conta para começar</p><Button type="button" onClick={(e) => { e.preventDefault(); setShowTransactionModal(false); navigate('/contas'); }}>Criar Conta</Button></div>;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onCancel ? onCancel() : navigate(-1)} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-display font-bold text-2xl tracking-tight">{initialData ? 'Editar Transação' : 'Nova Transação'}</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-muted">
        {(['EXPENSE', 'INCOME', 'TRANSFER'] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[10px] font-medium transition-all',
              activeTab === tab
                ? tab === 'EXPENSE'
                  ? 'bg-background text-destructive shadow-sm'
                  : tab === 'INCOME'
                  ? 'bg-background text-positive shadow-sm'
                  : 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'EXPENSE' && <ArrowUpRight className="h-4 w-4" />}
            {tab === 'INCOME' && <ArrowDownLeft className="h-4 w-4" />}
            {tab === 'TRANSFER' && <ArrowRightLeft className="h-4 w-4" />}
            
            {tab === 'EXPENSE' && 'Despesa'}
            {tab === 'INCOME' && 'Receita'}
            {tab === 'TRANSFER' && 'Transf.'}
          </button>
        ))}
      </div>

      {duplicateWarning && <Alert className="border-destructive/50 bg-destructive/10 animate-pulse"><BellRing className="h-4 w-4 text-destructive" /><AlertDescription className="text-destructive font-medium">⚠️ Possível transação duplicada detectada!</AlertDescription></Alert>}
      {validationErrors.length > 0 && <Alert className="border-destructive bg-destructive/10"><BellRing className="h-4 w-4 text-destructive" /><AlertDescription><p className="font-semibold text-destructive mb-2">Corrija os erros:</p><ul className="list-disc list-inside space-y-1 text-sm text-destructive">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul></AlertDescription></Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <AmountInput amount={amount} onAmountChange={setAmount} currency={transactionCurrency} currencySymbol={getCurrencySymbol(transactionCurrency)} activeTab={activeTab} selectedTrip={selectedTrip} />
        <BasicInfoSection description={description} setDescription={setDescription} date={date} setDate={setDate} categoryId={categoryId} setCategoryId={setCategoryId} activeTab={activeTab} categories={categories || []} categoriesLoading={categoriesLoading} selectedTrip={selectedTrip} prediction={prediction} />
        
        {isExpense && <TripSelector tripId={tripId} setTripId={setTripId} trips={trips || []} />}
        
        <AccountSelector accountId={accountId} setAccountId={setAccountId} activeTab={activeTab} destinationAccountId={destinationAccountId} setDestinationAccountId={setDestinationAccountId} filteredAccounts={filteredAccounts} transferAccounts={transferAccounts} selectedTrip={selectedTrip} selectedAccount={selectedAccount} isPaidByOther={isPaidByOther} payerName={payerId !== 'me' ? (familyMembers || []).find(m => m.id === payerId)?.name || 'outro' : ''} />

        {showExchangePanel && (
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-4 animate-slide-in shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                🌍
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight text-foreground">Operação de Câmbio Detectada</p>
                <p className="text-xs text-muted-foreground">
                  {isCrossCurrencyTripExpense 
                    ? `Despesa na Viagem: ${selectedAccount?.currency} pagando ${selectedTrip?.currency}`
                    : `Transferência de ${selectedAccount?.currency} para ${selectedDestAccount?.currency}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  {isCrossCurrencyTripExpense ? `Valor na Viagem (${selectedTrip?.currency})` : `Valor Recebido (${selectedDestAccount?.currency})`}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                    {getCurrencySymbol(isCrossCurrencyTripExpense ? (selectedTrip?.currency || 'USD') : (selectedDestAccount?.currency || 'USD'))}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={destinationAmount}
                    onChange={(e) => handleDestAmountChange(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-70">
                <Label className="text-xs font-semibold text-foreground">Taxa de Câmbio Efetiva</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[10px] text-muted-foreground font-semibold">
                    {selectedAccount?.currency}/{isCrossCurrencyTripExpense ? selectedTrip?.currency : selectedDestAccount?.currency}
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="0.0000"
                    value={exchangeRate}
                    readOnly
                    className="w-full h-11 pl-16 pr-3 rounded-xl border border-border bg-muted text-sm font-medium focus:outline-none shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-normal">
              💡 Digite apenas o valor exato que chegou no destino. O sistema irá calcular automaticamente a taxa de câmbio efetiva (incluindo spread, IOF e outras taxas) baseada no valor de origem de {getCurrencySymbol(selectedAccount?.currency || 'BRL')} {parseFloat(amount || '0').toFixed(2)}.
            </p>
          </div>
        )}

        {isExpense && isCreditCard && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 animate-slide-in">
            <Label className="font-medium text-sm">Parcelas (Cartão de Crédito)</Label>
            <Select
              value={totalInstallments.toString()}
              onValueChange={(v) => {
                const val = parseInt(v);
                setTotalInstallments(val);
                setIsInstallment(val > 1);
              }}
            >
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Selecione o parcelamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x de {getCurrencySymbol(transactionCurrency)} {(parseFloat(amount) || 0).toFixed(2).replace('.', ',')} (À vista)</SelectItem>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}x de {getCurrencySymbol(transactionCurrency)}{' '}
                    {((parseFloat(amount) || 0) / n).toFixed(2).replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A despesa será lançada no cartão e dividida nos meses do ciclo de faturas correspondente.
            </p>
          </div>
        )}

        {isExpense && availableMembers.length > 0 && (
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Dividir despesa</p><p className="text-sm text-muted-foreground">{hasSharing ? `${splits.length} pessoa(s) · ${payerId !== 'me' ? 'Outro pagou' : 'Eu paguei'}` : tripId ? 'Compartilhar com membros da viagem' : 'Compartilhar com família'}</p></div></div>
              <Button type="button" variant={hasSharing ? 'default' : 'outline'} size="sm" onClick={() => setShowSplitModal(true)}>{hasSharing ? 'Editar' : 'Dividir'}</Button>
            </div>
            {hasSharing && splits.length > 0 && <p className="text-sm text-primary">Cada pessoa paga: {getCurrencySymbol(transactionCurrency)} {((parseFloat(amount) || 0) * splits[0].percentage / 100).toFixed(2)}</p>}
          </div>
        )}

        <AdvancedOptions isExpense={isExpense} isCreditCard={isCreditCard} isInstallment={isInstallment} setIsInstallment={setIsInstallment} totalInstallments={totalInstallments} setTotalInstallments={setTotalInstallments} isRefund={isRefund} setIsRefund={setIsRefund} isRecurring={isRecurring} setIsRecurring={setIsRecurring} frequency={frequency} setFrequency={setFrequency} recurrenceDay={recurrenceDay} setRecurrenceDay={setRecurrenceDay} enableNotification={enableNotification} setEnableNotification={setEnableNotification} notificationDate={notificationDate} setNotificationDate={setNotificationDate} currencySymbol={getCurrencySymbol(transactionCurrency)} numericAmount={parseFloat(amount) || 0} />

        <div className="space-y-2"><Label>Observações (opcional)</Label><Textarea placeholder="Alguma anotação..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>

        <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={createTransaction.isPending}>{createTransaction.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar'}</Button>
      </form>

      <SplitModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        onConfirm={(s) => { setSplits(s); setShowSplitModal(false); }}
        payerId={payerId}
        setPayerId={setPayerId}
        splits={splits}
        setSplits={setSplits}
        familyMembers={familyMembers}
        activeAmount={parseFloat(amount) || 0}
        onNavigateToFamily={() => navigate('/familia')}
        isInstallment={isInstallment}
        setIsInstallment={setIsInstallment}
        totalInstallments={totalInstallments}
        setTotalInstallments={setTotalInstallments}
        currentUserName={(familyMembers || []).find(m => m.linked_user_id === user?.id)?.name || 'Eu'}
        currentUserMemberId={myMemberRecord?.id}
      />

      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><BellRing className="h-5 w-5 text-amber-600" /></div><div><h3 className="font-semibold text-lg mb-2">Atenção</h3><p className="text-sm text-muted-foreground mb-3">Detectamos avisos. Continuar?</p><ul className="list-disc list-inside space-y-1 text-sm text-amber-600">{validationWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div></div>
            <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => { setShowWarningModal(false); setPendingSubmit(null); }}>Cancelar</Button><Button className="flex-1" onClick={async () => { setShowWarningModal(false); if (pendingSubmit) await performSubmit(pendingSubmit as any); }}>Continuar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
