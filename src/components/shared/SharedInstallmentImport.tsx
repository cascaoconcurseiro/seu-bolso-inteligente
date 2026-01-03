import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Calendar,
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
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const { hierarchical } = useCategoriesHierarchical();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('2');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Filter out current user from assignee list
  const availableMembers = members.filter(m => m.linked_user_id !== user?.id);

  // Gerar lista de meses (12 meses: atual + 11 próximos)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
    };
  });

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount(''); // Iniciar vazio para o usuário digitar
      setInstallments('2');
      setSelectedMonth(format(new Date(), 'yyyy-MM'));
      setCategoryId('');
      setIsSubmitting(false);
      setErrors([]);
      if (availableMembers.length > 0) {
        setAssigneeId(availableMembers[0].id);
      }
    }
  }, [isOpen, availableMembers.length]);

  const parseAmount = (val: string) => {
    return parseFloat(val) || 0;
  };

  const installmentAmount = parseAmount(amount);
  const totalAmount = installmentAmount * (parseInt(installments) || 1);

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
      console.log('  - Data base (1º dia do mês):', format(baseDate, 'dd/MM/yyyy'));
      console.log('  - Valor digitado (amount):', amount);
      console.log('  - Valor parseado (parcelAmount):', parcelAmount);
      console.log('  - Número de parcelas:', totalInstallmentsNum);
      console.log('  - Valor TOTAL calculado:', totalAmount);
      console.log('  - Valor que será enviado ao hook:', totalAmount);

      // CORREÇÃO CRÍTICA: Passar o valor TOTAL, não o valor da parcela
      // O hook useCreateTransaction divide o total pelo número de parcelas
      await createTransaction.mutateAsync({
        amount: totalAmount, // ← CORREÇÃO: passar total, não parcela
        description: description.trim(),
        date: format(baseDate, 'yyyy-MM-dd'),
        competence_date: format(
          new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
          'yyyy-MM-dd'
        ),
        type: 'EXPENSE',
        category_id: categoryId || undefined,
        domain: 'SHARED',
        is_shared: true,
        is_installment: true,
        total_installments: totalInstallmentsNum,
        // NÃO passar current_installment nem series_id, o hook cria
        splits: [{
          member_id: assigneeId,
          percentage: 100,
          amount: totalAmount, // ← CORREÇÃO: passar total, não parcela
        }],
      });

      toast.success(`${totalInstallmentsNum} parcelas importadas com sucesso!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar parcelas');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar apenas categorias de despesa
  // CORREÇÃO: Garantir que parents e children são arrays válidos
  const expenseParents = Array.isArray(hierarchical?.parents)
    ? hierarchical.parents.filter(c => c.type === 'expense')
    : [];
  const expenseChildren = Array.isArray(hierarchical?.children)
    ? hierarchical.children.filter(c => c.type === 'expense')
    : [];

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

        <div className="space-y-4 py-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <ul className="text-sm text-destructive space-y-1">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

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
            <p className="text-xs text-muted-foreground">
              📅 Parcelas criadas automaticamente no primeiro dia de cada mês
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {expenseParents.map((parent) => {
                  const childrenOfParent = expenseChildren.filter(c => c.parent_category_id === parent.id);

                  return (
                    <SelectGroup key={parent.id}>
                      {/* Categoria Pai como Label */}
                      <SelectLabel className="text-xs font-bold text-muted-foreground bg-muted/30 sticky top-0 z-10">
                        {parent.icon} {parent.name}
                      </SelectLabel>

                      {/* Subcategorias */}
                      {childrenOfParent.map((child) => (
                        <SelectItem key={child.id} value={child.id} className="pl-8">
                          <span className="flex items-center gap-2">
                            {child.icon && <span>{child.icon}</span>}
                            <span>{child.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
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
