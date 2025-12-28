import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

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
  const { data: categories = [] } = useCategories();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('2');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Filter out current user from assignee list
  const availableMembers = members.filter(m => m.linked_user_id !== user?.id);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount('0,00'); // Iniciar com 0,00 ao invés de string vazia
      setInstallments('2');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setCategoryId('');
      setIsSubmitting(false);
      setErrors([]);
      if (availableMembers.length > 0) {
        setAssigneeId(availableMembers[0].id);
      }
    }
  }, [isOpen, availableMembers.length]);

  const parseAmount = (val: string) => {
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
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

    if (!date) {
      newErrors.push('Data da primeira parcela é obrigatória');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir digitar valores normalmente (ex: 95 = R$ 95,00)
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setAmount('');
      return;
    }
    const numValue = parseInt(value);
    setAmount((numValue / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const selectedMember = members.find(m => m.id === assigneeId);
      if (!selectedMember) throw new Error('Membro não encontrado');

      const baseDate = new Date(date);
      const totalInstallmentsNum = parseInt(installments);
      const parcelAmount = parseAmount(amount);
      const seriesId = crypto.randomUUID();

      // Create all installments
      for (let i = 0; i < totalInstallmentsNum; i++) {
        const installmentDate = addMonths(baseDate, i);
        
        // CORREÇÃO: Adicionar competence_date (sempre 1º dia do mês)
        const competenceDate = format(
          new Date(installmentDate.getFullYear(), installmentDate.getMonth(), 1),
          'yyyy-MM-dd'
        );

        await createTransaction.mutateAsync({
          amount: parcelAmount,
          description: `${description.trim()} (${i + 1}/${totalInstallmentsNum})`,
          date: format(installmentDate, 'yyyy-MM-dd'),
          type: 'EXPENSE',
          category_id: categoryId || undefined,
          domain: 'SHARED',
          is_shared: true,
          is_installment: true,
          current_installment: i + 1,
          total_installments: totalInstallmentsNum,
          series_id: seriesId,
          splits: [{
            member_id: assigneeId,
            percentage: 100,
            amount: parcelAmount,
          }],
        });
      }

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

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Importar Parcelado Compartilhado
          </DialogTitle>
          <DialogDescription>
            Crie múltiplas parcelas para outro membro pagar
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
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
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

          {/* Date */}
          <div className="space-y-2">
            <Label>Data 1ª Parcela *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
