import { moneyUtils } from "@/utils/money";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSummaryProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  formatCurrency: (value: number, currency?: string) => string;
  currency: string;
}

export function ReportSummary({
  totalIncome,
  totalExpense,
  balance,
  savingsRate,
  formatCurrency,
  currency
}: ReportSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Entradas */}
      <div className="p-3.5 xs:p-4 sm:p-5 rounded-xl border border-border min-w-0 flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2 truncate">
          <TrendingUp className="h-4 w-4 text-positive shrink-0" />
          <span className="truncate">Entradas</span>
        </div>
        <p 
          className="font-mono text-sm xs:text-base sm:text-2xl font-bold text-positive truncate select-all" 
          title={formatCurrency(totalIncome, currency)}
        >
          {formatCurrency(totalIncome, currency)}
        </p>
      </div>

      {/* 2. Saídas */}
      <div className="p-3.5 xs:p-4 sm:p-5 rounded-xl border border-border min-w-0 flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2 truncate">
          <TrendingDown className="h-4 w-4 text-negative shrink-0" />
          <span className="truncate">Saídas</span>
        </div>
        <p 
          className="font-mono text-sm xs:text-base sm:text-2xl font-bold text-negative truncate select-all" 
          title={formatCurrency(totalExpense, currency)}
        >
          {formatCurrency(totalExpense, currency)}
        </p>
      </div>

      {/* 3. Resultado */}
      <div className="p-3.5 xs:p-4 sm:p-5 rounded-xl border border-border min-w-0 flex flex-col justify-between">
        <div className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
          Resultado
        </div>
        <p 
          className={cn(
            "font-mono text-sm xs:text-base sm:text-2xl font-bold truncate select-all",
            balance >= 0 ? "text-positive" : "text-negative"
          )}
          title={`${balance >= 0 ? "+" : ""}${formatCurrency(balance, currency)}`}
        >
          {balance >= 0 ? "+" : ""}{formatCurrency(balance, currency)}
        </p>
      </div>

      {/* 4. Taxa de Economia */}
      <div className="p-3.5 xs:p-4 sm:p-5 rounded-xl bg-foreground text-background min-w-0 flex flex-col justify-between">
        <div className="text-xs sm:text-sm opacity-70 mb-2 truncate">
          Taxa de Economia
        </div>
        <p className="font-display text-xl xs:text-2xl sm:text-3xl font-bold truncate">
          {savingsRate.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
