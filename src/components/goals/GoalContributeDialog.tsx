import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoals } from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { Goal } from '@/types/database';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalContributeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
}

export function GoalContributeDialog({ isOpen, onClose, goal }: GoalContributeDialogProps) {
  const { contributeToGoal } = useGoals();
  const { data: accounts } = useAccounts();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'add' | 'withdraw'>('add');
  const [accountId, setAccountId] = useState(goal.linked_account_id || 'none');

  // Detectar moeda da meta via conta vinculada
  const linkedAccount = accounts?.find(a => a.id === goal.linked_account_id);
  const goalCurrency = linkedAccount?.currency || 'BRL';
  const currencySymbol = goalCurrency === 'BRL' ? 'R$' : goalCurrency === 'USD' ? '$' : goalCurrency;

  // Filtrar contas que tenham a mesma moeda da meta
  const filteredAccounts = accounts?.filter(acc => acc.currency === goalCurrency) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;

    try {
      // O hook contributeToGoal agora lida com a criação da transação internamente
      // de forma robusta, suportando moedas e tipos (income/expense)
      contributeToGoal(
        { 
          id: goal.id, 
          amount: type === 'add' ? value : -value,
          accountId: accountId !== 'none' ? accountId : undefined,
          description: type === 'add' 
            ? `Contribuição para Meta: ${goal.name}` 
            : `Resgate da Meta: ${goal.name}`
        },
        { onSuccess: onClose }
      );
    } catch (error) {
      console.error("Erro ao contribuir para meta:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:w-[400px] max-w-sm !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle className="text-base font-display font-bold">
            Movimentar: {goal.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-secondary p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setType('add')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                type === 'add' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-4 h-4 text-green-500" />
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setType('withdraw')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                type === 'withdraw' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingDown className="w-4 h-4 text-red-500" />
              Retirar
            </button>
          </div>

          <div className="space-y-2">
            <AmountInput
              label="Valor"
              value={amount}
              onChange={setAmount}
              currency={goalCurrency}
              size="md"
              textColorClass={type === 'withdraw' ? 'text-destructive' : 'text-positive'}
              autoFocus
            />
            {goalCurrency !== 'BRL' && (
              <p className="text-sm text-amber-500 font-medium text-center">
                Operação em moeda estrangeira ({goalCurrency})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Debitar/Creditar na Conta (Opcional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Não registrar transação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não registrar na conta (apenas virtual)</SelectItem>
                {filteredAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
