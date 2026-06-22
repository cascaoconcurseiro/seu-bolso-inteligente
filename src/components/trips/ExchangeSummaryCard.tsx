import { ExchangeSummary } from "@/types/tripExchange";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { TrendingUp, Wallet, ArrowRightLeft, Hash, DollarSign, RefreshCcw, Activity } from "lucide-react";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";

interface ExchangeSummaryCardProps {
  summary: ExchangeSummary;
  currency: string;
  /** Total de gastos na moeda da viagem (opcional) */
  totalExpenses?: number;
}

/**
 * Calcula o equivalente em BRL usando a taxa média de câmbio
 */
function calculateBRLEquivalent(foreignAmount: number, averageRate: number): number {
  if (averageRate <= 0) return 0;
  return foreignAmount * averageRate;
}

export function ExchangeSummaryCard({ summary, currency, totalExpenses }: ExchangeSummaryCardProps) {
  const currencySymbol = getCurrencySymbol(currency);
  
  // Calcula equivalente em BRL dos gastos usando taxa média
  const expensesBRLEquivalent = totalExpenses && summary.weightedAverageRate > 0
    ? calculateBRLEquivalent(totalExpenses, summary.weightedAverageRate)
    : null;

  const { data: realTimeRate, isLoading: isRateLoading } = useCurrencyRate(currency, "BRL");

  return (
    <div className="p-6 rounded-xl border border-border bg-muted/30">
      <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-medium mb-4">
        Resumo do Câmbio
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total em moeda estrangeira */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Total Comprado</span>
          </div>
          <p className="font-mono text-base font-bold">
            {currencySymbol} {summary.totalForeignPurchased.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Total gasto em BRL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-sm">Total em R$</span>
          </div>
          <p className="font-mono text-base font-bold">
            R$ {summary.totalLocalSpent.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Média ponderada */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Câmbio Médio</span>
          </div>
          <p className="font-mono text-base font-bold">
            {summary.weightedAverageRate > 0
              ? `R$ ${summary.weightedAverageRate.toLocaleString("pt-BR", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}`
              : "—"}
          </p>
        </div>

        {/* Quantidade de compras */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-4 w-4" />
            <span className="text-sm">Compras</span>
          </div>
          <p className="font-mono text-base font-bold">
            {summary.purchaseCount}
          </p>
        </div>

        {/* Cotação em Tempo Real */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Cotação Atual</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-base font-bold text-primary">
              {isRateLoading ? (
                <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : realTimeRate ? (
                `R$ ${realTimeRate.toLocaleString("pt-BR", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}`
              ) : (
                "—"
              )}
            </p>
            {!isRateLoading && realTimeRate && summary.weightedAverageRate > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                realTimeRate < summary.weightedAverageRate ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
              }`}>
                {((realTimeRate / summary.weightedAverageRate - 1) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Equivalente em BRL dos gastos - Req 10 */}
      {expensesBRLEquivalent !== null && totalExpenses !== undefined && totalExpenses > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Gastos da viagem em BRL (estimado)</span>
            </div>
            <div className="text-right">
              <p className="font-mono text-base font-bold text-primary">
                R$ {expensesBRLEquivalent.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {currencySymbol} {totalExpenses.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} × R$ {summary.weightedAverageRate.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
