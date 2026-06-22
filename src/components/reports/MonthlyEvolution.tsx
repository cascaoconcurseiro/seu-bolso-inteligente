import { moneyUtils } from "@/utils/money";
interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyEvolutionProps {
  data: MonthlyData[];
  formatCurrency: (value: number, currency?: string) => string;
  currency: string;
}

export function MonthlyEvolution({ data, formatCurrency, currency }: MonthlyEvolutionProps) {
  if (data.length === 0) {
    return (
      <section className="p-5 md:p-8 rounded-4xl border border-border/40 bg-card/50 backdrop-blur-md shadow-sm">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium mb-6">
          Evolução Mensal
        </h2>
        <div className="py-8 text-center text-muted-foreground">Nenhum dado disponível</div>
      </section>
    );
  }

  const maxMonthValue = Math.max(...data.flatMap(m => [m.income, m.expense]), 1);

  return (
    <section className="p-5 md:p-8 rounded-4xl border border-border/40 bg-card/50 backdrop-blur-md shadow-sm">
      <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium mb-4 md:mb-6">
        Evolução Mensal
      </h2>
      <div className="space-y-4">
        {data.map((month) => (
          <div key={month.month} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium w-10">{month.month}</span>
              <div className="flex-1 mx-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-positive rounded-full transition-all"
                      style={{ width: `${(month.income / maxMonthValue) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm text-positive w-24 text-right">
                    {formatCurrency(month.income, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-negative rounded-full transition-all"
                      style={{ width: `${(month.expense / maxMonthValue) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm text-negative w-24 text-right">
                    {formatCurrency(month.expense, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-positive" />
          <span className="text-sm text-muted-foreground">Entradas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-negative" />
          <span className="text-sm text-muted-foreground">Saídas</span>
        </div>
      </div>
    </section>
  );
}
