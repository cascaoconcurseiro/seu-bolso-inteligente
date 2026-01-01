import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  RefreshCw,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Plane,
  BellRing,
  RotateCcw,
  Bell,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategoriesHierarchical, useCreateDefaultCategories } from '@/hooks/useCategories';
import {
  useCreateTransaction,
  useTransactions,
  TransactionType,
  TransactionSplit,
} from '@/hooks/useTransactions';
import { useTrips } from '@/hooks/useTrips';
import { useFamilyMembers } from '@/hooks/useFamily';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SplitModal, TransactionSplitData } from './SplitModal';
import { differenceInDays, parseISO } from 'date-fns';
import { validateTransaction } from '@/services/validationService';
import { getBankById } from '@/lib/banks';
import { useCategoryPrediction } from '@/hooks/useCategoryPrediction';
import { CategoryPredictionService } from '@/services/categoryPredictionService';

type TabType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
  context?: {
    tripId?: string;
    accountId?: string;
    categoryId?: string;
  };
}

export function TransactionForm({ onSuccess, onCancel, initialData, context }: TransactionFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, hierarchical, isLoading: categoriesLoading } = useCategoriesHierarchical();
  const { data: trips } = useTrips();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: allTransactions = [] } = useTransactions();
  const createTransaction = useCreateTransaction();
  const createDefaultCategories = useCreateDefaultCategories();

  // Predição automática de categoria
  const { prediction, isLoading: isPredicting } = useCategoryPrediction(
    description,
    activeTab === 'TRANSFER' ? 'expense' : activeTab.toLowerCase() as 'expense' | 'income',
    activeTab !== 'TRANSFER' // Só ativar se não for transferência
  );

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

  // Aplicar contexto inicial se fornecido
  useEffect(() => {
    if (context?.tripId) {
      setTripId(context.tripId);
    }
    if (context?.accountId) {
      setAccountId(context.accountId);
    }
    if (context?.categoryId) {
      setCategoryId(context.categoryId);
    }
  }, [context]);

  // Aplicar sugestão de categoria automaticamente
  useEffect(() => {
    // Só aplicar se:
    // 1. Tem predição
    // 2. Não tem categoria selecionada ainda
    // 3. Não é contexto inicial (que já define categoria)
    if (prediction && !categoryId && !context?.categoryId) {
      setCategoryId(prediction.categoryId);
    }
  }, [prediction, categoryId, context?.categoryId]);

  // Now we can use tripId
  const { data: tripMembers = [] } = useTripMembers(tripId || null);

  // Limpar accountId quando a viagem mudar (moeda pode ser diferente)
  useEffect(() => {
    // Não limpar se é o contexto inicial
    if (context?.accountId && context?.tripId === tripId) return;
    setAccountId('');
  }, [tripId, context?.accountId, context?.tripId]);

  // Parcelamento
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(2);

  // Divisão / Compartilhamento
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [payerId, setPayerId] = useState<string>('me');
  const [splits, setSplits] = useState<TransactionSplitData[]>([]);

  // Reembolso
  const [isRefund, setIsRefund] = useState(false);
  const [refundOfTransactionId, setRefundOfTransactionId] = useState<string>('');

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [recurrenceDay, setRecurrenceDay] = useState(1);

  // Notificações
  const [enableNotification, setEnableNotification] = useState(false);
  const [notificationDate, setNotificationDate] = useState<Date | undefined>();

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<any>(null);

  // Criar categorias padrão se não existirem (apenas uma vez)
  const [categoriesChecked, setCategoriesChecked] = useState(false);

  useEffect(() => {
    if (!categoriesLoading && !categoriesChecked) {
      setCategoriesChecked(true);
      if (categories?.length === 0) {
        createDefaultCategories.mutate();
      }
    }
  }, [categoriesLoading, categoriesChecked, categories?.length, createDefaultCategories]);

  // Detect duplicates (com debounce para performance)
  useEffect(() => {
    // Evitar loop: só executar se temos transações carregadas
    if (!allTransactions || allTransactions.length === 0) {
      setDuplicateWarning(false);
      return;
    }

    const handler = setTimeout(() => {
      const numericAmount = getNumericAmount();
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
        const formDate = typeof date === 'string' ? parseISO(date) : date;
        const daysDiff = Math.abs(differenceInDays(txDate, formDate));
        const dateMatch = daysDiff <= 3;

        return amountMatch && descMatch && dateMatch;
      });

      setDuplicateWarning(hasDuplicate);
    }, 500); // Debounce de 500ms

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, description, date, activeTab]);

  const filteredCategories =
    categories?.filter((c) =>
      activeTab === 'INCOME' ? c.type === 'income' : c.type === 'expense'
    ) || [];

  // Filtrar categorias pai e filhos por tipo
  const filteredParents = hierarchical.parents.filter((c) =>
    activeTab === 'INCOME' ? c.type === 'income' : c.type === 'expense'
  );

  // Membros disponíveis para divisão:
  // - Se tem viagem selecionada: usar membros da viagem (trip_members)
  // - Senão: usar membros da família
  // IMPORTANTE: NUNCA incluir o próprio usuário logado
  const availableMembers = tripId && tripMembers && tripMembers.length > 0
    ? (tripMembers || [])
        .filter(tm => tm.user_id !== user?.id) // Excluir o próprio usuário
        .map(tm => ({
          id: tm.user_id, // Usar user_id como id para compatibilidade
          name: tm.profiles?.full_name || tm.profiles?.email || 'Membro',
          email: tm.profiles?.email || null,
          linked_user_id: tm.user_id,
          family_id: '', // Não relevante para viagens
          user_id: null,
          role: 'viewer' as const,
          status: 'active',
          invited_by: null,
          created_at: tm.created_at,
          updated_at: tm.updated_at,
          avatar_url: null,
          sharing_scope: 'all' as const,
          scope_start_date: null,
          scope_end_date: null,
          scope_trip_id: null,
        }))
    : (familyMembers || []).filter(m => m.linked_user_id !== user?.id); // Excluir o próprio usuário

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const cents = parseInt(numbers) / 100;
    return cents.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setAmount(formatted);
  };

  const getNumericAmount = () => {
    return parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const isLoading = accountsLoading || categoriesLoading;
  const creditCards = (accounts || []).filter((a) => a.type === 'CREDIT_CARD');
  const regularAccounts = (accounts || []).filter((a) => a.type !== 'CREDIT_CARD');
  const allAccounts = accounts || [];
  const isCreditCard = creditCards.some((c) => c.id === accountId);
  const isExpense = activeTab === 'EXPENSE';
  const isIncome = activeTab === 'INCOME';
  const isTransfer = activeTab === 'TRANSFER';

  const selectedTrip = trips?.find((t) => t.id === tripId);
  const hasSharing = splits.length > 0 || (payerId !== 'me' && payerId !== '');
  
  // Desabilitar parcelamento se não for cartão de crédito
  useEffect(() => {
    if (!isCreditCard && isInstallment) {
      setIsInstallment(false);
    }
  }, [accountId, isCreditCard, isInstallment]);
  
  // Verificar se a despesa é paga por outra pessoa
  const isPaidByOther = payerId !== 'me' && payerId !== '';
  
  // Obter nome do pagador para exibição
  const getPayerName = (id: string) => {
    const member = familyMembers.find(m => m.id === id);
    return member?.name || 'outra pessoa';
  };
  
  // Limpar accountId quando payerId mudar para outro
  useEffect(() => {
    if (isPaidByOther) {
      setAccountId('');
    }
  }, [isPaidByOther]);

  // Obter conta selecionada para determinar moeda
  const selectedAccount = accounts?.find((a) => a.id === accountId);

  // Determinar a moeda da transação:
  // 1. Se tem viagem selecionada → usa moeda da viagem
  // 2. Se tem conta internacional selecionada (sem viagem) → usa moeda da conta
  // 3. Caso contrário → BRL
  const transactionCurrency = selectedTrip?.currency 
    || (selectedAccount?.is_international ? selectedAccount.currency : null)
    || 'BRL';
  const isInternationalTransaction = transactionCurrency !== 'BRL';

  // Filtrar contas por moeda:
  // - Se tem viagem: mostrar apenas contas na moeda da viagem
  // - Se NÃO tem viagem: mostrar TODAS as contas (nacionais e internacionais)
  const filteredAccounts = accounts?.filter((acc) => {
    // Se tem viagem selecionada, filtrar por moeda da viagem
    if (selectedTrip) {
      if (selectedTrip.currency === 'BRL') {
        return !acc.is_international;
      }
      return acc.is_international && acc.currency === selectedTrip.currency;
    }
    // Se NÃO tem viagem, mostrar todas as contas
    return true;
  }) || [];

  // Separar cartões e contas regulares filtrados
  const filteredCreditCards = (filteredAccounts || []).filter((a) => a.type === 'CREDIT_CARD');
  const filteredRegularAccounts = (filteredAccounts || []).filter((a) => a.type !== 'CREDIT_CARD');

  // Obter símbolo da moeda
  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      // Brasil
      'BRL': 'R$',
      // Américas
      'USD': '$',
      'CAD': 'C$',
      'MXN': 'MX$',
      'ARS': 'AR$',
      'CLP': 'CL$',
      'COP': 'CO$',
      'PEN': 'S/',
      'UYU': 'UY$',
      // Europa
      'EUR': '€',
      'GBP': '£',
      'CHF': 'CHF',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'TRY': '₺',
      // Ásia e Oceania
      'JPY': '¥',
      'CNY': '¥',
      'HKD': 'HK$',
      'SGD': 'S$',
      'KRW': '₩',
      'INR': '₹',
      'THB': '฿',
      'AUD': 'A$',
      'NZD': 'NZ$',
      // Oriente Médio e África
      'AED': 'د.إ',
      'SAR': '﷼',
      'ILS': '₪',
      'ZAR': 'R',
      'EGP': 'E£',
    };
    return symbols[currency] || currency;
  };

  const buildSplitsForSubmit = (): TransactionSplit[] => {
    console.log('🟢 [TransactionForm] buildSplitsForSubmit chamado. Splits atuais:', splits);
    
    if (splits.length === 0) {
      console.log('🟢 [TransactionForm] Nenhum split para processar');
      return [];
    }
    
    const numericAmount = getNumericAmount();
    console.log('🟢 [TransactionForm] Valor numérico:', numericAmount);

    const result = splits.map((s) => ({
      member_id: s.memberId,
      percentage: s.percentage,
      amount: Number(((numericAmount * s.percentage) / 100).toFixed(2)),
    }));
    
    console.log('🟢 [TransactionForm] Splits processados para submit:', result);
    return result;
  };

  const performSubmit = async (transactionData: any) => {
    await createTransaction.mutateAsync(transactionData);

    // Registrar aprendizado de categoria (se tiver categoria e não for transferência)
    if (user && categoryId && description && activeTab !== 'TRANSFER') {
      const wasCorrection = prediction && prediction.categoryId !== categoryId;
      await CategoryPredictionService.learnFromUser(
        description,
        categoryId,
        user.id,
        wasCorrection
      );
    }

    if (onSuccess) {
      onSuccess();
    } else {
      navigate('/transacoes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🟢 [TransactionForm] handleSubmit iniciado');
    console.log('🟢 [TransactionForm] Estado atual dos splits:', splits);
    console.log('🟢 [TransactionForm] PayerId:', payerId);

    // Limpar erros anteriores
    setValidationErrors([]);
    setValidationWarnings([]);

    const numericAmount = getNumericAmount();
    const transactionSplits = buildSplitsForSubmit();
    const isShared = transactionSplits.length > 0 || payerId !== 'me';

    console.log('🟢 [TransactionForm] Splits processados:', transactionSplits);
    console.log('🟢 [TransactionForm] isShared:', isShared);

    // ✅ VALIDAÇÃO CRÍTICA: Se marcou como compartilhada mas não tem splits
    if (isShared && payerId === 'me' && transactionSplits.length === 0) {
      toast.error('Selecione pelo menos um membro para dividir a despesa');
      setShowSplitModal(true); // Reabrir modal
      return;
    }

    // ✅ VALIDAÇÃO ADICIONAL: Valor deve ser maior que zero
    if (numericAmount <= 0) {
      toast.error('O valor da transação deve ser maior que zero');
      return;
    }

    // ✅ VALIDAÇÃO: Descrição obrigatória
    if (!description.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }

    // ✅ VALIDAÇÃO: Categoria obrigatória para transações compartilhadas
    if (isShared && !categoryId) {
      toast.error('A categoria é obrigatória para transações compartilhadas (necessária para controle de orçamento)');
      return;
    }

    // Preparar dados da transação
    const transactionData = {
      amount: numericAmount,
      description: description.trim(),
      date: format(date, 'yyyy-MM-dd'),
      type: activeTab as TransactionType,
      account_id: payerId === 'me' ? accountId || undefined : undefined,
      destination_account_id: isTransfer ? destinationAccountId : undefined,
      category_id: categoryId || undefined,
      trip_id: tripId || undefined,
      currency: transactionCurrency, // Adicionar moeda da transação
      domain: tripId ? 'TRAVEL' : isShared ? 'SHARED' : 'PERSONAL',
      is_shared: isShared,
      payer_id: payerId !== 'me' ? payerId : undefined,
      is_installment: isInstallment,
      total_installments: isInstallment ? totalInstallments : undefined,
      notes: notes || undefined,
      splits: transactionSplits,
      // Novos campos
      is_refund: isRefund,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency : undefined,
      recurrence_day: isRecurring && frequency === 'MONTHLY' ? recurrenceDay : undefined,
      enable_notification: enableNotification,
      notification_date: enableNotification && notificationDate ? format(notificationDate, 'yyyy-MM-dd') : undefined,
    };

    console.log('🟢 [TransactionForm] Dados da transação preparados:', transactionData);

    // Buscar contas selecionadas
    const selectedAccount = accounts?.find(a => a.id === accountId);
    const destinationAccount = accounts?.find(a => a.id === destinationAccountId);

    // VALIDAÇÃO COMPLETA
    const validation = validateTransaction(
      transactionData,
      selectedAccount,
      destinationAccount,
      selectedTrip,
      allTransactions
    );

    // Se houver erros, mostrar e parar
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Corrija os erros antes de continuar');
      return;
    }

    // Se houver warnings, pedir confirmação
    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
      setPendingSubmit(transactionData);
      setShowWarningModal(true);
      return;
    }

    // Se passou todas validações, submeter
    await performSubmit(transactionData);
  };

  const handleConfirmWarnings = async () => {
    setShowWarningModal(false);
    if (pendingSubmit) {
      await performSubmit(pendingSubmit);
      setPendingSubmit(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <ArrowDownLeft className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Nenhuma conta encontrada</h2>
        <p className="text-muted-foreground">
          Crie uma conta para começar a registrar transações
        </p>
        <Button onClick={() => navigate('/configuracoes')}>Criar Conta</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCancel ? onCancel() : navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display font-bold text-2xl tracking-tight">
          Nova Transação
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {(['EXPENSE', 'INCOME', 'TRANSFER'] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
              activeTab === tab
                ? tab === 'EXPENSE'
                  ? 'bg-background text-destructive shadow-sm'
                  : tab === 'INCOME'
                    ? 'bg-background text-positive shadow-sm'
                    : 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'EXPENSE' ? (
              <>
                <ArrowUpRight className="h-4 w-4" />
                Despesa
              </>
            ) : tab === 'INCOME' ? (
              <>
                <ArrowDownLeft className="h-4 w-4" />
                Receita
              </>
            ) : (
              <>
                <Repeat className="h-4 w-4" />
                Transf.
              </>
            )}
          </button>
        ))}
      </div>

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <Alert className="border-destructive/50 bg-destructive/10 animate-pulse">
          <BellRing className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            ⚠️ Possível transação duplicada detectada! Verifique se já não registrou esta despesa.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <BellRing className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <p className="font-semibold text-destructive mb-2">Corrija os seguintes erros:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount */}
        <div className="space-y-2">
          <Label>Valor</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {getCurrencySymbol(transactionCurrency)}
            </span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={amount}
              onChange={handleAmountChange}
              className={cn(
                'pl-12 h-16 text-3xl font-mono font-bold text-center',
                isExpense && 'text-destructive',
                isIncome && 'text-positive',
                isTransfer && 'text-primary'
              )}
              autoFocus
            />
          </div>
          {selectedTrip && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Plane className="h-3 w-3" />
              Moeda da viagem: {selectedTrip.currency}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            placeholder="Ex: Almoço, Uber, Salário"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Date & Category (side by side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    selectedTrip && (
                      format(date, 'yyyy-MM-dd') < selectedTrip.start_date ||
                      format(date, 'yyyy-MM-dd') > selectedTrip.end_date
                    ) && "border-amber-400 dark:border-amber-600"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedTrip && (
              format(date, 'yyyy-MM-dd') < selectedTrip.start_date ||
              format(date, 'yyyy-MM-dd') > selectedTrip.end_date
            ) && (
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                  ⚠️ Data fora do período da viagem ({format(new Date(selectedTrip.start_date), 'dd/MM/yy')} - {format(new Date(selectedTrip.end_date), 'dd/MM/yy')})
                </p>
              )}
          </div>

          {/* Category */}
          {!isTransfer ? (
            <div className="space-y-2">
              <Label>Categoria</Label>
              
              {/* Badge de Sugestão */}
              {prediction && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    Sugestão: {prediction.categoryName}
                    <span className="text-[10px] opacity-70">
                      ({Math.round(prediction.confidence * 100)}%)
                    </span>
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {prediction.reason}
                  </span>
                </div>
              )}
              
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredParents.map((parent) => {
                    const children = hierarchical.children.get(parent.id) || [];
                    const childrenOfType = children.filter((c) =>
                      activeTab === 'INCOME' ? c.type === 'income' : c.type === 'expense'
                    );
                    
                    // Só renderizar grupo se tiver filhos
                    if (childrenOfType.length === 0) return null;
                    
                    return (
                      <SelectGroup key={parent.id}>
                        {/* Categoria Pai como Label */}
                        <SelectLabel className="text-xs font-bold text-muted-foreground bg-muted/30 sticky top-0 z-10">
                          {parent.icon} {parent.name}
                        </SelectLabel>
                        
                        {/* Subcategorias */}
                        {childrenOfType.map((child) => (
                          <SelectItem key={child.id} value={child.id} className="pl-8">
                            <div className="flex items-center gap-2">
                              <span>{child.icon}</span>
                              <span>{child.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="h-12 flex items-center justify-center bg-muted rounded-md">
                <span className="text-xs font-bold text-muted-foreground">Automático</span>
              </div>
            </div>
          )}
        </div>

        {/* Trip (optional - expenses only) */}
        {isExpense && (
          <div className="space-y-2">
            <Label>Viagem (opcional)</Label>
            {trips && trips.length > 0 ? (
              <Select
                value={tripId || 'none'}
                onValueChange={(v) => setTripId(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Vincular a uma viagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        {trip.name}
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {trip.currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-12 flex items-center justify-between px-4 border border-dashed border-border rounded-lg">
                <span className="text-sm text-muted-foreground">Nenhuma viagem cadastrada</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/viagens')}
                  className="text-xs"
                >
                  Criar viagem
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Account */}
        {!isTransfer ? (
          isPaidByOther ? (
            // Mensagem quando outro pagou - não mostra seleção de conta
            <Alert className="bg-muted/50 border-primary/20">
              <Users className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                💡 Despesa paga por <span className="font-semibold">{getPayerName(payerId)}</span> — não afeta suas contas.
                <br />
                <span className="text-xs text-muted-foreground">
                  Esta despesa será registrada como débito seu com {getPayerName(payerId)}.
                </span>
              </AlertDescription>
            </Alert>
          ) : filteredAccounts.length === 0 && selectedTrip && selectedTrip.currency !== 'BRL' ? (
            // Mensagem quando não há conta internacional compatível COM A VIAGEM
            <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
              <Wallet className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Nenhuma conta em <span className="font-semibold">{selectedTrip.currency}</span> encontrada.
                <br />
                <span className="text-xs">
                  Crie uma conta internacional com moeda {selectedTrip.currency} em Configurações.
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-amber-700 dark:text-amber-400 underline"
                  onClick={() => navigate('/configuracoes')}
                >
                  Criar conta internacional
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label>{isExpense ? 'Pagar com' : 'Receber em'}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{
                            backgroundColor: getBankById(acc.bank_id).color,
                          }}
                        />
                        {acc.name}
                        {acc.type === 'CREDIT_CARD' && (
                          <span className="text-xs text-muted-foreground">
                            (Cartão)
                          </span>
                        )}
                        {acc.is_international && (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            {acc.currency}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTrip && selectedTrip.currency !== 'BRL' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  🌍 Mostrando apenas contas em {selectedTrip.currency}
                </p>
              )}
              {selectedAccount?.is_international && !selectedTrip && (
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  🌍 Transação em {selectedAccount.currency} (conta internacional)
                </p>
              )}
            </div>
          )
        ) : (
          <>
            <div className="space-y-2">
              <Label>Sai de (Origem)</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="De onde sai" />
                </SelectTrigger>
                <SelectContent>
                  {regularAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vai para (Destino)</Label>
              <Select
                value={destinationAccountId}
                onValueChange={setDestinationAccountId}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Para onde vai" />
                </SelectTrigger>
                <SelectContent>
                  {regularAccounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Split / Share (expenses only) */}
        {isExpense && availableMembers.length > 0 && (
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Dividir despesa</p>
                  <p className="text-sm text-muted-foreground">
                    {hasSharing
                      ? `${splits.length} pessoa(s) · ${payerId !== 'me' ? 'Outro pagou' : 'Eu paguei'
                      }`
                      : tripId
                        ? 'Compartilhar com membros da viagem'
                        : 'Compartilhar com família'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={hasSharing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSplitModal(true)}
              >
                {hasSharing ? 'Editar' : 'Dividir'}
              </Button>
            </div>
            {hasSharing && splits.length > 0 && (
              <p className="text-sm text-primary">
                Cada pessoa paga: R${' '}
                {(
                  (getNumericAmount() * splits[0].percentage) /
                  100
                ).toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Mensagem quando não há membros disponíveis */}
        {isExpense && familyMembers.length > 0 && availableMembers.length === 0 && tripId && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Nenhum membro da família está nesta viagem. Adicione membros à viagem para compartilhar despesas.
            </AlertDescription>
          </Alert>
        )}

        {/* Installments (credit card only) */}
        {isExpense && isCreditCard && (
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Parcelar</p>
                  <p className="text-sm text-muted-foreground">
                    Dividir em parcelas mensais
                  </p>
                </div>
              </div>
              <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
            </div>

            {isInstallment && (
              <div className="space-y-2">
                <Label>Número de parcelas</Label>
                <Select
                  value={totalInstallments.toString()}
                  onValueChange={(v) => setTotalInstallments(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x de {getCurrencySymbol(transactionCurrency)}{' '}
                        {(getNumericAmount() / n).toFixed(2).replace('.', ',')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Refund (any expense) */}
        {isExpense && (
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Reembolso</p>
                  <p className="text-sm text-muted-foreground">
                    Devolução de uma despesa anterior
                  </p>
                </div>
              </div>
              <Switch checked={isRefund} onCheckedChange={setIsRefund} />
            </div>
          </div>
        )}

        {/* Recurring (any type) */}
        <div className="p-4 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Recorrente</p>
                <p className="text-sm text-muted-foreground">
                  Repetir automaticamente
                </p>
              </div>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Diariamente</SelectItem>
                    <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                    <SelectItem value="MONTHLY">Mensalmente</SelectItem>
                    <SelectItem value="YEARLY">Anualmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {frequency === 'MONTHLY' && (
                <div className="space-y-2">
                  <Label>Dia do mês</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(parseInt(e.target.value) || 1)}
                    placeholder="1-31"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dia em que a transação será repetida todo mês
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="p-4 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Notificação</p>
                <p className="text-sm text-muted-foreground">
                  Lembrete antes do vencimento
                </p>
              </div>
            </div>
            <Switch checked={enableNotification} onCheckedChange={setEnableNotification} />
          </div>

          {enableNotification && (
            <div className="space-y-2">
              <Label>Data da notificação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {notificationDate ? format(notificationDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={notificationDate}
                    onSelect={setNotificationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Você receberá um lembrete nesta data
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Textarea
            placeholder="Alguma anotação..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={createTransaction.isPending}
        >
          {createTransaction.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Salvar'
          )}
        </Button>
      </form>

      {/* Split Modal */}
      <SplitModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        onConfirm={(confirmedSplits) => {
          console.log('🟢 [TransactionForm] Recebendo splits do modal:', confirmedSplits);
          setSplits(confirmedSplits); // ✅ CORREÇÃO: Atualizar estado com splits confirmados
          setShowSplitModal(false);
        }}
        payerId={payerId}
        setPayerId={setPayerId}
        splits={splits}
        setSplits={setSplits}
        familyMembers={availableMembers}
        activeAmount={getNumericAmount()}
        onNavigateToFamily={() => navigate('/familia')}
        isInstallment={isInstallment}
        setIsInstallment={setIsInstallment}
        totalInstallments={totalInstallments}
        setTotalInstallments={setTotalInstallments}
      />

      {/* Warning Confirmation Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <BellRing className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Atenção</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Detectamos alguns avisos. Deseja continuar mesmo assim?
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-600 dark:text-amber-400">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowWarningModal(false);
                  setPendingSubmit(null);
                  setValidationWarnings([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmWarnings}
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Continuar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
