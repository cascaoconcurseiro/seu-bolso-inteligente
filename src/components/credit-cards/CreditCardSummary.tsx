import { CreditCard, ShieldAlert, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditCardSummaryProps {
  totalInvoices: number;
  totalDebt: number;
  nextDueDate: number;
  formatCurrency: (value: number) => string;
}

export function CreditCardSummary({
  totalInvoices,
  totalDebt,
  nextDueDate,
  formatCurrency,
}: CreditCardSummaryProps) {
  return (
    <div className="space-y-4 mb-6 animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Faturas Atuais */}
        <div className="group flex flex-col gap-2 p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm sm:text-sm text-primary/70 uppercase font-bold tracking-widest">Faturas do Mês</p>
            <div className="p-1.5 rounded-lg bg-primary/15">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <p className="font-mono font-bold text-base sm:text-base text-foreground tracking-tight leading-none mt-1">
            {formatCurrency(totalInvoices)}
          </p>
        </div>

        {/* Dívida Total */}
        <div className="group flex flex-col gap-2 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm sm:text-sm text-red-600/70 dark:text-red-400/70 uppercase font-bold tracking-widest">Dívida Total Geral</p>
            <div className="p-1.5 rounded-lg bg-red-500/15">
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            </div>
          </div>
          <p className="font-mono font-bold text-base sm:text-base text-red-600 dark:text-red-400 tracking-tight leading-none mt-1">
            {formatCurrency(totalDebt)}
          </p>
        </div>

        {/* Próximo Vencimento */}
        <div className={cn(
          "group flex flex-col gap-2 p-4 rounded-2xl border transition-colors",
          nextDueDate <= 3 
            ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10" 
            : "border-border bg-card hover:bg-muted/50"
        )}>
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-xs sm:text-xs uppercase font-bold tracking-widest",
              nextDueDate <= 3 ? "text-amber-600/70 dark:text-amber-400/70" : "text-muted-foreground"
            )}>
              Próximo Vencimento
            </p>
            <div className={cn(
              "p-1.5 rounded-lg",
              nextDueDate <= 3 ? "bg-amber-500/15" : "bg-muted"
            )}>
              <CalendarClock className={cn(
                "h-3.5 w-3.5",
                nextDueDate <= 3 ? "text-amber-500" : "text-muted-foreground"
              )} />
            </div>
          </div>
          <p className={cn(
            "font-display font-bold text-lg sm:text-xl tracking-tight leading-none mt-1",
            nextDueDate <= 3 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}>
            {nextDueDate > 0 ? `${nextDueDate} ${nextDueDate === 1 ? 'dia' : 'dias'}` : "Hoje"}
          </p>
        </div>
      </div>


    </div>
  );
}
