import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  DollarSign,
  Layers,
  Check,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FamilyMember } from '@/hooks/useFamily';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCategoriesHierarchical } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts } from '@/hooks/useAccounts';
import { toast } from 'sonner';
import * as dateFns from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AccountSelector } from '@/components/transactions/form/AccountSelector';
import { CategorySelector } from '@/components/transactions/CategorySelector';

interface SharedInstallmentImportProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onSuccess?: () => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export function SharedInstallmentImport({
  isOpen,
  onClose,
  members,
  onSuccess,
}: SharedInstallmentImportProps) {
  const { user } = useAuth();
  const createTransaction = useCreateTransaction();
  const { data: categories = [], hierarchical } = useCategoriesHierarchical();
  const { data: accounts = [] } = useAccounts();
  const creditCards = accounts.filter(a => a.type === 'CREDIT_CARD');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('2');
  const [selectedMonth, setSelectedMonth] = useState(dateFns.format(new Date(), 'yyyy-MM'));
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Filter out current user from assignee list
  const availableMembers = members.filter(m => m.linked_user_id !== user?.id);

  // Gerar lista de meses (12 meses: atual + 11 próximos)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = dateFns.addMonths(new Date(), i);
    return {
      value: dateFns.format(date, 'yyyy-MM'),
      label: dateFns.format(date, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
    };
  });

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount(''); // Iniciar vazio para o usuário digitar
      setInstallments('2');
      setSelectedMonth(dateFns.format(new Date(), 'yyyy-MM'));
      setCategoryId('');
      const cards = accounts.filter(a => a.type === 'CREDIT_CARD');
      setSelectedAccountId(cards.length > 0 ? cards[0].id : '');
      setIsSubmitting(false);
      setErrors([]);
      if (availableMembers.length > 0) {
        setAssigneeId(availableMembers[0].id);
      }
    }
  }, [isOpen, availableMembers.length, accounts]);

  const parseAmount = (val: string) => {
    return parseFloat(val) || 0;
  };

  const installmentAmount = parseAmount(amount);
  const totalAmount = installmentAmount * (parseInt(installments) || 1);

  // Calcular data da última parcela
  let lastInstallmentText = '';
  if (selectedMonth && installments) {
    const totalInstallmentsNum = parseInt(installments) || 0;
    if (totalInstallmentsNum >= 1) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const baseDate = new Date(year, month - 1, 1);
      const lastDate = dateFns.addMonths(baseDate, totalInstallmentsNum - 1);
      lastInstallmentText = dateFns.format(lastDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    }
  }

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!description.trim()) {
      newErrors.push('Descrição é obrigatória');
    }

    const parsedAmount = parseAmount(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.push('Valor da parcela deve ser maior que zero');
    }

    const parsedInstallments = parseInt(installments);
    if (!parsedInstallments || parsedInstallments < 1) {
      newErrors.push('Número de parcelas deve ser pelo menos 1');
    }

    if (parsedInstallments > 48) {
      newErrors.push('Número máximo de parcelas é 48');
    }

    if (!assigneeId) {
      newErrors.push('Selecione quem vai pagar as parcelas');
    }

    if (!selectedMonth) {
      newErrors.push('Selecione o mês da primeira parcela');
    }

    if (!selectedAccountId) {
      newErrors.push('Selecione a conta de origem do gasto');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const selectedMember = members.find(m => m.id === assigneeId);
      if (!selectedMember) throw new Error('Membro não encontrado');

      // Usar o primeiro dia do mês selecionado
      const [year, month] = selectedMonth.split('-').map(Number);
      const baseDate = new Date(year, month - 1, 1);
      const totalInstallmentsNum = parseInt(installments);
      const parcelAmount = parseAmount(amount);

      console.log('🔍 DEBUG IMPORTAÇÃO:');
      console.log('  - Mês selecionado:', selectedMonth);
      console.log('  - Data base (1º dia do mês):', dateFns.format(baseDate, 'dd/MM/yyyy'));
      console.log('  - Valor digitado (amount):', amount);
      console.log('  - Valor parseado (parcelAmount):', parcelAmount);
      console.log('  - Número de parcelas:', totalInstallmentsNum);
      console.log('  - Valor TOTAL calculado:', totalAmount);
      console.log('  - Valor que será enviado ao hook:', totalAmount);

      // CORREÇÃO CRÍTICA: Passar o valor TOTAL, não o valor da parcela
      // O hook useCreateTransaction divide o total pelo número de parcelas
      await createTransaction.mutateAsync({
        amount: totalAmount, 
        description: description.trim(),
        date: dateFns.format(baseDate, 'yyyy-MM-dd'),
        type: 'EXPENSE',
        account_id: selectedAccountId,
        category_id: categoryId || undefined,
        domain: 'SHARED',
        is_shared: true,
        is_installment: true,
        total_installments: totalInstallmentsNum,
        splits: [{
          member_id: assigneeId,
          percentage: 100,
          amount: totalAmount,
        }],
      });

      toast.success(`${totalInstallmentsNum} parcelas importadas com sucesso!`);
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar parcelas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Importar Parcelado Compartilhado
          </DialogTitle>
          <DialogDescription>
            Crie múltiplas parcelas para outro membro pagar.
            <br />
            <span className="text-xs text-muted-foreground">
              💰 Informe o valor de cada parcela - o total será calculado automaticamente
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Banner Explicativo "Para que serve" */}
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3 flex gap-2.5 items-start">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">Para que serve o Parcelado Compartilhado?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use esta função quando fizer uma compra parcelada no <strong>seu cartão de crédito pessoal</strong> (ex: compra de 10x de R$100), mas <strong>outro membro da família for pagar</strong> as parcelas mensais. O sistema criará as despesas nos meses correspondentes e cobrará o membro selecionado automaticamente.
              </p>
            </div>
          </div>

          {/* Account Selector */}
          <div className="space-y-2">
            <AccountSelector 
              accountId={selectedAccountId} 
              setAccountId={setSelectedAccountId}
              activeTab="EXPENSE"
              destinationAccountId=""
              setDestinationAccountId={() => {}}
              filteredAccounts={creditCards}
              transferAccounts={[]}
              selectedTrip={undefined}
              selectedAccount={creditCards.find(a => a.id === selectedAccountId)}
              isPaidByOther={false}
              payerName=""
            />
            <p className="text-xs text-muted-foreground">
              💳 Selecione o cartão de crédito onde o gasto original foi (ou será) realizado
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compra Geladeira"
              disabled={isSubmitting}
            />
          </div>

          {/* Amount & Installments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor da Parcela *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <CurrencyInput
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0,00"
                  className="pl-9 font-mono"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parcelas *</Label>
              <Input
                type="number"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                min="1"
                max="48"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Total Display */}
          {totalAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Valor total</p>
              <p className="font-mono text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          )}

          {/* Month Selector */}
          <div className="space-y-2">
            <Label>Mês da 1ª Parcela *</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lastInstallmentText && (
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex items-center gap-2 mt-1 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-foreground font-medium">
                  A última parcela (de {installments}) será cobrada em <strong className="text-primary">{lastInstallmentText}</strong>.
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              📅 Parcelas criadas automaticamente no primeiro dia de cada mês
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <CategorySelector
              categories={categories}
              value={categoryId}
              onValueChange={setCategoryId}
              type="expense"
              placeholder="Selecione uma categoria"
            />
            <p className="text-xs text-muted-foreground">
              🏷️ Ajuda a organizar e controlar seus gastos mensais
            </p>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Quem vai pagar as parcelas? *</Label>
            {availableMembers.length === 0 ? (
              <div className="text-center py-4 border border-dashed rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum membro disponível</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setAssigneeId(member.id)}
                    className={cn(
                      'p-3 rounded-lg border text-sm font-medium transition-all',
                      assigneeId === member.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary'
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {assigneeId === member.id && <Check className="h-4 w-4" />}
                      {member.name.split(' ')[0]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || availableMembers.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              installmentAmount > 0
                ? `Confirmar ${installments}x de ${formatCurrency(installmentAmount)}`
                : 'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
