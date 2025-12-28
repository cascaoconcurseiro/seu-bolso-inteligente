import { ExchangeSummary } from "@/types/tripExchange";
import { getCurrencySymbol, formatCurrencyWithSymbol } from "@/services/exchangeCalculations";
import { TrendingUp, Wallet, ArrowRightLeft, Hash } from "lucide-react";

interface ExchangeSummaryCardProps {
  summary: ExchangeSummary;
  currency: string;
}

export function ExchangeSummaryCard({ summary, currency }: ExchangeSummaryCardProps) {
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="p-6 rounded-xl border border-border bg-muted/30">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
        Resumo do Câmbio
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total em moeda estrangeira */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-xs">Total Comprado</span>
          </div>
          <p className="font-mono text-xl font-bold">
            {currencySymbol} {summary.totalForeignPurchased.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Total gasto em BRL */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-xs">Total em R$</span>
          </div>
          <p className="font-mono text-xl font-bold">
            R$ {summary.totalLocalSpent.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Média ponderada */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Câmbio Médio</span>
          </div>
          <p className="font-mono text-xl font-bold">
            {summary.weightedAverageRate > 0
              ? `R$ ${summary.weightedAverageRate.toLocaleString("pt-BR", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}`
              : "—"}
          </p>
        </div>

        {/* Quantidade de compras */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-4 w-4" />
            <span className="text-xs">Compras</span>
          </div>
          <p className="font-mono text-xl font-bold">
            {summary.purchaseCount}
          </p>
        </div>
      </div>
    </div>
  );
}
