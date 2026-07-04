import { CheckCircle2, Trash2, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";
import {
  useScheduledBills,
  useConfirmScheduledBill,
  useCancelScheduledBill,
} from "@/hooks/useScheduledBills";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

function daysLabel(dateStr: string) {
  const days = differenceInCalendarDays(parseISO(dateStr), startOfDay(new Date()));
  if (days < 0) return { label: `Atrasada ${Math.abs(days)}d`, overdue: true };
  if (days === 0) return { label: "Hoje", overdue: false };
  if (days === 1) return { label: "Amanhã", overdue: false };
  return { label: `${days} dias`, overdue: false };
}

export function ScheduledBillsSection() {
  const { data: bills = [], isLoading } = useScheduledBills();
  const confirm = useConfirmScheduledBill();
  const cancel = useCancelScheduledBill();
  const { isPrivate } = usePrivacy();

  if (isLoading || bills.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Contas agendadas
        </h3>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {bills.length}
        </span>
      </div>

      {bills.map((bill) => {
        const { label, overdue } = daysLabel(bill.date);
        const isExpense = bill.type === "EXPENSE";
        const isIncome = bill.type === "INCOME";
        const isTransfer = bill.type === "TRANSFER";

        const amountColor = isExpense
          ? "text-negative"
          : isIncome
            ? "text-positive"
            : "text-muted-foreground";
        const amountPrefix = isExpense ? "-" : isIncome ? "+" : "↔";

        const defaultIcon = isIncome ? "💰" : isTransfer ? "↔️" : "📋";
        const confirmLabel = isIncome
          ? "Marcar como recebido"
          : isTransfer
            ? "Marcar como realizado"
            : "Marcar como pago";

        const borderClass = overdue
          ? "border-destructive/30 bg-destructive/5"
          : isIncome
            ? "border-positive/20 bg-positive/5"
            : isTransfer
              ? "border-border/60 bg-muted/30"
              : "border-primary/20 bg-primary/5";

        return (
          <div
            key={bill.id}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
              borderClass
            )}
          >
            <span className="text-xl flex-shrink-0">{bill.category?.icon ?? defaultIcon}</span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{bill.description}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    overdue
                      ? "text-destructive"
                      : isIncome
                        ? "text-positive"
                        : isTransfer
                          ? "text-muted-foreground"
                          : "text-primary"
                  )}
                >
                  {label}
                </span>
                {bill.account && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {bill.account.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={cn("text-sm font-bold font-mono tabular-nums mr-1", amountColor)}>
                {isPrivate
                  ? "••••"
                  : amountPrefix + moneyUtils.format(Number(bill.amount), bill.currency ?? "BRL")}
              </span>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg hover:bg-positive/10 hover:text-positive"
                title={confirmLabel}
                onClick={() => confirm.mutate({ id: bill.id })}
                disabled={confirm.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                title="Remover agendamento"
                onClick={() => cancel.mutate(bill.id)}
                disabled={cancel.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
