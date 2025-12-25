import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Budget } from '@/types/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BudgetCardProps {
  budget: Budget;
  transactions: any[];
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

export const BudgetCard = ({ budget, transactions, onEdit, onDelete }: BudgetCardProps) => {
  // Calcular gastos do período
  const startDate = new Date(budget.start_date);
  const endDate = budget.end_date ? new Date(budget.end_date) : endOfMonth(startDate);

  const spent = transactions
    .filter((t) => {
      const txDate = new Date(t.date);
      return (
        t.type === 'DESPESA' &&
        t.category === budget.category &&
        !t.deleted &&
        txDate >= startDate &&
        txDate <= endDate
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = budget.amount - spent;
  const percentage = (spent / budget.amount) * 100;
  const isOverBudget = spent > budget.amount;
  const isNearLimit = budget.alert_threshold && percentage >= budget.alert_threshold;

  return (
    <Card className={isOverBudget ? 'border-red-500' : isNearLimit ? 'border-yellow-500' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{budget.category}</CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(budget)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(budget.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gasto</span>
            <span className={isOverBudget ? 'text-red-600 font-semibold' : ''}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(spent)}
            </span>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Orçamento</span>
            <span>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(budget.amount)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isOverBudget ? 'Excedido' : 'Restante'}
            </span>
            <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Math.abs(remaining))}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {percentage.toFixed(1)}% utilizado
          </div>
        </div>

        {isNearLimit && !isOverBudget && (
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Próximo do limite!</span>
          </div>
        )}

        {isOverBudget && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Orçamento excedido!</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {format(startDate, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
          {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
        </div>
      </CardContent>
    </Card>
  );
};
