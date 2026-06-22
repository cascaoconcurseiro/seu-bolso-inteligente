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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* 1. Entradas */}
      <div className="p-4 sm:p-6 rounded-4xl border border-border/40 bg-gradient-to-br from-positive/10 to-card min-w-0 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <TrendingUp className="w-16 h-16 text-positive" />
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm sm:text-sm text-muted-foreground font-semibold mb-3 truncate uppercase tracking-widest">
          <span className="truncate">Entradas</span>
        </div>
        <p 
          className="relative z-10 font-display text-base xs:text-base sm:text-3xl font-black text-positive truncate select-all tracking-tight" 
          title={formatCurrency(totalIncome, currency)}
        >
          {formatCurrency(totalIncome, currency)}
        </p>
      </div>

      {/* 2. Saídas */}
      <div className="p-4 sm:p-6 rounded-4xl border border-border/40 bg-gradient-to-br from-negative/10 to-card min-w-0 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <TrendingDown className="w-16 h-16 text-negative" />
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm sm:text-sm text-muted-foreground font-semibold mb-3 truncate uppercase tracking-widest">
          <span className="truncate">Saídas</span>
        </div>
        <p 
          className="relative z-10 font-display text-base xs:text-base sm:text-3xl font-black text-negative truncate select-all tracking-tight" 
          title={formatCurrency(totalExpense, currency)}
        >
          {formatCurrency(totalExpense, currency)}
        </p>
      </div>

      {/* 3. Resultado */}
      <div className="p-4 sm:p-6 rounded-4xl border border-border/40 bg-card/60 backdrop-blur-md min-w-0 flex flex-col justify-between shadow-sm">
        <div className="text-sm sm:text-sm text-muted-foreground font-semibold mb-3 truncate uppercase tracking-widest">
          Resultado
        </div>
        <p 
          className={cn(
            "font-display text-lg xs:text-xl sm:text-3xl font-black truncate select-all tracking-tight",
            balance >= 0 ? "text-positive" : "text-negative"
          )}
          title={`${balance >= 0 ? "+" : ""}${formatCurrency(balance, currency)}`}
        >
          {balance >= 0 ? "+" : ""}{formatCurrency(balance, currency)}
        </p>
      </div>

      {/* 4. Taxa de Economia */}
      <div className="p-4 sm:p-6 rounded-4xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground min-w-0 flex flex-col justify-between shadow-md relative overflow-hidden">
        <div className="text-sm sm:text-sm font-medium opacity-80 mb-3 truncate uppercase tracking-widest">
          Taxa de Economia
        </div>
        <div className="flex items-end gap-2">
          <p className="font-display text-3xl xs:text-3xl sm:text-3xl font-black truncate tracking-tighter">
            {savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
