import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarIcon,
  Loader2,
  RefreshCw,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Plane,
  BellRing,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories, useCreateDefaultCategories } from '@/hooks/useCategories';
import {
  useCreateTransaction,
  useTransactions,
  TransactionType,
  TransactionSplit,
} from '@/hooks/useTransactions';
import { useTrips } from '@/hooks/useTrips';
import { useFamilyMembers } from '@/hooks/useFamily';
import { toast } from 'sonner';
import { SplitModal, TransactionSplitData } from './SplitModal';
import { differenceInDays, parseISO } from 'date-fns';
import { validateTransaction } from '@/services/validationService';

type TabType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export function TransactionForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const navigate = useNavigate();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: trips } = useTrips();
  const { data: familyMembers = [] } = useFamilyMembers();
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
  const [tripId, setTripId] = useState('');
  const [notes, setNotes] = useState('');

  // Parcelamento
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(2);

  // Divisão / Compartilhamento
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [payerId, setPayerId] = useState<string>('me');
  const [splits, setSplits] = useState<TransactionSplitData[]>([]);

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<any>(null);

  // Criar categorias padrão se não existirem
  useEffect(() => {
    if (!categoriesLoading && categories?.length === 0) {
      createDefaultCategories.mutate();
    }
  }, [categoriesLoading, categories]);

  // Detect duplicates
  useEffect(() => {
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
  }, [amount, description, date, activeTab, allTransactions]);

  const filteredCategories =
    categories?.filter((c) =>
      activeTab === 'INCOME' ? c.type === 'income' : c.type === 'expense'
    ) || [];

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
  const creditCards = accounts?.filter((a) => a.type === 'CREDIT_CARD') || [];
  const regularAccounts = accounts?.filter((a) => a.type !== 'CREDIT_CARD') || [];
  const allAccounts = accounts || [];
  const isCreditCard = creditCards.some((c) => c.id === accountId);
  const isExpense = activeTab === 'EXPENSE';
  const isIncome = activeTab === 'INCOME';
  const isTransfer = activeTab === 'TRANSFER';

  const selectedTrip = trips?.find((t) => t.id === tripId);
  const hasSharing = splits.length > 0 || (payerId !== 'me' && payerId !== '');

  const buildSplitsForSubmit = (): TransactionSplit[] => {
    if (splits.length === 0) return [];
    const numericAmount = getNumericAmount();

    return splits.map((s) => ({
      member_id: s.memberId,
      percentage: s.percentage,
      amount: Number(((numericAmount * s.percentage) / 100).toFixed(2)),
    }));
  };

  const performSubmit = async (transactionData: any) => {
    await createTransaction.mutateAsync(transactionData);

    if (onSuccess) {
      onSuccess();
    } else {
      navigate('/transacoes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpar erros anteriores
    setValidationErrors([]);
    setValidationWarnings([]);

    const numericAmount = getNumericAmount();
    const transactionSplits = buildSplitsForSubmit();
    const isShared = transactionSplits.length > 0 || payerId !== 'me';

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
      domain: tripId ? 'TRAVEL' : isShared ? 'SHARED' : 'PERSONAL',
      is_shared: isShared,
      payer_id: payerId !== 'me' ? payerId : undefined,
      is_installment: isInstallment,
      total_installments: isInstallment ? totalInstallments : undefined,
      notes: notes || undefined,
      splits: transactionSplits,
      transaction_splits: transactionSplits.map(s => ({
        member_id: s.member_id,
        percentage: s.percentage,
        amount: s.amount
      }))
    };

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
              {selectedTrip ? selectedTrip.currency : 'R$'}
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
        <div className="grid grid-cols-2 gap-4">
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
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
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
          payerId === 'me' && (
            <div className="space-y-2">
              <Label>{isExpense ? 'Pagar com' : 'Receber em'}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{
                            backgroundColor: acc.bank_color || 'hsl(var(--muted))',
                          }}
                        />
                        {acc.name}
                        {acc.type === 'CREDIT_CARD' && (
                          <span className="text-xs text-muted-foreground">
                            (Cartão)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        {isExpense && familyMembers.length > 0 && (
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Dividir despesa</p>
                  <p className="text-sm text-muted-foreground">
                    {hasSharing
                      ? `${splits.length} pessoa(s) · ${
                          payerId !== 'me' ? 'Outro pagou' : 'Eu paguei'
                        }`
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

        {/* Installments (any expense) */}
        {isExpense && (
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
                        {n}x de {selectedTrip ? selectedTrip.currency : 'R$'}{' '}
                        {(getNumericAmount() / n).toFixed(2).replace('.', ',')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isCreditCard && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    ⚠️ Parcelamento em conta corrente: as parcelas serão debitadas mensalmente
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
        onConfirm={() => setShowSplitModal(false)}
        payerId={payerId}
        setPayerId={setPayerId}
        splits={splits}
        setSplits={setSplits}
        familyMembers={familyMembers}
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
