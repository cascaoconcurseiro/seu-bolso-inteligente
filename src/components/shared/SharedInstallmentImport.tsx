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
} from '@/components/ui/select';
import {
  DollarSign,
  Layers,
  Check,
  AlertCircle,
  Loader2,
  Users,
  HelpCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FamilyMember } from '@/hooks/useFamily';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCategoriesHierarchical } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as dateFns from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CategorySelector } from '@/components/transactions/CategorySelector';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { moneyUtils } from "@/utils/money";

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
  const { data: categories = [] } = useCategoriesHierarchical();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('2');
  const [selectedMonth, setSelectedMonth] = useState(dateFns.format(new Date(), 'yyyy-MM'));
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneePercentage, setAssigneePercentage] = useState(50);
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
      setAssigneePercentage(50);
      setIsSubmitting(false);
      setErrors([]);
      if (availableMembers.length > 0) {
        setAssigneeId(availableMembers[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, availableMembers.length]);

  const parseAmount = (val: string) => {
    return moneyUtils.parse(val) || 0;
  };

  const installmentAmount = parseAmount(amount);
  const totalAmount = installmentAmount * (parseInt(installments) || 1);

  // Calcular parcelas por membro
  const assigneeParcelAmount = (installmentAmount * assigneePercentage) / 100;
  const creatorParcelAmount = installmentAmount - assigneeParcelAmount;

  const assigneeTotalAmount = totalAmount * (assigneePercentage / 100);
  const creatorTotalAmount = totalAmount - assigneeTotalAmount;

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
      newErrors.push('Selecione o mês da próxima parcela');
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

      // Passar o valor TOTAL, não o valor da parcela
      // O hook useCreateTransaction divide o total pelo número de parcelas
      // E passa os splits proporcionais customizados
      const mainSplitAmount = totalAmount * (assigneePercentage / 100);
      const splits = [{
        member_id: assigneeId,
        percentage: assigneePercentage,
        amount: mainSplitAmount,
      }];

      // Se a porcentagem for menor que 100%, o criador paga a outra parte.
      const creatorPercentage = 100 - assigneePercentage;
      if (creatorPercentage > 0) {
        splits.push({
          member_id: user.id,
          percentage: creatorPercentage,
          amount: totalAmount - mainSplitAmount,
        });
      }

      await createTransaction.mutateAsync({
        amount: totalAmount, 
        description: description.trim(),
        date: dateFns.format(baseDate, 'yyyy-MM-dd'),
        type: 'EXPENSE',
        category_id: categoryId || undefined,
        domain: 'SHARED',
        is_shared: true,
        is_installment: true,
        total_installments: totalInstallmentsNum,
        splits: splits,
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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-12">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <span>Importar Parcelado Compartilhado</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 border bg-popover text-popover-foreground rounded-xl shadow-md z-50 font-normal">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>O que é o Parcelado Compartilhado?</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta funcionalidade serve para <strong>importar parcelas que já estão em andamento</strong> no compartilhado, dividindo e cobrando outro membro automaticamente pelos meses restantes.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Exemplo Prático:</strong> Se você comprou uma geladeira em 10x, já pagou 2 e faltam 8 parcelas, informe "8" em Parcelas Restantes e o mês da próxima cobrança. A ferramenta projetará essas parcelas futuras e cobrará o membro selecionado mês a mês.
                  </p>
                  <div className="pt-1.5 text-[11px] font-semibold text-primary border-t border-border mt-1">
                    💡 Dica: Informe o valor unitário de <strong>cada parcela</strong>. O total da compra será calculado de forma precisa e automatizada.
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </DialogTitle>
          <DialogDescription>
            Importe as parcelas restantes para outro membro pagar.
            <br />
            <span className="text-xs text-muted-foreground">
              💰 Informe o valor de cada parcela - o total será calculado automaticamente
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 no-scrollbar">
          {/* Erros de validação (se existirem) */}
          {errors.length > 0 && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg space-y-1">
              {errors.map((error, idx) => (
                <p key={idx} className="text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              ))}
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
              <Label>Parcelas Restantes *</Label>
              <Input type="number" inputMode="decimal"
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
            <Label>Mês da Próxima Parcela *</Label>
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

          {/* Assignee & Percentage Split */}
          <div className="space-y-3">
            <Label>Quem vai pagar as parcelas? *</Label>
            {availableMembers.length === 0 ? (
              <div className="text-center py-4 border border-dashed rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum membro disponível</p>
              </div>
            ) : (
              <>
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

                {assigneeId && (
                  <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-3 animate-fade-in mt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold text-muted-foreground">Porcentagem do membro selecionado</Label>
                      <span className="font-mono text-sm font-bold text-primary">{assigneePercentage}%</span>
                    </div>

                    {/* Controle deslizante com atalhos rápidos */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={assigneePercentage}
                          onChange={(e) => setAssigneePercentage(parseInt(e.target.value))}
                          disabled={isSubmitting}
                          className="flex-1 accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                        />
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={assigneePercentage}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 0));
                            setAssigneePercentage(val);
                          }}
                          disabled={isSubmitting}
                          className="w-14 h-8 text-center rounded border border-border bg-background text-xs font-mono"
                        />
                      </div>

                      {/* Atalhos Rápidos */}
                      <div className="flex justify-between gap-2">
                        {[50, 70, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setAssigneePercentage(pct)}
                            className={cn(
                              "flex-1 py-1 px-2 text-[10px] rounded font-semibold border transition-all",
                              assigneePercentage === pct
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-background border-border hover:bg-muted text-muted-foreground"
                            )}
                          >
                            {pct === 50 ? "Divisão Igual (50%)" : pct === 100 ? "Valor Integral (100%)" : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulador de Gastos em Tempo Real */}
                    {installmentAmount > 0 && (
                      <div className="pt-2.5 border-t border-border space-y-1.5 text-xs">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">📊 Resumo da divisão das parcelas</p>
                        
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Sua parte ({100 - assigneePercentage}%):</span>
                          <span className="font-mono text-foreground font-medium">
                            {formatCurrency(creatorParcelAmount)} <span className="text-[10px] text-muted-foreground">/ mês</span>
                            {parseInt(installments) > 1 && (
                              <span className="text-[10px] ml-1 block text-right text-muted-foreground">(Total: {formatCurrency(creatorTotalAmount)})</span>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-foreground font-medium">
                          <span>Parte de {members.find(m => m.id === assigneeId)?.name.split(' ')[0]} ({assigneePercentage}%):</span>
                          <span className="font-mono text-primary font-bold">
                            {formatCurrency(assigneeParcelAmount)} <span className="text-[10px] text-primary/70">/ mês</span>
                            {parseInt(installments) > 1 && (
                              <span className="text-[10px] ml-1 block text-right text-primary/70 font-normal">(Total: {formatCurrency(assigneeTotalAmount)})</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
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
