interface CategoryData {
  category: string;
  value: number;
  count: number;
  percent: number;
}

interface CategoryDistributionProps {
  data: CategoryData[];
  formatCurrency: (value: number, currency?: string) => string;
  currency: string;
}

import { ScrollArea } from "@/components/ui/scroll-area";

export function CategoryDistribution({ data, formatCurrency, currency }: CategoryDistributionProps) {
  return (
    <section className="p-5 md:p-8 rounded-[2rem] border border-border/40 bg-card/50 backdrop-blur-md shadow-sm">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4 md:mb-6">
        Gastos por Categoria
      </h2>
      {data.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">Nenhuma despesa registrada</div>
      ) : (
        <ScrollArea className="h-[460px] pr-4">
          <div className="space-y-3">
            {data.map((cat, index) => (
              <div key={cat.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate flex-1">{cat.category}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono">{formatCurrency(cat.value, currency)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{cat.percent}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ 
                      width: `${cat.percent}%`,
                      opacity: 1 - (index * 0.08)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
