import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoals } from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { Goal } from '@/types/database';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { moneyUtils } from '@/utils/money';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';

interface GoalContributeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
}

export function GoalContributeDialog({ isOpen, onClose, goal }: GoalContributeDialogProps) {
  const { contributeToGoal } = useGoals();
  const { data: accounts } = useAccounts();
  const { data: history = [] } = useGoalHistory(goal.id, goal.name);

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
      logger.error("Erro ao contribuir para meta:", error);
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
          {/* Gráfico de evolução */}
          {history.length >= 2 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">Evolução do saldo</p>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <ReTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-1.5 text-xs shadow-lg">
                          <p className="text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy", { locale: ptBR })}</p>
                          <p className="font-bold text-foreground">{moneyUtils.format(p.cumulative, 'BRL')}</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#goalGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

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
              <TrendingUp className="w-4 h-4 text-success" />
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
              <TrendingDown className="w-4 h-4 text-destructive" />
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
              <p className="text-sm text-warning font-medium text-center">
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
