import { Plane, CreditCard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SharedSummarySectionProps {
  totalsByCurrency: Record<string, { owedToMe: number; iOwe: number; balance: number; settled: number }>;
  travelTotalsByCurrency: Record<string, { owedToMe: number; iOwe: number; balance: number; settled: number }>;
  formatCurrency: (value: number, currency: string) => string;
  activeTab?: "REGULAR" | "TRAVEL" | "HISTORY";
}

export function SharedSummarySection({
  totalsByCurrency,
  travelTotalsByCurrency,
  formatCurrency,
  activeTab,
}: SharedSummarySectionProps) {
  const showRegular = (activeTab === "REGULAR" || activeTab === "HISTORY") && Object.keys(totalsByCurrency).length > 0;
  const showTravel = activeTab === "TRAVEL" && Object.keys(travelTotalsByCurrency).length > 0;

  return (
    <div className="space-y-4">
      {showRegular && Object.keys(totalsByCurrency).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Regular</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="col-span-2 md:col-span-1 p-4 md:p-6 rounded-xl border-2 bg-muted/30 border-border transition-all hover:bg-muted/40">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
              </div>
              <div className="space-y-2">
                {Object.entries(totalsByCurrency).map(([currency, data]) => (
                  <div key={currency}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                      <p className={cn(
                        "font-mono text-lg md:text-xl font-bold",
                        data.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {data.balance >= 0 ? "+" : ""}{formatCurrency(data.balance, currency)}
                      </p>
                    </div>
                    {data.settled > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">Acertado</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatCurrency(data.settled, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-5 w-5 text-green-500 rotate-180" />
                <p className="text-sm font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-widest">A Receber</p>
              </div>
              <div className="space-y-2">
                {Object.entries(totalsByCurrency)
                  .filter(([_, data]) => data.owedToMe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(data.owedToMe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(totalsByCurrency).every(d => d.owedToMe === 0) && (
                  <p className="text-muted-foreground text-center text-sm py-2 opacity-50">R$ 0,00</p>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-5 w-5 text-red-500" />
                <p className="text-sm font-medium text-red-600/70 dark:text-red-400/70 uppercase tracking-widest">A Pagar</p>
              </div>
              <div className="space-y-2">
                {Object.entries(totalsByCurrency)
                  .filter(([_, data]) => data.iOwe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-lg md:text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(data.iOwe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(totalsByCurrency).every(d => d.iOwe === 0) && (
                  <p className="text-muted-foreground text-center text-sm py-2 opacity-50">R$ 0,00</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showTravel && Object.keys(travelTotalsByCurrency).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Viagens
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="col-span-2 md:col-span-1 p-4 md:p-6 rounded-xl border-2 bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/50 transition-all hover:bg-blue-50/50">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
              </div>
              <div className="space-y-2">
                {Object.entries(travelTotalsByCurrency).map(([currency, data]) => (
                  <div key={currency}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                      <p className={cn(
                        "font-mono text-lg md:text-xl font-bold",
                        data.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {data.balance >= 0 ? "+" : ""}{formatCurrency(data.balance, currency)}
                      </p>
                    </div>
                    {data.settled > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">Acertado</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatCurrency(data.settled, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-5 w-5 text-green-500 rotate-180" />
                <p className="text-sm font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-widest">A Receber</p>
              </div>
              <div className="space-y-2">
                {Object.entries(travelTotalsByCurrency)
                  .filter(([_, data]) => data.owedToMe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(data.owedToMe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(travelTotalsByCurrency).every(d => d.owedToMe === 0) && (
                  <p className="text-muted-foreground text-center text-sm py-2 opacity-50">$ 0.00</p>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-5 w-5 text-red-500" />
                <p className="text-sm font-medium text-red-600/70 dark:text-red-400/70 uppercase tracking-widest">A Pagar</p>
              </div>
              <div className="space-y-2">
                {Object.entries(travelTotalsByCurrency)
                  .filter(([_, data]) => data.iOwe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-lg md:text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(data.iOwe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(travelTotalsByCurrency).every(d => d.iOwe === 0) && (
                  <p className="text-muted-foreground text-center text-sm py-2 opacity-50">$ 0.00</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
