import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, XCircle, CreditCard, Bell } from "lucide-react";
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Insights Proativos</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight) => {
          let colorClass = "";
          let Icon = Bell;
          
          switch (insight.type) {
            case "DANGER":
              colorClass = "border-red-500/20 bg-red-500/10 text-red-500";
              Icon = insight.icon === 'trending-down' ? TrendingDown : XCircle;
              break;
            case "WARNING":
              colorClass = "border-amber-500/20 bg-amber-500/10 text-amber-500";
              Icon = insight.icon === 'credit-card' ? CreditCard : AlertTriangle;
              break;
            case "SUCCESS":
              colorClass = "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
              Icon = TrendingUp;
              break;
            case "INFO":
              colorClass = "border-blue-500/20 bg-blue-500/10 text-blue-500";
              break;
          }

          return (
            <div key={insight.id} className={`p-4 rounded-xl border flex gap-3 items-start ${colorClass}`}>
              <div className="mt-0.5">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold">{insight.title}</h4>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
