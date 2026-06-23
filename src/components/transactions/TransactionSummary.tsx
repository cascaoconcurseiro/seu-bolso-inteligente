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
      <div className="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border border-success/20 bg-success/5 hover:bg-success/12 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-sm sm:text-sm text-success/70 dark:text-success/70 uppercase font-bold tracking-widest">Entradas</p>
          <div className="p-1 sm:p-2 rounded-lg bg-success/15">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" />
          </div>
        </div>
        <p className="font-mono font-bold text-sm sm:text-base text-success dark:text-success tabular-nums leading-tight">
          +{formatCurrency(totalIncome)}
        </p>
      </div>

      {/* Saídas */}
      <div className="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/12 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-sm sm:text-sm text-destructive/70 dark:text-destructive/70 uppercase font-bold tracking-widest">Saídas</p>
          <div className="p-1 sm:p-2 rounded-lg bg-destructive/15">
            <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
          </div>
        </div>
        <p className="font-mono font-bold text-sm sm:text-base text-destructive dark:text-destructive tabular-nums leading-tight">
          -{formatCurrency(totalExpense)}
        </p>
      </div>

      {/* Resultado */}
      <div className={cn(
        "group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border transition-colors",
        result >= 0
          ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
          : "border-warning/20 bg-warning/5 hover:bg-warning/10"
      )}>
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-xs sm:text-xs uppercase font-bold tracking-widest",
            result >= 0 ? "text-primary/70" : "text-warning/70 dark:text-warning/70"
          )}>
            Resultado
          </p>
          <div className={cn(
            "p-1 sm:p-2 rounded-lg",
            result >= 0 ? "bg-primary/15" : "bg-warning/15"
          )}>
            <Scale className={cn(
              "h-3 w-3 sm:h-3.5 sm:w-3.5",
              result >= 0 ? "text-primary" : "text-warning"
            )} />
          </div>
        </div>
        <p className={cn(
          "font-mono font-bold text-sm sm:text-base tabular-nums leading-tight",
          result >= 0 ? "text-primary" : "text-warning dark:text-warning"
        )}>
          {result >= 0 ? "+" : "-"}{formatCurrency(Math.abs(result))}
        </p>
      </div>
    </div>
  );
}
