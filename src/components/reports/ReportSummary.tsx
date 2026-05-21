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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <TrendingUp className="h-4 w-4 text-positive" />
          Entradas
        </div>
        <p className="font-mono text-2xl font-bold text-positive">{formatCurrency(totalIncome, currency)}</p>
      </div>
      <div className="p-5 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <TrendingDown className="h-4 w-4 text-negative" />
          Saídas
        </div>
        <p className="font-mono text-2xl font-bold text-negative">{formatCurrency(totalExpense, currency)}</p>
      </div>
      <div className="p-5 rounded-xl border border-border">
        <p className="text-sm text-muted-foreground mb-2">Resultado</p>
        <p className={cn(
          "font-mono text-2xl font-bold",
          balance >= 0 ? "text-positive" : "text-negative"
        )}>
          {balance >= 0 ? "+" : ""}{formatCurrency(balance, currency)}
        </p>
      </div>
      <div className="p-5 rounded-xl bg-foreground text-background">
        <p className="text-sm opacity-70 mb-2">Taxa de Economia</p>
        <p className="font-display text-3xl font-bold">
          {savingsRate.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
