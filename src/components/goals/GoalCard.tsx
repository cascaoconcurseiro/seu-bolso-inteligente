import { useState } from 'react';
import { Edit, Trash2, Plus, CheckCircle2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Goal } from '@/types/database';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onContribute: (id: string, amount: number) => void;
}

export const GoalCard = ({ goal, onEdit, onDelete, onContribute }: GoalCardProps) => {
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');

  const percentage = (goal.current_amount / goal.target_amount) * 100;
  const remaining = goal.target_amount - goal.current_amount;
  const isCompleted = goal.status === 'COMPLETED';

  const daysRemaining = goal.target_date
    ? differenceInDays(new Date(goal.target_date), new Date())
    : null;

  const priorityColors = {
    LOW: 'text-blue-600',
    MEDIUM: 'text-yellow-600',
    HIGH: 'text-red-600',
  };

  const priorityLabels = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };

  const handleContribute = () => {
    const amount = parseFloat(contributeAmount);
    if (amount > 0) {
      onContribute(goal.id, amount);
      setContributeAmount('');
      setIsContributeOpen(false);
    }
  };

  return (
    <>
      <Card className={isCompleted ? 'border-green-500 bg-green-50/50' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
            <CardTitle className="text-sm font-medium">{goal.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            {!isCompleted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsContributeOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(goal)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(goal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(goal.current_amount)}
              </span>
            </div>
            <Progress value={Math.min(percentage, 100)} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta</span>
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(goal.target_amount)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {isCompleted ? 'Concluída!' : 'Falta'}
              </span>
              <span className={`font-semibold ${isCompleted ? 'text-green-600' : ''}`}>
                {isCompleted
                  ? '🎉'
                  : new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(remaining)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {percentage.toFixed(1)}% alcançado
            </div>
          </div>

          {goal.priority && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prioridade</span>
              <span className={priorityColors[goal.priority]}>
                {priorityLabels[goal.priority]}
              </span>
            </div>
          )}

          {goal.target_date && !isCompleted && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prazo</span>
              <span className={daysRemaining && daysRemaining < 30 ? 'text-red-600' : ''}>
                {daysRemaining !== null && daysRemaining >= 0
                  ? `${daysRemaining} dias`
                  : 'Prazo expirado'}
              </span>
            </div>
          )}

          {goal.category && (
            <div className="text-xs text-muted-foreground">
              Categoria: {goal.category}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Contribuição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da Contribuição</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContributeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleContribute}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
