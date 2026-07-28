import { memo } from "react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";
import { useBillsDue } from "@/hooks/useBillsDue";
import { useUpdateTransaction } from "@/hooks/transactions/useTransactionMutations";
import { format as formatDate } from "date-fns";

function dueDateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return { label: "Hoje", urgent: true };
  if (isTomorrow(d)) return { label: "Amanhã", urgent: true };
  return { label: format(d, "EEE, dd MMM", { locale: ptBR }), urgent: false };
}

export const DashboardBillsDue = memo(function DashboardBillsDue() {
  const { data: bills = [], isLoading } = useBillsDue(7);
  const updateTransaction = useUpdateTransaction();

  if (isLoading || bills.length === 0) return null;

  const handleMarkPaid = (bill: (typeof bills)[0]) => {
    const today = formatDate(new Date(), "yyyy-MM-dd");
    updateTransaction.mutate({ id: bill.id, date: today });
  };

  return (
    <section className="border-t-2 border-warning" aria-labelledby="bills-due-title">
      <div className="flex items-start gap-2.5 py-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <h2 id="bills-due-title" className="text-base font-semibold text-foreground">
            A pagar esta semana
          </h2>
          <p className="text-sm text-muted-foreground">
            {bills.length} conta{bills.length !== 1 ? "s" : ""} vence{bills.length === 1 ? "" : "m"}{" "}
            nos próximos 7 dias
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {bills.map((bill) => {
          const { label, urgent } = dueDateLabel(bill.date);
          return (
            <li key={bill.id} className="flex min-h-16 items-center gap-3 py-2">
              <span className="shrink-0 text-lg" aria-hidden="true">
                {bill.category?.icon || "📋"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{bill.description}</p>
                <p className={cn("text-sm", urgent ? "text-warning" : "text-muted-foreground")}>
                  {urgent && (
                    <AlertCircle
                      className="mr-1 inline h-3.5 w-3.5 -translate-y-px"
                      aria-hidden="true"
                    />
                  )}
                  {label} · {bill.account?.name || "Conta"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-sm font-semibold tabular-nums text-destructive">
                  {moneyUtils.format(bill.amount, bill.currency || "BRL")}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-lg hover:bg-success/10 hover:text-success"
                  title="Marcar como pago"
                  aria-label={`Marcar ${bill.description} como paga`}
                  onClick={() => handleMarkPaid(bill)}
                  disabled={updateTransaction.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
