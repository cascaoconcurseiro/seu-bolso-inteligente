import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankIcon } from "@/components/financial/BankIcon";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardInvoicesProps {
  creditCardsWithBalance: any[];
  formatCurrency: (value: number) => string;
}

export function DashboardInvoices({
  creditCardsWithBalance,
  formatCurrency
}: DashboardInvoicesProps) {
  if (creditCardsWithBalance.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in-up stagger-4">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        Faturas pendentes
      </h2>
      <div className="space-y-2">
        {creditCardsWithBalance.map((card, index) => {
          const dueDay = card.due_day || 10;
          const today = new Date();
          const todayDay = today.getDate();
          
          // Calcula se o vencimento deste mês já passou
          const isDuePassedThisMonth = todayDay > dueDay;
          
          // Se o vencimento deste mês já passou, a fatura em atraso (ou atual pendente) é a deste mês.
          // Se não passou, a fatura em atraso é a do mês anterior.
          const invoiceMonth = isDuePassedThisMonth
            ? new Date(today.getFullYear(), today.getMonth(), 1)
            : new Date(today.getFullYear(), today.getMonth() - 1, 1);
          
          const invoiceDateParam = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;
          const daysUntilDue = dueDay >= todayDay ? dueDay - todayDay : -(todayDay - dueDay);
          
          // Formata o mês de referência (competência) em formato de exibição elegível (ex: Maio/2026)
          const monthLabel = dateFns.format(invoiceMonth, "MMMM/yyyy", { locale: ptBR });
          const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
          
          return (
            <Link
              key={card.id}
              to={`/cartoes?cardId=${card.id}&invoiceDate=${invoiceDateParam}`}
              className={cn(
                "group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift animate-stagger",
                `stagger-${index + 1}`
              )}
            >
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <BankIcon bankId={card.bank_id} accountName={card.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm md:text-base truncate">Fatura {card.name}</p>
                  <p className={cn(
                    "text-xs md:text-sm whitespace-nowrap font-medium",
                    daysUntilDue < 0 ? "text-negative" : "text-muted-foreground"
                  )}>
                    {daysUntilDue < 0 
                      ? `Atrasada ${Math.abs(daysUntilDue)} dia${Math.abs(daysUntilDue) !== 1 ? 's' : ''} • ${capitalizedMonthLabel}` 
                      : `Vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? 's' : ''} • ${capitalizedMonthLabel}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <span className="text-red-500 font-mono font-semibold text-sm md:text-base whitespace-nowrap">
                  -{formatCurrency(Math.abs(Number(card.balance)))}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
