import { Edit, Trash2, ArrowRightLeft, Target, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moneyUtils } from '@/utils/money';
import { Goal } from '../../types/database';

interface GoalCardProps {
  goal: Goal;
  index: number;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onContribute: (goal: Goal) => void;
}

export function GoalCard({ goal, index, onEdit, onDelete, onContribute }: GoalCardProps) {
  const percentage = goal.target_amount > 0 ? Math.min(100, Math.max(0, ((goal.current_amount ?? 0) / goal.target_amount) * 100)) : 0;
  const remaining = Math.max(0, goal.target_amount - (goal.current_amount ?? 0));
  
  return (
    <div 
      className={cn(
        "group relative bg-card border border-border/50 p-6 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 animate-stagger",
        `stagger-${(index % 5) + 1}`
      )}
    >
      {/* Decoração de fundo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground leading-tight">{goal.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  goal.status === 'COMPLETED' ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                )}>
                  {goal.status === 'COMPLETED' ? 'Concluída' : 'Em Progresso'}
                </span>
                {goal.priority === 'HIGH' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 uppercase tracking-wider">
                    Prioridade Alta
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(goal)} className="h-8 w-8 rounded-lg hover:bg-primary/10">
              <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(goal)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="w-4 h-4 text-muted-foreground transition-colors" />
            </Button>
          </div>
        </div>

        {goal.description && (
          <p className="text-sm text-muted-foreground/80 mb-6 line-clamp-2 min-h-[40px]">
            {goal.description}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Acumulado</p>
              <p className="text-2xl font-mono font-bold text-foreground tracking-tighter">
                {moneyUtils.format(goal.current_amount ?? 0, 'BRL')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Objetivo</p>
              <p className="text-sm font-mono font-bold text-foreground/70">
                {moneyUtils.format(goal.target_amount, 'BRL')}
              </p>
            </div>
          </div>

          <div className="relative w-full bg-muted/50 rounded-full h-3 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-primary/80 to-blue-400 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/5">
                <TrendingUp className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground/80">
                {percentage.toFixed(0)}% <span className="text-muted-foreground font-medium">concluído</span>
              </span>
            </div>
            
            {remaining > 0 && (
              <p className="text-[11px] font-medium text-muted-foreground">
                Faltam <span className="text-foreground font-bold">{moneyUtils.format(remaining, 'BRL')}</span>
              </p>
            )}
          </div>

          <Button 
            variant="default"
            size="sm"
            onClick={() => onContribute(goal)}
            className="w-full mt-4 gap-2 h-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">Movimentar Saldo</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
