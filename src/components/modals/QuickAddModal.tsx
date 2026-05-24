import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategoriesHierarchical } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { Loader2, Sparkles, Plane } from 'lucide-react';
import { toast } from 'sonner';
import { useAIPrediction } from '@/hooks/useAIPrediction';
import { useTrips } from '@/hooks/useTrips';
import { Switch } from '@/components/ui/switch';
import { moneyUtils } from '@/utils/money';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesHierarchical();
  const { data: trips } = useTrips();
  const createTransaction = useCreateTransaction();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(1);
  
  const activeTrips = trips?.filter(t => t.status === 'ACTIVE' || t.status === 'PLANNING') || [];
  const [isTripMode, setIsTripMode] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  useEffect(() => {
    if (isTripMode && activeTrips.length > 0 && !selectedTripId) {
      const sorted = [...activeTrips].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      setSelectedTripId(sorted[0].id);
    }
  }, [isTripMode, activeTrips, selectedTripId]);

  const selectedTrip = activeTrips.find(t => t.id === selectedTripId);
  const currentCurrency = isTripMode && selectedTrip ? selectedTrip.currency : 'BRL';
  const selectedCard = accounts?.find(a => a.id === accountId);
  const isCreditCard = selectedCard?.type === 'CREDIT_CARD';

  useEffect(() => {
    if (!isCreditCard) {
      setIsInstallment(false);
      setTotalInstallments(1);
    }
  }, [accountId, isCreditCard]);

  const { suggestion, predictedCategoryId, isPredicting } = useAIPrediction(description, isOpen);

  // Auto-selecionar categoria se a IA prever
  useEffect(() => {
    if (predictedCategoryId) {
      setCategoryId(predictedCategoryId);
    }
  }, [predictedCategoryId]);

  const handleApplySuggestion = () => {
    if (suggestion) {
      setDescription(suggestion);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (!description.trim()) {
      toast.error('A descrição é obrigatória.');
      return;
    }
    if (!accountId) {
      toast.error('A conta é obrigatória.');
      return;
    }
    if (!categoryId) {
      toast.error('A categoria é obrigatória.');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        amount: numericAmount,
        description: description.trim(),
        date,
        type: 'EXPENSE',
        account_id: accountId,
        category_id: categoryId,
        domain: 'PERSONAL',
        is_shared: false,
        payer_id: undefined,
        trip_id: isTripMode && selectedTripId ? selectedTripId : undefined,
        currency: currentCurrency,
        is_installment: isInstallment && totalInstallments > 1,
        total_installments: isInstallment && totalInstallments > 1 ? totalInstallments : undefined,
      });
      
      // Reset and close
      setAmount('');
      setDescription('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAccountId('');
      setCategoryId('');
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      if (acc.type === 'CREDIT_CARD') return false;
      if (isTripMode && selectedTrip) {
        if (selectedTrip.currency === 'BRL') return !acc.is_international;
        return acc.is_international && acc.currency === selectedTrip.currency;
      }
      return !acc.is_international;
    });
  }, [accounts, isTripMode, selectedTrip]);

  const filteredCreditCards = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      if (acc.type !== 'CREDIT_CARD') return false;
      if (isTripMode && selectedTrip) {
        if (selectedTrip.currency === 'BRL') return !acc.is_international;
        return acc.is_international && acc.currency === selectedTrip.currency;
      }
      return !acc.is_international;
    });
  }, [accounts, isTripMode, selectedTrip]);

  useEffect(() => {
    if (accountId) {
      const allFiltered = [...filteredAccounts, ...filteredCreditCards];
      const isAccountValid = allFiltered.some(acc => acc.id === accountId);
      if (!isAccountValid) {
        setAccountId('');
      }
    }
  }, [filteredAccounts, filteredCreditCards, accountId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Adição Rápida (Despesa)</DialogTitle>
        </DialogHeader>
        
        {accountsLoading || categoriesLoading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTrips.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 cursor-pointer" onClick={() => setIsTripMode(!isTripMode)}>
                      <Plane className="h-4 w-4 text-blue-500" />
                      Despesa de Viagem
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Vincular a uma viagem ativa ou futura
                    </p>
                  </div>
                  <Switch 
                    checked={isTripMode} 
                    onCheckedChange={setIsTripMode} 
                  />
                </div>
                
                {isTripMode && activeTrips.length > 1 && (
                  <div className="space-y-2 animate-fade-in pl-1">
                    <Label className="text-xs">Qual Viagem?</Label>
                    <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a viagem" /></SelectTrigger>
                      <SelectContent>
                        {activeTrips.map(trip => (
                          <SelectItem key={trip.id} value={trip.id}>{trip.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor ({currentCurrency})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {moneyUtils.getSymbol(currentCurrency)}
                </span>
                <CurrencyInput 
                  placeholder="0,00"
                  value={amount} 
                  onChange={setAmount} 
                  currency={currentCurrency}
                  className="pl-9 h-14 text-2xl font-bold bg-transparent"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <div className="relative">
                <Input 
                  placeholder="Ex: Padaria, Uber..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="pr-8 bg-transparent relative z-10"
                  required
                />
                
                {/* Autocomplete Hint (Ghost text behind input) */}
                {suggestion && suggestion.toLowerCase().startsWith(description.toLowerCase()) && description.length > 0 && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none z-0">
                    <span className="opacity-0">{description}</span>
                    <span className="text-muted-foreground/40 text-sm">{suggestion.slice(description.length)}</span>
                  </div>
                )}

                {isPredicting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* AI Suggestion Chip */}
              {suggestion && suggestion !== description && (
                <div className="flex items-center gap-2 mt-1 animate-fade-in">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Sugestão:
                  </span>
                  <button
                    type="button"
                    onClick={handleApplySuggestion}
                    className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    {suggestion}
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId} required>
                  <SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                    {filteredCreditCards.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name} (Cartão)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>
          
          {isCreditCard && (
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
                  <SelectItem value="1">
                    1x de {moneyUtils.getSymbol(currentCurrency)} {(parseFloat(amount.replace(',', '.')) || 0).toFixed(2).replace('.', ',')} (À vista)
                  </SelectItem>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x de {moneyUtils.getSymbol(currentCurrency)}{' '}
                      {((parseFloat(amount.replace(',', '.')) || 0) / n).toFixed(2).replace('.', ',')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Categoria 
                {predictedCategoryId === categoryId && categoryId && (
                  <Sparkles className="h-3 w-3 text-blue-500" title="Categoria sugerida pela IA" />
                )}
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories?.filter(c => !c.parent_category_id).map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full h-12 mt-2" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar Despesa'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
