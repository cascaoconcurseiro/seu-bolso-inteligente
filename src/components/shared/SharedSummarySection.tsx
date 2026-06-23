import { Plane, CreditCard, ArrowRight, ArrowLeft } from "lucide-react";
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
            <div className="col-span-2 md:col-span-1 p-4 md:p-6 rounded-xl border-2 bg-muted/30 border-border transition-all hover:bg-muted/40 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
              </div>
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {Object.entries(totalsByCurrency).map(([currency, data]) => (
                  <div key={currency}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground uppercase">{currency}</span>
                      <p className={cn(
                        "font-mono text-xl md:text-2xl font-bold",
                        data.balance >= 0 ? "text-success dark:text-success" : "text-destructive dark:text-destructive"
                      )}>
                        {data.balance >= 0 ? "+" : ""}{formatCurrency(data.balance, currency)}
                      </p>
                    </div>
                    {data.settled > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-muted-foreground">Acertado</span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {formatCurrency(data.settled, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-success/20 bg-success/5 hover:bg-success/12 transition-colors flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ArrowLeft className="h-5 w-5 text-success" />
                <p className="text-sm font-bold text-green-600/80 dark:text-green-400/80 uppercase tracking-widest">A Receber</p>
              </div>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {Object.entries(totalsByCurrency)
                  .filter(([_, data]) => data.owedToMe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-base md:text-2xl font-bold text-success dark:text-success">
                        {formatCurrency(data.owedToMe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(totalsByCurrency).every(d => d.owedToMe === 0) && (
                  <p className="text-muted-foreground/50 text-center text-sm py-2 font-mono">R$ 0,00</p>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/12 transition-colors flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ArrowRight className="h-5 w-5 text-destructive" />
                <p className="text-sm font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-widest">A Pagar</p>
              </div>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {Object.entries(totalsByCurrency)
                  .filter(([_, data]) => data.iOwe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-base md:text-2xl font-bold text-destructive dark:text-destructive">
                        {formatCurrency(data.iOwe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(totalsByCurrency).every(d => d.iOwe === 0) && (
                  <p className="text-muted-foreground/50 text-center text-sm py-2 font-mono">R$ 0,00</p>
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
            <div className="col-span-2 md:col-span-1 p-4 md:p-6 rounded-xl border-2 bg-accent/5 dark:bg-accent/10 border-accent/20 transition-all hover:bg-accent/10 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <CreditCard className="h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-muted-foreground">Meu Saldo</p>
              </div>
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {Object.entries(travelTotalsByCurrency).map(([currency, data]) => (
                  <div key={currency}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground uppercase">{currency}</span>
                      <p className={cn(
                        "font-mono text-xl md:text-2xl font-bold",
                        data.balance >= 0 ? "text-success dark:text-success" : "text-destructive dark:text-destructive"
                      )}>
                        {data.balance >= 0 ? "+" : ""}{formatCurrency(data.balance, currency)}
                      </p>
                    </div>
                    {data.settled > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-muted-foreground">Acertado</span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {formatCurrency(data.settled, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-success/20 bg-success/5 hover:bg-success/12 transition-colors flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ArrowLeft className="h-5 w-5 text-success" />
                <p className="text-sm font-bold text-green-600/80 dark:text-green-400/80 uppercase tracking-widest">A Receber</p>
              </div>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {Object.entries(travelTotalsByCurrency)
                  .filter(([_, data]) => data.owedToMe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-base md:text-2xl font-bold text-success dark:text-success">
                        {formatCurrency(data.owedToMe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(travelTotalsByCurrency).every(d => d.owedToMe === 0) && (
                  <p className="text-muted-foreground/50 text-center text-sm py-2 font-mono">R$ 0,00</p>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/12 transition-colors flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ArrowRight className="h-5 w-5 text-destructive" />
                <p className="text-sm font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-widest">A Pagar</p>
              </div>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {Object.entries(travelTotalsByCurrency)
                  .filter(([_, data]) => data.iOwe > 0)
                  .map(([currency, data]) => (
                    <div key={currency} className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground uppercase">{currency}</span>
                      <p className="font-mono text-base md:text-2xl font-bold text-destructive dark:text-destructive">
                        {formatCurrency(data.iOwe, currency)}
                      </p>
                    </div>
                  ))}
                {Object.values(travelTotalsByCurrency).every(d => d.iOwe === 0) && (
                  <p className="text-muted-foreground/50 text-center text-sm py-2 font-mono">R$ 0,00</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
