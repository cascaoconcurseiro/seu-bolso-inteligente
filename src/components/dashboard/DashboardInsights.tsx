import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, XCircle, CreditCard, Sparkles, Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useDashboardData } from "@/hooks/useDashboard";
import { CategoryInsightsService } from "@/services/CategoryInsightsService";

export function DashboardInsights() {
  const { data: transactions = [] } = useTransactions({ startDate: '2020-01-01', endDate: '2030-12-31' });
  const { data: accounts = [] } = useAccounts();
  const { data: dashboardData } = useDashboardData();

  const insights = useMemo(() => {
    if (!dashboardData) return [];

    const currentMonthTxs = transactions.filter(tx => {
      const now = new Date();
      const txDate = tx.date ? new Date(tx.date) : new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const creditCards = accounts.filter(a => a.type === "CREDIT_CARD");

    const financialSummary = {
      income: dashboardData.totals_by_currency.find(t => t.currency === 'BRL')?.income || 0,
      expenses: dashboardData.totals_by_currency.find(t => t.currency === 'BRL')?.expense || 0,
    };

    // Obter orçamentos (simulado se não tiver hook de orçamento)
    // No app atual, podemos não ter um hook explícito de budgets ainda, 
    // então passamos vazio por enquanto, e a lógica de cartão e fluxo de caixa ainda funciona.
    const budgets: any[] = []; 

    return CategoryInsightsService.generateInsights(
      currentMonthTxs,
      budgets,
      creditCards,
      financialSummary
    );
  }, [transactions, accounts, dashboardData]);

  if (insights.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full h-10 w-10 border-2 transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 bg-accent/10 border-accent text-accent hover:bg-accent/20"
          title="Insights Proativos"
        >
          <Sparkles className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent shadow-[0_0_8px_rgba(37,99,235,0.8)]"></span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-4 rounded-2xl shadow-xl border-border/50">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="p-2 bg-accent/10 text-accent rounded-full">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-semibold tracking-tight text-base">Insights Proativos</h3>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {insights.map((insight) => {
            let colorClass = "";
            let Icon = Bell;
            
            switch (insight.type) {
              case "DANGER":
                colorClass = "border-destructive/20 bg-destructive/12 text-destructive";
                Icon = insight.icon === 'trending-down' ? TrendingDown : XCircle;
                break;
              case "WARNING":
                colorClass = "border-warning/20 bg-warning/10 text-warning";
                Icon = insight.icon === 'credit-card' ? CreditCard : AlertTriangle;
                break;
              case "SUCCESS":
                colorClass = "border-success/20 bg-success/10 text-success";
                Icon = TrendingUp;
                break;
              case "INFO":
                colorClass = "border-accent/20 bg-accent/10 text-accent";
                break;
            }

            return (
              <div key={insight.id} className={`p-3.5 rounded-xl border flex gap-3 items-start ${colorClass}`}>
                <div className="mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold leading-tight">{insight.title}</h4>
                  <p className="text-xs opacity-90 mt-1.5 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
