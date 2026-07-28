import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionSummaryProps {
  totalIncome: number;
  totalExpense: number;
  formatCurrency: (value: number) => string;
}

export function TransactionSummary({
  totalIncome,
  totalExpense,
  formatCurrency,
}: TransactionSummaryProps) {
  const result = totalIncome - totalExpense;

  return (
    <dl
      className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-border"
      aria-label="Resumo das transações no período"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:block sm:border-b-0">
        <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-positive" aria-hidden="true" />
          Entradas
        </dt>
        <dd className="mt-0 font-mono text-base font-semibold tabular-nums text-positive sm:mt-2">
          +{formatCurrency(totalIncome)}
        </dd>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:block sm:border-b-0">
        <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingDown className="h-4 w-4 text-negative" aria-hidden="true" />
          Saídas
        </dt>
        <dd className="mt-0 font-mono text-base font-semibold tabular-nums text-negative sm:mt-2">
          -{formatCurrency(totalExpense)}
        </dd>
      </div>

      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 sm:block">
        <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Scale
            className={cn("h-4 w-4", result >= 0 ? "text-primary" : "text-warning")}
            aria-hidden="true"
          />
          Resultado
        </dt>
        <dd
          className={cn(
            "mt-0 font-mono text-base font-semibold tabular-nums sm:mt-2",
            result >= 0 ? "text-foreground" : "text-warning"
          )}
        >
          {result >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(result))}
        </dd>
      </div>
    </dl>
  );
}
