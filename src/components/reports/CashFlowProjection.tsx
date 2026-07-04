import { useMemo } from "react";
import { addMonths, format, startOfMonth, endOfMonth, isFuture, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";

interface CashFlowProjectionProps {
  transactions: any[];
  currentBalance: number;
}

export function CashFlowProjection({ transactions, currentBalance }: CashFlowProjectionProps) {
  const projection = useMemo(() => {
    // Get recurring transactions (have series_id) that occur in future months
    const now = new Date();
    const months = Array.from({ length: 4 }, (_, i) => {
      const d = addMonths(now, i);
      return {
        date: d,
        start: startOfMonth(d),
        end: endOfMonth(d),
        label: format(d, "MMMM yyyy", { locale: ptBR }),
      };
    });

    // Use past 3 months transactions to infer expected monthly patterns
    // Group by series_id and project their future occurrences
    const recurring = transactions.filter(
      (tx) =>
        tx.series_id &&
        !tx.deleted_at &&
        (isFuture(new Date(tx.date)) || isThisMonth(new Date(tx.date)))
    );

    // For non-recurring, use the average of the past 3 months as baseline
    const past3Start = startOfMonth(addMonths(now, -3));
    const past = transactions.filter(
      (tx) =>
        !tx.deleted_at && new Date(tx.date) >= past3Start && new Date(tx.date) < startOfMonth(now)
    );

    const avgIncome =
      past
        .filter((tx) => tx.type === "INCOME")
        .reduce((s, tx) => SafeFinancialCalculator.add(s, Math.abs(tx.amount)), 0) / 3;
    const avgExpense =
      past
        .filter((tx) => tx.type === "EXPENSE")
        .reduce((s, tx) => SafeFinancialCalculator.add(s, Math.abs(tx.amount)), 0) / 3;

    let runningBalance = currentBalance;

    return months.map((m) => {
      // Recurring in this month
      const monthRecurring = recurring.filter((tx) => {
        const d = new Date(tx.date);
        return d >= m.start && d <= m.end;
      });
      const recIncome = monthRecurring
        .filter((tx) => tx.type === "INCOME")
        .reduce((s, tx) => SafeFinancialCalculator.add(s, Math.abs(tx.amount)), 0);
      const recExpense = monthRecurring
        .filter((tx) => tx.type === "EXPENSE")
        .reduce((s, tx) => SafeFinancialCalculator.add(s, Math.abs(tx.amount)), 0);

      const isCurrentMonth = isThisMonth(m.date);
      const income = isCurrentMonth ? recIncome : Math.max(recIncome, avgIncome);
      const expense = isCurrentMonth ? recExpense : Math.max(recExpense, avgExpense);
      const net = income - expense;
      runningBalance += net;

      return { ...m, income, expense, net, runningBalance, isCurrentMonth };
    });
  }, [transactions, currentBalance]);

  return (
    <div className="rounded-4xl border border-border/40 bg-card/50 backdrop-blur-md shadow-sm overflow-hidden">
      <div className="p-5 md:p-6 border-b border-border/40">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
          Fluxo de Caixa Projetado · Próximos 4 meses
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Baseado em transações recorrentes e média dos últimos 3 meses.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/40">
        {projection.map((m) => (
          <div key={m.label} className={cn("p-4 space-y-3", m.isCurrentMonth && "bg-primary/5")}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground capitalize">
                {m.label}
              </p>
              {m.isCurrentMonth && (
                <span className="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Este mês
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-success" />
                  Entradas
                </span>
                <span className="text-xs font-semibold text-success">
                  {moneyUtils.format(m.income, "BRL")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-destructive" />
                  Saídas
                </span>
                <span className="text-xs font-semibold text-destructive">
                  {moneyUtils.format(m.expense, "BRL")}
                </span>
              </div>
              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Minus className="w-3 h-3" />
                  Resultado
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    m.net >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {m.net >= 0 ? "+" : ""}
                  {moneyUtils.format(m.net, "BRL")}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">Saldo projetado</p>
              <p
                className={cn(
                  "text-sm font-bold mt-0.5",
                  m.runningBalance >= 0 ? "text-foreground" : "text-destructive"
                )}
              >
                {moneyUtils.format(m.runningBalance, "BRL")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
