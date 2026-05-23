import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionSummaryProps {
  totalIncome: number;
  totalExpense: number;
  formatCurrency: (value: number) => string;
}

export function TransactionSummary({ totalIncome, totalExpense, formatCurrency }: TransactionSummaryProps) {
  const result = totalIncome - totalExpense;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in-up">
      {/* Entradas */}
      <div className="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-xs text-green-600/70 dark:text-green-400/70 uppercase font-bold tracking-widest">Entradas</p>
          <div className="p-1 sm:p-1.5 rounded-lg bg-green-500/15">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
          </div>
        </div>
        <p className="font-mono font-bold text-sm sm:text-base text-green-600 dark:text-green-400 tabular-nums leading-tight">
          +{formatCurrency(totalIncome)}
        </p>
      </div>

      {/* Saídas */}
      <div className="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-xs text-red-600/70 dark:text-red-400/70 uppercase font-bold tracking-widest">Saídas</p>
          <div className="p-1 sm:p-1.5 rounded-lg bg-red-500/15">
            <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />
          </div>
        </div>
        <p className="font-mono font-bold text-sm sm:text-base text-red-600 dark:text-red-400 tabular-nums leading-tight">
          -{formatCurrency(totalExpense)}
        </p>
      </div>

      {/* Resultado */}
      <div className={cn(
        "group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border transition-colors",
        result >= 0
          ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
          : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
      )}>
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-[10px] sm:text-xs uppercase font-bold tracking-widest",
            result >= 0 ? "text-primary/70" : "text-amber-600/70 dark:text-amber-400/70"
          )}>
            Resultado
          </p>
          <div className={cn(
            "p-1 sm:p-1.5 rounded-lg",
            result >= 0 ? "bg-primary/15" : "bg-amber-500/15"
          )}>
            <Scale className={cn(
              "h-3 w-3 sm:h-3.5 sm:w-3.5",
              result >= 0 ? "text-primary" : "text-amber-500"
            )} />
          </div>
        </div>
        <p className={cn(
          "font-mono font-bold text-sm sm:text-base tabular-nums leading-tight",
          result >= 0 ? "text-primary" : "text-amber-600 dark:text-amber-400"
        )}>
          {result >= 0 ? "+" : "-"}{formatCurrency(Math.abs(result))}
        </p>
      </div>
    </div>
  );
}
