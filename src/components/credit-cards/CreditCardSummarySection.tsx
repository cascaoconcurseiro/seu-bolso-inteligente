import { CreditCard, Wallet, ArrowRight } from "lucide-react";

interface CreditCardSummarySectionProps {
  totalInvoices: number;
  totalDebt: number;
  nextDueDate: number;
  formatCurrency: (value: number) => string;
}

export function CreditCardSummarySection({
  totalInvoices,
  totalDebt,
  nextDueDate,
  formatCurrency,
}: CreditCardSummarySectionProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="col-span-2 md:col-span-1 p-6 rounded-2xl border-2 bg-muted/30 border-border transition-all hover:bg-muted/40 group">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <p className="text-sm font-medium text-muted-foreground">Faturas do Mês</p>
        </div>
        <p className="font-display font-bold text-3xl tracking-tight">
          {formatCurrency(totalInvoices)}
        </p>
      </div>

      <div className="p-6 rounded-2xl border-2 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 transition-all hover:bg-red-100/50 dark:hover:bg-red-950/30 group">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-medium text-muted-foreground">Dívida Total</p>
        </div>
        <p className="font-display font-bold text-3xl tracking-tight text-red-600 dark:text-red-400">
          {formatCurrency(totalDebt)}
        </p>
      </div>

      <div className="p-6 rounded-2xl border-2 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50 transition-all hover:bg-amber-100/50 dark:hover:bg-amber-950/30 group">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight className="h-5 w-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
          <p className="text-sm font-medium text-muted-foreground">Próximo Vencimento</p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="font-display font-bold text-3xl tracking-tight text-amber-600 dark:text-amber-400">
            {nextDueDate === Infinity ? "0" : nextDueDate}
          </p>
          <span className="text-sm font-medium text-muted-foreground">dias</span>
        </div>
      </div>
    </div>
  );
}
