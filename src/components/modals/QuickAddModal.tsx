import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '../ui/currency-input';
import { AmountInput } from '../ui/amount-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategoriesHierarchical } from '@/hooks/useCategories';
import { useUserProfile } from '@/hooks/useUserProfile';
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
  const { data: profile } = useUserProfile();
  const useSubcategories = profile?.use_subcategories ?? false;

  const dropdownCategories = useMemo(() => {
    if (!categories) return [];
    
    const ALLOWED_EXPENSE_PARENTS = [
      "Supermercado",
      "Restaurantes e Lanches",
      "Delivery",
      "Gasolina",
      "Transporte",
      "Moradia",
      "Contas e Assinaturas",
      "Saúde",
      "Educação",
      "Compras",
      "Lazer",
      "Viagens",
      "Família e Pets",
      "Financeiro",
      "Impostos",
      "Outros"
    ];

    const expenseCats = categories.filter(c => {
      if (c.type !== 'expense') return false;
      // Se for categoria principal, validar se está na lista permitida
      if (!c.parent_category_id) {
        return ALLOWED_EXPENSE_PARENTS.includes(c.name);
      }
      // Se for subcategoria, o pai dela deve estar na lista permitida
      const parent = categories.find(p => p.id === c.parent_category_id);
      return parent ? ALLOWED_EXPENSE_PARENTS.includes(parent.name) : false;
    });
    
    if (!useSubcategories) {
      return expenseCats.filter(c => !c.parent_category_id);
    }
    
    const result: any[] = [];
    const parents = expenseCats.filter(c => !c.parent_category_id);
    
    parents.forEach(parent => {
      result.push(parent);
      const children = expenseCats.filter(c => c.parent_category_id === parent.id);
      children.forEach(child => {
        result.push({
          ...child,
          displayName: `— ${child.name}`
        });
      });
    });
    
    return result;
  }, [categories, useSubcategories]);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [hasUserSelectedCategoryManually, setHasUserSelectedCategoryManually] = useState(false);
  const lastAppliedCategoryIdRef = useRef<string | null>(null);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(1);
  
  const activeTrips = useMemo(() => trips?.filter(t => t.status === 'ACTIVE' || t.status === 'PLANNING') || [], [trips]);
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

  const { suggestion, predictedCategoryId, isPredicting } = useAIPrediction(description, 'expense', isOpen);

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

  // A descrição não é mais sugerida/autocompletada pela IA conforme pedido do usuário

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = moneyUtils.parse(amount.replace(',', '.'));
    
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
      <DialogContent className="max-w-md w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-3xl sm:!rounded-3xl !rounded-b-none sm:!rounded-b-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader>
          <DialogTitle>Adição Rápida (Despesa)</DialogTitle>
        </DialogHeader>
        
        {accountsLoading || categoriesLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTrips.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsTripMode(!isTripMode)}>
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
                  <div className="space-y-1.5 animate-fade-in pl-2">
                    <Label className="text-xs">Qual Viagem?</Label>
                    <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a viagem" /></SelectTrigger>
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

            <AmountInput 
              label={`Valor`}
              value={amount} 
              onChange={setAmount} 
              currency={currentCurrency}
              currencySymbol={moneyUtils.getSymbol(currentCurrency)}
              size="md"
              textColorClass={'text-destructive'}
              autoFocus
            />
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <div className="relative">
                <Input 
                  placeholder="Ex: Padaria, Uber..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="pr-12 bg-transparent relative z-10"
                  required
                />
                
                {isPredicting && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-1.5">
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
            <div className="p-3 rounded-xl border border-border bg-card space-y-3 animate-slide-in">
              <Label className="font-medium text-xs">Parcelas (Cartão de Crédito)</Label>
              <Select
                value={totalInstallments.toString()}
                onValueChange={(v) => {
                  const val = parseInt(v);
                  setTotalInstallments(val);
                  setIsInstallment(val > 1);
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o parcelamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    1x de {moneyUtils.getSymbol(currentCurrency)} {(moneyUtils.parse(amount.replace(',', '.')) || 0).toFixed(2).replace('.', ',')} (À vista)
                  </SelectItem>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x de {moneyUtils.getSymbol(currentCurrency)}{' '}
                      {((moneyUtils.parse(amount.replace(',', '.')) || 0) / n).toFixed(2).replace('.', ',')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Categoria 
                {predictedCategoryId === categoryId && categoryId && (
                  <Sparkles className="h-4 w-4 text-blue-500" title="Categoria sugerida pela IA" />
                )}
              </Label>
              <Select value={categoryId} onValueChange={handleCategoryChange} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dropdownCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.displayName || category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full mt-3" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar Despesa'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
