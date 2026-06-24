import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankIcon } from "@/components/financial/BankIcon";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

interface DashboardInvoicesProps {
  creditCardsWithBalance: any[];
  formatCurrency: (value: number) => string;
}

export function DashboardInvoices({
  creditCardsWithBalance,
  formatCurrency
}: DashboardInvoicesProps) {
  const cardIds = creditCardsWithBalance.map(c => c.id);

  // Buscar transações dos últimos 4 meses para os cartões de crédito
  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["dashboard-cards-transactions", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      
      // Pegar a partir de 4 meses atrás para cobrir faturas antigas em aberto
      const fourMonthsAgo = dateFns.subMonths(new Date(), 4);
      const startDateStr = dateFns.format(fourMonthsAgo, "yyyy-MM-01");
      
      const { data, error } = await supabase
        .from('transactions')
        .select('id, account_id, destination_account_id, type, amount, competence_date, date')
        .or(`account_id.in.(${cardIds.join(',')}),destination_account_id.in.(${cardIds.join(',')})`)
        .gte('competence_date', startDateStr);
        
      if (error) {
        logger.error("Erro ao buscar transações dos cartões no dashboard", error);
        return [];
      }
      return data;
    },
    enabled: cardIds.length > 0,
    staleTime: 30 * 1000
  });

  if (creditCardsWithBalance.length === 0) return null;
  if (isLoading) return null;

  // Processar cada cartão e calcular a fatura pendente real mais antiga
  const cardsWithPendingInvoices = creditCardsWithBalance
    .map(card => {
      const dueDay = card.due_day || 10;
      const closingDay = card.closing_day || 1;
      const today = new Date();

      // Avaliar os últimos 4 meses até o mês atual + 1 (competência futura/em andamento)
      const monthsToEvaluate: Date[] = [];
      for (let i = 4; i >= -1; i--) {
        monthsToEvaluate.push(dateFns.subMonths(today, i));
      }

      let targetInvoiceMonth: Date | null = null;
      let targetInvoiceTotal = 0;
      let daysUntilDue = 0;
      let isOverdue = false;

      for (const refMonth of monthsToEvaluate) {
        const year = refMonth.getFullYear();
        const month = refMonth.getMonth();
        
        // Filtrar transações da competência refMonth para esse card
        const monthTxs = txs.filter(t => {
          if (t.account_id !== card.id && t.destination_account_id !== card.id) return false;
          if (t.type === 'TRANSFER' && t.destination_account_id !== card.id) return false;
          
          // Tratar timezone com parse seguro
          const txDate = t.competence_date ? dateFns.parse(t.competence_date, "yyyy-MM-dd", new Date()) : new Date(t.date);
          return txDate.getFullYear() === year && txDate.getMonth() === month;
        });
        
        // Calcular total da fatura (Gastos - Recebimentos/Pagamentos)
        const total = monthTxs.reduce((acc, t) => {
          const amt = Number(t.amount);
          if (t.type === 'EXPENSE') return acc + amt;
          if (t.type === 'INCOME') return acc - amt;
          if (t.type === 'TRANSFER' && t.destination_account_id === card.id) return acc - amt;
          if (t.type === 'TRANSFER' && t.account_id === card.id) return acc + amt;
          return acc;
        }, 0);

        // Se a fatura tiver saldo pendente devedor
        if (total > 0.01) {
          const dueDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
          let dueDate = dateFns.parse(dueDateStr, "yyyy-MM-dd", new Date());
          if (dueDay <= closingDay) {
            dueDate = dateFns.addMonths(dueDate, 1);
          }
          
          const diffDays = dateFns.differenceInCalendarDays(dueDate, today);

          // Pega a mais antiga que encontrar
          if (!targetInvoiceMonth) {
            targetInvoiceMonth = refMonth;
            targetInvoiceTotal = total;
            daysUntilDue = diffDays;
            isOverdue = diffDays < 0;
          }
        }
      }

      return {
        ...card,
        targetInvoiceMonth,
        targetInvoiceTotal,
        daysUntilDue,
        isOverdue
      };
    })
    // Filtrar apenas cartões que possuem faturas realmente pendentes
    .filter(c => c.targetInvoiceMonth !== null && c.targetInvoiceTotal > 0.01);

  if (cardsWithPendingInvoices.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in-up stagger-4">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        Faturas pendentes
      </h2>
      <div className="space-y-2">
        {cardsWithPendingInvoices.map((card, index) => {
          const invoiceMonth = card.targetInvoiceMonth!;
          const invoiceDateParam = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;
          
          // Formata o mês de referência (competência) em formato de exibição elegível (ex: Maio/2026)
          const monthLabel = dateFns.format(invoiceMonth, "MMMM/yyyy", { locale: ptBR });
          const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
          
          return (
            <Link
              key={card.id}
              to={`/cartoes?cardId=${card.id}&invoiceDate=${invoiceDateParam}`}
              className={cn(
                "group flex items-center justify-between py-4 border-b border-border/40 last:border-0 hover:bg-card/30 transition-colors animate-stagger -mx-2 px-2 rounded-xl",
                `stagger-${index + 1}`
              )}
            >
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <BankIcon bankId={card.bank_id} accountName={card.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm md:text-base truncate">Fatura {card.name}</p>
                  <p className={cn(
                    "text-xs md:text-sm truncate font-medium",
                    card.isOverdue ? "text-negative" : "text-muted-foreground"
                  )}>
                    {card.isOverdue 
                      ? `Atrasada ${Math.abs(card.daysUntilDue)} dia${Math.abs(card.daysUntilDue) !== 1 ? 's' : ''} • ${capitalizedMonthLabel}` 
                      : card.daysUntilDue === 0 
                        ? `Vence hoje • ${capitalizedMonthLabel}`
                        : `Vence em ${card.daysUntilDue} dia${card.daysUntilDue !== 1 ? 's' : ''} • ${capitalizedMonthLabel}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <span className="text-destructive font-mono font-semibold text-sm md:text-base whitespace-nowrap">
                  -{formatCurrency(card.targetInvoiceTotal)}
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
