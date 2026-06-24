import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface CategoryTrendProps {
  transactions: any[];
  categories: any[];
  formatCurrency: (value: number) => string;
}

export function CategoryTrend({ transactions, categories, formatCurrency }: CategoryTrendProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      result.push({ date: d, label: format(d, "MMM/yy", { locale: ptBR }), start: startOfMonth(d), end: endOfMonth(d) });
    }
    return result;
  }, []);

  // Build category spending matrix: categoryId → month index → total
  const matrix = useMemo(() => {
    const map: Record<string, { name: string; icon: string; months: number[]; total: number }> = {};

    for (const tx of transactions) {
      if (tx.type !== "EXPENSE" || tx.deleted_at) continue;
      const txDate = new Date(tx.date);
      const monthIdx = months.findIndex(m => txDate >= m.start && txDate <= m.end);
      if (monthIdx === -1) continue;

      const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category;
      const catId = cat?.id ?? "sem-categoria";
      const catName = cat?.name ?? "Sem categoria";
      const catIcon = cat?.icon ?? "📋";

      if (!map[catId]) {
        map[catId] = { name: catName, icon: catIcon, months: new Array(12).fill(0), total: 0 };
      }
      map[catId].months[monthIdx] += Math.abs(tx.amount);
      map[catId].total += Math.abs(tx.amount);
    }

    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [transactions, months]);

  const filtered = selectedCategory
    ? matrix.filter(c => c.id === selectedCategory)
    : matrix;

  const maxValue = useMemo(() => Math.max(...matrix.flatMap(c => c.months), 1), [matrix]);

  if (matrix.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground rounded-4xl border border-border/40 bg-card/50">
        <p className="font-medium">Nenhum dado disponível</p>
        <p className="text-sm mt-1">Adicione transações para ver as tendências por categoria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-border/40 bg-card/50 backdrop-blur-md shadow-sm overflow-hidden">
      <div className="p-5 md:p-6 border-b border-border/40">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
          Gastos por Categoria · Últimos 12 meses
        </h2>
      </div>

      {/* Category filter chips */}
      <div className="px-5 pt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
            !selectedCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          Todas
        </button>
        {matrix.slice(0, 8).map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1",
              selectedCategory === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            <span>{c.icon}</span>
            {c.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <ScrollArea className="w-full mt-4">
        <div className="min-w-[700px] p-5 md:p-6 pt-0">
          {/* Header */}
          <div className="grid text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3"
            style={{ gridTemplateColumns: `180px repeat(12, 1fr)` }}
          >
            <div>Categoria</div>
            {months.map(m => (
              <div key={m.label} className="text-center">{m.label}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {filtered.map(cat => {
              const lastMonth = cat.months[11];
              const prevMonth = cat.months[10];
              const trend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : null;

              return (
                <div
                  key={cat.id}
                  className="grid items-center py-2 rounded-xl hover:bg-muted/30 transition-colors group"
                  style={{ gridTemplateColumns: `180px repeat(12, 1fr)` }}
                >
                  <div className="flex items-center gap-2 pr-3">
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{cat.name}</p>
                      {trend !== null && (
                        <p className={cn("text-xs flex items-center gap-0.5", trend > 0 ? "text-destructive" : "text-success")}>
                          {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {Math.abs(trend).toFixed(0)}% vs mês ant.
                        </p>
                      )}
                    </div>
                  </div>

                  {cat.months.map((val, idx) => {
                    const height = val > 0 ? Math.max(4, (val / maxValue) * 40) : 0;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 px-0.5">
                        <div className="w-full flex items-end justify-center h-10">
                          <div
                            className={cn(
                              "w-full max-w-[28px] rounded-t transition-all duration-500",
                              idx === 11 ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"
                            )}
                            style={{ height: `${height}px` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
                          {val > 0 ? formatCurrency(val).replace("R$ ", "").replace("R$ ", "") : "–"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
