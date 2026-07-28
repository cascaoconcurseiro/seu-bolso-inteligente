/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";
import { moneyUtils } from "@/utils/money";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutGrid } from "lucide-react";

interface CreditCardCategoriesProps {
  transactions: any[];
}

export function CreditCardCategories({ transactions }: CreditCardCategoriesProps) {
  const { data: categories = [] } = useCategories();

  const categoryData = useMemo(() => {
    const map: Record<string, { value: number; count: number; icon: string }> = {};
    const expenses = transactions.filter((t) => t.type === "EXPENSE");

    expenses.forEach((tx) => {
      let categoryName = "Sem categoria";
      let categoryIcon = "🏷️";

      if (
        tx.category &&
        tx.category.id &&
        tx.category.name &&
        tx.category.name !== "null" &&
        tx.category.name !== "undefined"
      ) {
        const catId = tx.category.id;
        const catInfo = categories.find((c) => c.id === catId);

        if (catInfo) {
          categoryIcon = catInfo.icon || "🏷️";
          if (catInfo.parent_category_id) {
            const parentCat = categories.find((c) => c.id === catInfo.parent_category_id);
            if (parentCat) {
              categoryName = `${parentCat.name} › ${catInfo.name}`.trim();
              categoryIcon = parentCat.icon || categoryIcon;
            } else {
              categoryName = catInfo.name.trim();
            }
          } else {
            categoryName = catInfo.name.trim();
          }
        } else {
          categoryName = tx.category.name;
          categoryIcon = tx.category.icon || "🏷️";
        }
      }

      if (
        !categoryName ||
        categoryName.trim() === "" ||
        categoryName === "null" ||
        categoryName === "undefined"
      ) {
        categoryName = "Sem categoria";
      }

      const finalAmount = Number(tx.amount || 0);

      if (finalAmount > 0) {
        if (!map[categoryName]) map[categoryName] = { value: 0, count: 0, icon: categoryIcon };
        map[categoryName].value = SafeFinancialCalculator.add(
          map[categoryName].value,
          finalAmount
        ).toNumber();
        map[categoryName].count += 1;
      }
    });

    const total = SafeFinancialCalculator.safeSum(
      Object.values(map).map((c) => c.value)
    ).toNumber();

    return Object.entries(map)
      .map(([category, d]) => ({
        category,
        icon: d.icon,
        value: d.value,
        count: d.count,
        percent: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  if (categoryData.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhum gasto por categoria"
        description="Nenhuma despesa registrada nesta fatura ainda."
      />
    );
  }

  return (
    <div className="bg-card/40 border border-border/50 rounded-2xl p-5 shadow-sm mt-4 mb-6">
      <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2">
        <span>Resumo por Categoria</span>
      </h3>

      <div className="space-y-4">
        {categoryData.map((item) => (
          <div key={item.category} className="group relative">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-none">{item.category}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {item.count} {item.count === 1 ? "transação" : "transações"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground leading-none">
                  {moneyUtils.format(item.value)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 font-semibold">{item.percent}%</p>
              </div>
            </div>

            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/80 transition-all duration-1000 ease-out"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
