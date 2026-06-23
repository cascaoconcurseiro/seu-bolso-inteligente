import { Edit, Trash2, ArrowRightLeft, Target, TrendingUp, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moneyUtils } from '@/utils/money';
import { useEconomicIndicators } from "@/hooks/useEconomicIndicators";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { differenceInMonths } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  
  const { data: indicators } = useEconomicIndicators();
  
  let adjustedTarget = goal.target_amount;
  let monthsToTarget = 0;
  
  if (goal.target_date && indicators?.ipca) {
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    monthsToTarget = differenceInMonths(targetDate, now);
    
    if (monthsToTarget > 0) {
      adjustedTarget = SafeFinancialCalculator.calculateInflationAdjustedTarget(
        goal.target_amount,
        monthsToTarget,
        indicators.ipca.value
      );
    }
  }
  
  return (
    <div 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        onEdit(goal);
      }}
      className={cn(
        "group relative bg-card border border-border/50 p-6 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 animate-stagger cursor-pointer",
        `stagger-${(index % 5) + 1}`
      )}
    >
      {/* Decoração de fundo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">{goal.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  goal.status === 'COMPLETED' ? "bg-success/12 text-success" : "bg-primary/10 text-primary"
                )}>
                  {goal.status === 'COMPLETED' ? 'Concluída' : 'Em Progresso'}
                </span>
                {goal.priority === 'HIGH' && (
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-destructive/12 text-destructive uppercase tracking-wider">
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
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-widest mb-1">Acumulado</p>
              <p className="font-display text-2xl xs:text-3xl font-black text-foreground tracking-tighter">
                {moneyUtils.format(goal.current_amount ?? 0, 'BRL')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-widest mb-1">Objetivo</p>
              <p className="text-sm font-mono font-bold text-foreground/70">
                {moneyUtils.format(goal.target_amount, 'BRL')}
              </p>
              {monthsToTarget > 0 && adjustedTarget > goal.target_amount && (
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-mono font-bold text-amber-500/80 mt-0.5 flex items-center justify-end gap-1 cursor-help hover:text-amber-500 transition-colors">
                        Real: {moneyUtils.format(adjustedTarget, 'BRL')} <Info className="h-3 w-3" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent className="w-64 p-3 bg-card border-border/50 shadow-xl rounded-xl z-50">
                      <p className="text-sm leading-relaxed text-foreground/90">
                        Devido à inflação atual de <strong className="text-amber-500">{indicators?.ipca?.value}% ao ano</strong> (IPCA BCB), 
                        você precisará de <strong className="font-mono">{moneyUtils.format(adjustedTarget, 'BRL')}</strong> em {monthsToTarget} meses 
                        para ter o mesmo poder de compra de {moneyUtils.format(goal.target_amount, 'BRL')} hoje.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-lg",
                  percentage >= 100 ? "bg-positive/10" : "bg-primary/10"
                )}>
                  <TrendingUp className={cn(
                    "w-3 h-3",
                    percentage >= 100 ? "text-positive" : "text-primary"
                  )} />
                </div>
                <span className="text-sm font-bold text-foreground/80">
                  {percentage.toFixed(0)}% <span className="text-muted-foreground font-medium">concluído</span>
                </span>
              </div>
              
              {remaining > 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  Faltam <span className="text-foreground font-bold">{moneyUtils.format(remaining, 'BRL')}</span>
                </p>
              )}
            </div>

            <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden shadow-inner border border-border/30">
              <div 
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                  percentage >= 100 
                    ? "bg-gradient-to-r from-positive/80 to-positive" 
                    : "bg-gradient-to-r from-primary via-primary/80 to-accent/60"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <Button 
            variant="default"
            size="sm"
            onClick={() => onContribute(goal)}
            className="w-full mt-4 gap-2 h-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="font-bold text-sm uppercase tracking-wider">Movimentar Saldo</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
