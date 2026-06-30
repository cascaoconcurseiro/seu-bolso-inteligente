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
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/40">
        <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
          <CalendarClock className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h3 className="font-bold text-sm">A pagar esta semana</h3>
          <p className="text-xs text-muted-foreground">
            {bills.length} conta{bills.length !== 1 ? "s" : ""} vence{bills.length === 1 ? "" : "m"}{" "}
            nos próximos 7 dias
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {bills.map((bill) => {
          const { label, urgent } = dueDateLabel(bill.date);
          return (
            <div
              key={bill.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <span className="text-xl shrink-0">{bill.category?.icon || "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{bill.description}</p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    urgent ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {urgent && <AlertCircle className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
                  {label} · {bill.account?.name || "Conta"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-destructive">
                  {moneyUtils.format(bill.amount, bill.currency || "BRL")}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl hover:bg-success/10 hover:text-success"
                  title="Marcar como pago"
                  onClick={() => handleMarkPaid(bill)}
                  disabled={updateTransaction.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
