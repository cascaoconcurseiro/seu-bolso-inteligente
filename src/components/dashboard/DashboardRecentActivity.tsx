import { memo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { parseDateUTC as parseDate } from "@/utils/dateUtils";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Activity } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { EmptyState } from "@/components/ui/empty-state";

interface DashboardRecentActivityProps {
  recentTransactions: any[];
  formatCurrencyWithSymbol: (value: number, currency: string) => string;
}

export const DashboardRecentActivity = memo(function DashboardRecentActivity({
  recentTransactions,
  formatCurrencyWithSymbol,
}: DashboardRecentActivityProps) {
  const { isPrivate } = usePrivacy();

  return (
    <section className="space-y-3" aria-labelledby="recent-activity-title">
      <div className="flex min-h-11 items-center justify-between">
        <h2 id="recent-activity-title" className="text-base font-semibold text-foreground">
          Atividade recente
        </h2>
        <Link
          to="/transacoes"
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver todas
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhuma atividade"
          description="Você ainda não registrou nenhuma transação recente no seu controle financeiro."
        />
      ) : (
        <ol
          className="divide-y divide-border border-y border-border"
          aria-label="Transações recentes"
        >
          {recentTransactions.map((tx) => {
            let txDate: Date;
            try {
              txDate = tx.date ? parseDate(tx.date) : new Date();
            } catch {
              txDate = new Date();
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const txMidnight = new Date(txDate);
            txMidnight.setHours(0, 0, 0, 0);

            let dateLabel = txDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            if (txMidnight.getTime() === today.getTime()) dateLabel = "Hoje";
            else if (txMidnight.getTime() === yesterday.getTime()) dateLabel = "Ontem";

            const isIncome = tx.type === "INCOME";
            const isTransfer = tx.type === "TRANSFER";

            return (
              <li
                key={tx.id}
                className="flex min-h-16 items-center justify-between gap-3 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base",
                      isIncome
                        ? "bg-success/10 text-success"
                        : isTransfer
                          ? "bg-accent/10 text-accent"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tx.category?.icon || (isIncome ? "💰" : isTransfer ? "⇄" : "💸")}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground md:text-base">
                        {tx.description}
                      </p>
                      {tx.is_shared && (
                        <>
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-accent"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Compartilhada</span>
                        </>
                      )}
                    </div>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">
                        {tx.category?.name || (isTransfer ? "Transferência" : "Geral")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">{dateLabel}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums md:text-base",
                      isIncome ? "text-success" : isTransfer ? "text-accent" : "text-foreground",
                      isPrivate && "blur-md opacity-50 select-none"
                    )}
                  >
                    {isPrivate
                      ? "•••••"
                      : `${isIncome ? "+" : isTransfer ? "" : "-"}${formatCurrencyWithSymbol(Number(tx.amount), tx.currency || "BRL")}`}
                  </p>
                  {isTransfer &&
                    tx.destination_amount &&
                    tx.destination_currency &&
                    (tx.currency || "BRL") !== tx.destination_currency && (
                      <p
                        className={cn(
                          "mt-0.5 text-sm font-medium tabular-nums text-success",
                          isPrivate && "blur-md opacity-50 select-none"
                        )}
                        title="Valor convertido creditado"
                      >
                        {isPrivate
                          ? "➔ •••••"
                          : `➔ ${formatCurrencyWithSymbol(Number(tx.destination_amount), tx.destination_currency)}`}
                      </p>
                    )}
                  <p className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                    {isIncome ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : isTransfer ? (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isIncome ? "Entrada" : isTransfer ? "Transferência" : "Saída"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
});
