import { Transaction } from "@/hooks/useTransactions";

export type InsightType = "WARNING" | "INFO" | "SUCCESS" | "DANGER";

export interface CategoryInsight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  icon: string;
}

export class CategoryInsightsService {
  /**
   * Gera insights proativos baseados nos gastos do usuário
   * @param transactions Transações do mês atual
   * @param budgets Orçamentos definidos
   * @param creditCards Cartões de crédito e seus limites
   * @param financialSummary Resumo financeiro (receitas vs despesas)
   */
  static generateInsights(
    transactions: Transaction[],
    budgets: any[],
    creditCards: any[],
    financialSummary: { income: number; expenses: number }
  ): CategoryInsight[] {
    const insights: CategoryInsight[] = [];
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    // 1. Insight de Alerta de Orçamento Estourando Precocemente
    if (budgets && budgets.length > 0) {
      budgets.forEach(budget => {
        const spent = budget.spent || 0;
        const total = budget.amount || 0;
        
        if (total > 0) {
          const spentPercentage = spent / total;
          
          // Se gastou mais de 80% e ainda não passamos de 80% do mês
          if (spentPercentage > 0.8 && monthProgress < 0.8) {
            insights.push({
              id: `budget-warn-${budget.id}`,
              type: "WARNING",
              title: "Orçamento em Risco",
              message: `Você já consumiu ${(spentPercentage * 100).toFixed(0)}% do seu orçamento de ${budget.category?.name || 'Categoria'} e o mês ainda não acabou.`,
              icon: "alert-triangle"
            });
          }
          // Se gastou mais de 100%
          else if (spentPercentage >= 1) {
            insights.push({
              id: `budget-danger-${budget.id}`,
              type: "DANGER",
              title: "Orçamento Excedido",
              message: `Você ultrapassou o orçamento definido para ${budget.category?.name || 'Categoria'}.`,
              icon: "x-circle"
            });
          }
        }
      });
    }

    // 2. Insight de Cartão de Crédito Próximo ao Limite
    if (creditCards && creditCards.length > 0) {
      creditCards.forEach(card => {
        // Encontrar gastos deste cartão no mês atual
        const cardTxs = transactions.filter(t => t.account_id === card.id && t.type === "EXPENSE");
        const spentOnCard = cardTxs.reduce((sum, t) => sum + t.amount, 0);
        
        // Aqui assumimos que credit_limit existe, mas se houver fatura total, idealmente seria a soma.
        if (card.credit_limit && card.credit_limit > 0) {
          // Se o gasto atual + saldo da fatura for alto? Vamos usar uma lógica simplificada para demonstração:
          // Como não temos a fatura fechada aqui, usamos o balance atual (que na nossa arquitetura é negativo se estiver devendo)
          const currentDebt = Math.abs(card.balance || 0);
          const limitPercentage = currentDebt / card.credit_limit;

          if (limitPercentage > 0.85) {
            insights.push({
              id: `card-warn-${card.id}`,
              type: "WARNING",
              title: "Limite do Cartão",
              message: `Cuidado com o cartão ${card.name}! Você já utilizou mais de 85% do limite.`,
              icon: "credit-card"
            });
          }
        }
      });
    }

    // 3. Insight de Despesas vs Receitas (Taxa de Poupança Negativa)
    if (financialSummary.expenses >= financialSummary.income && financialSummary.expenses > 0) {
      insights.push({
        id: "expenses-high",
        type: "DANGER",
        title: "Atenção ao Fluxo de Caixa",
        message: "Suas despesas superaram ou igualaram suas receitas neste mês.",
        icon: "trending-down"
      });
    } else if (financialSummary.income > 0) {
      const savingRate = ((financialSummary.income - financialSummary.expenses) / financialSummary.income) * 100;
      if (savingRate >= 20) {
        insights.push({
          id: "savings-good",
          type: "SUCCESS",
          title: "Ótimo Desempenho",
          message: `Sua taxa de poupança está em ${savingRate.toFixed(1)}%. Continue assim!`,
          icon: "trending-up"
        });
      }
    }

    // Limitar para não poluir a tela (mostrar no máximo os 3 mais importantes)
    return insights.sort((a, b) => {
      const priority = { DANGER: 3, WARNING: 2, INFO: 1, SUCCESS: 0 };
      return priority[b.type] - priority[a.type];
    }).slice(0, 3);
  }
}
