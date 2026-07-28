import { moneyUtils } from "@/utils/money";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { lazy, Suspense, useMemo, memo } from "react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { InfoTooltip } from "@/components/ui/info-tooltip";

const WealthEvolutionChart = lazy(() => import("./WealthEvolutionChart"));

interface DashboardHeroProps {
  balance: number;
  totalPatrimony?: number;
  income: number;
  expenses: number;

  currency: string;
  formatCurrency: (value: number) => string;
  wealthHistory?: { month_label: string; balance: number }[];
  monthlyBudget?: number | null;
  realTimeRate?: number | null;
  isRateLoading?: boolean;
}

export const DashboardHero = memo(function DashboardHero({
  balance,
  totalPatrimony = 0,
  income,
  expenses,

  currency,
  formatCurrency,
  wealthHistory,
  monthlyBudget,
  realTimeRate,
  isRateLoading,
}: DashboardHeroProps) {
  const { isPrivate } = usePrivacy();

  const savingsRate = useMemo(() => {
    if (income <= 0) return 0;
    const rate = ((income - expenses) / income) * 100;
    return Math.round(rate);
  }, [income, expenses]);

  // O balance já é o saldo real das contas. Os pendentes são apenas informativos (chips abaixo).
  // Somar pending aqui causaria duplicação pois eles já fazem parte do saldo bancário registrado.
  const predictedBalance = balance;
  const budgetUsage =
    (monthlyBudget ?? 0) > 0 ? Number(((expenses / (monthlyBudget ?? 0)) * 100).toFixed(1)) : 0;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      aria-labelledby="dashboard-balance-title"
    >
      <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
        <div className="min-w-0">
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <p id="dashboard-balance-title" className="text-sm font-medium text-muted-foreground">
                {`Saldo das contas em ${currency}`}
              </p>
              <InfoTooltip content="Soma do saldo atual de todas as suas contas correntes e poupanças. Não inclui investimentos nem reserva de emergência." />
            </div>

            {currency !== "BRL" && (
              <div className="text-sm text-muted-foreground" aria-live="polite">
                {isRateLoading ? (
                  <span className="inline-block h-4 w-28 animate-pulse rounded bg-muted" />
                ) : realTimeRate ? (
                  <span>
                    1 {currency} = {moneyUtils.format(realTimeRate, "BRL")}
                  </span>
                ) : (
                  <span>Cotação indisponível</span>
                )}
              </div>
            )}
          </div>

          <h1
            className={cn(
              "mt-1 font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl",
              predictedBalance >= 0 ? "text-foreground" : "text-destructive",
              isPrivate && "blur-md opacity-50 select-none"
            )}
          >
            {isPrivate ? "R$ •••••" : formatCurrency(predictedBalance)}
          </h1>

          <dl className="mt-6 grid grid-cols-2 border-t border-border sm:grid-cols-4">
            <div className="min-w-0 py-3 pr-3 sm:border-r sm:border-border">
              <dt className="text-sm text-muted-foreground">Patrimônio</dt>
              <dd
                className={cn(
                  "mt-1 truncate text-sm font-semibold tabular-nums text-foreground",
                  isPrivate && "blur-md opacity-50 select-none"
                )}
              >
                {isPrivate ? "•••••" : formatCurrency(totalPatrimony)}
              </dd>
            </div>
            <div className="min-w-0 border-l border-border py-3 pl-3 sm:border-l-0 sm:border-r sm:pr-3">
              <dt className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
                Entradas
              </dt>
              <dd
                className={cn(
                  "mt-1 truncate text-sm font-semibold tabular-nums text-positive",
                  isPrivate && "blur-md opacity-50 select-none"
                )}
              >
                {isPrivate ? "•••••" : formatCurrency(income)}
              </dd>
            </div>
            <div className="min-w-0 border-t border-border py-3 pr-3 sm:border-r sm:border-t-0">
              <dt className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4 text-destructive" aria-hidden="true" />
                Saídas
              </dt>
              <dd
                className={cn(
                  "mt-1 truncate text-sm font-semibold tabular-nums text-negative",
                  isPrivate && "blur-md opacity-50 select-none"
                )}
              >
                {isPrivate ? "•••••" : formatCurrency(expenses)}
              </dd>
            </div>
            <div className="min-w-0 border-l border-t border-border py-3 pl-3 sm:border-l-0 sm:border-t-0">
              <dt className="text-sm text-muted-foreground">Taxa de poupança</dt>
              <dd
                className={cn(
                  "mt-1 text-sm font-semibold tabular-nums",
                  income <= 0
                    ? "text-muted-foreground"
                    : savingsRate >= 0
                      ? "text-positive"
                      : "text-warning",
                  isPrivate && "blur-md opacity-50 select-none"
                )}
              >
                {isPrivate
                  ? "•••"
                  : income > 0
                    ? `${savingsRate > 0 ? "+" : ""}${savingsRate}%`
                    : "Sem entradas"}
              </dd>
            </div>
          </dl>
        </div>

        {wealthHistory && wealthHistory.length > 0 && (
          <Suspense
            fallback={
              <div
                className="h-[90px] w-full animate-pulse rounded-xl border border-border p-3.5 lg:w-[280px]"
                aria-label="Carregando evolução patrimonial"
                aria-busy="true"
              >
                <div className="mb-2 h-3 w-1/2 rounded bg-muted" />
                <div className="mt-2 h-full w-full rounded-lg bg-muted/50" />
              </div>
            }
          >
            <WealthEvolutionChart wealthHistory={wealthHistory} formatCurrency={formatCurrency} />
          </Suspense>
        )}
      </div>

      {(monthlyBudget ?? 0) > 0 && (
        <div className="border-t border-border bg-muted/20 px-5 py-4 md:px-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-foreground">Orçamento do mês</p>
                <InfoTooltip content="Configurado nas suas preferências. Ajuda a limitar os gastos (saídas) totais do mês corrente." />
              </div>
              <p
                className={cn(
                  "text-sm text-muted-foreground",
                  isPrivate && "blur-md opacity-50 select-none"
                )}
              >
                {isPrivate
                  ? "••••• de •••••"
                  : `${formatCurrency(expenses)} de ${formatCurrency(monthlyBudget ?? 0)}`}
              </p>
            </div>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                expenses > (monthlyBudget ?? 0) ? "text-destructive" : "text-foreground",
                isPrivate && "blur-md opacity-50 select-none"
              )}
            >
              {isPrivate ? "•••" : `${budgetUsage.toFixed(1)}% utilizado`}
            </p>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Uso do orçamento mensal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isPrivate ? undefined : Math.min(budgetUsage, 100)}
            aria-valuetext={
              isPrivate
                ? "Valor oculto"
                : `${budgetUsage.toFixed(1)}% utilizado${budgetUsage > 100 ? ", acima do orçamento" : ""}`
            }
          >
            <div
              className={cn(
                "h-full rounded-full",
                expenses > (monthlyBudget ?? 0)
                  ? "bg-destructive"
                  : expenses > (monthlyBudget ?? 0) * 0.8
                    ? "bg-warning"
                    : "bg-success"
              )}
              style={{ width: `${Math.min((expenses / (monthlyBudget ?? 0)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
});
