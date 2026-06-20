import { AlertTriangle, Globe, Pencil, Trash2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";

interface BudgetCardProps {
  budget: any;
  formatCurrency: (value: number, curr: string) => string;
  onEdit: (budget: any) => void;
  onDelete: (id: string) => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const spent = Number(budget.spent_amount) || 0;
  const budgetAmount = Number(budget.budget_amount) || 0;
  const percentage = Number(budget.percentage_used) || 0;
  const isOverBudget = percentage > 100;
  const isWarning = percentage > 80 && percentage <= 100;

  return (
    <div
      className={cn(
        "group relative p-6 rounded-[2rem] border transition-all duration-500 overflow-hidden",
        isOverBudget 
          ? "border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/5"
          : isWarning
            ? "border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5"
            : "border-border/50 bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
      )}
    >
      {/* Background Decor */}
      <div className={cn(
        "absolute -right-12 -top-12 w-32 h-32 blur-[60px] opacity-20 transition-colors duration-700",
        isOverBudget ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
      )} />

      <div className="relative flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner transition-transform group-hover:scale-110 duration-500",
            isOverBudget 
              ? "bg-red-500/10 text-red-500" 
              : isWarning 
                ? "bg-amber-500/10 text-amber-500" 
                : "bg-muted text-foreground"
          )}>
            {budget.category_icon || "💰"}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg tracking-tight leading-none mb-1 text-foreground/90">
              {budget.budget_name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                {budget.category_name || "GLOBAL"}
              </span>
              {budget.currency !== "BRL" && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                  <Globe className="h-2.5 w-2.5" />
                  {budget.currency}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(budget)} 
            className="p-2 hover:bg-muted rounded-xl transition-all hover:scale-110 active:scale-95"
            title="Editar Orçamento"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button 
            onClick={() => onDelete(budget.budget_id)} 
            className="p-2 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-95 text-destructive"
            title="Excluir Orçamento"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-end justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Consumido</p>
              <p className={cn(
                "text-2xl font-display font-black tracking-tighter transition-colors",
                isOverBudget ? "text-red-600" : isWarning ? "text-amber-600" : "text-foreground"
              )}>
                {moneyUtils.format(spent, budget.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Limite</p>
              <p className="font-mono font-bold text-sm text-muted-foreground">
                {moneyUtils.format(budgetAmount, budget.currency)}
              </p>
            </div>
          </div>
          
          <div className="relative w-full bg-muted/60 rounded-full h-3.5 overflow-hidden shadow-inner border border-border/40">
            <div 
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,0,0,0.15)]", 
                isOverBudget ? "bg-gradient-to-r from-red-600 to-red-400" : isWarning ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-primary via-primary/80 to-blue-400"
              )} 
              style={{ width: `${Math.min(percentage, 100)}%` }} 
            />
            {/* Efeito de listras animadas para overbudget */}
            {isOverBudget && (
              <div 
                className="absolute top-0 left-0 h-full w-full opacity-30" 
                style={{ 
                  backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
                  backgroundSize: '1rem 1rem',
                  animation: 'progress-stripes 1s linear infinite'
                }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {isOverBudget ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-bold uppercase animate-pulse">
                <AlertTriangle className="h-3 w-3" /> Excedido
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 text-[10px] font-bold uppercase">
                <TrendingDown className="h-3 w-3" /> Dentro do Limite
              </div>
            )}
          </div>
          <p className={cn(
            "text-xs font-bold",
            isOverBudget ? "text-red-600" : isWarning ? "text-amber-600" : "text-muted-foreground"
          )}>
            {percentage.toFixed(0)}% <span className="font-normal opacity-60">utilizado</span>
          </p>
        </div>
      </div>
    </div>
  );
}
