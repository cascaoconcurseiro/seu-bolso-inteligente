import { useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { moneyUtils } from "@/utils/money";

interface MonthInsightProps {
  income: number;
  expense: number;
  pendingExpense: number;
  currency: string;
  className?: string;
}

interface Insight {
  icon: typeof TrendingUp;
  message: string;
  variant: "positive" | "warning" | "danger" | "neutral";
}

function buildInsight(
  income: number,
  expense: number,
  pendingExpense: number,
  currency: string
): Insight | null {
  if (income === 0 && expense === 0) return null;

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const projectedExpense = expense + pendingExpense;
  const fmt = (v: number) => moneyUtils.format(v, currency);

  if (income > 0 && expense > income) {
    return {
      icon: TrendingDown,
      message: `Despesas ${fmt(expense - income)} acima da receita este mês. Revise os gastos para fechar no azul.`,
      variant: "danger",
    };
  }

  if (pendingExpense > 0 && projectedExpense > income) {
    return {
      icon: AlertTriangle,
      message: `Com ${fmt(pendingExpense)} ainda a pagar, as despesas projetadas superam a receita. Atenção!`,
      variant: "warning",
    };
  }

  if (income > 0 && savingsRate >= 20) {
    return {
      icon: CheckCircle2,
      message: `Você está poupando ${savingsRate.toFixed(0)}% da renda este mês.`,
      variant: "positive",
    };
  }

  if (income > 0 && savingsRate > 0 && savingsRate < 10) {
    return {
      icon: Sparkles,
      message: `Sobrou ${fmt(income - expense)} este mês. Que tal direcionar para uma reserva ou meta?`,
      variant: "neutral",
    };
  }

  if (income === 0 && expense > 0) {
    return {
      icon: AlertTriangle,
      message: `Nenhuma receita registrada este mês. Lembre de lançar seus rendimentos.`,
      variant: "warning",
    };
  }

  return null;
}

const variantStyles = {
  positive: {
    bg: "bg-positive/5 border-positive/20",
    icon: "text-positive bg-positive/10",
    text: "text-positive/80",
  },
  warning: {
    bg: "bg-warning/5 border-warning/20",
    icon: "text-warning bg-warning/10",
    text: "text-warning/80",
  },
  danger: {
    bg: "bg-negative/5 border-negative/20",
    icon: "text-negative bg-negative/10",
    text: "text-negative/80",
  },
  neutral: {
    bg: "bg-accent/5 border-accent/20",
    icon: "text-accent bg-accent/10",
    text: "text-accent/80",
  },
};

export function MonthInsight({
  income,
  expense,
  pendingExpense,
  currency,
  className,
}: MonthInsightProps) {
  const insight = useMemo(
    () => buildInsight(income, expense, pendingExpense, currency),
    [income, expense, pendingExpense, currency]
  );

  if (!insight) return null;

  const styles = variantStyles[insight.variant];
  const Icon = insight.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-2xl border animate-fade-in",
        styles.bg,
        className
      )}
    >
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5",
          styles.icon
        )}
      >
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <p className={cn("text-sm font-medium leading-snug pt-1", styles.text)}>{insight.message}</p>
    </div>
  );
}
