import { Link } from "react-router-dom";
import { CreditCard, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyProjection {
  future_income: number;
  future_expenses: number;
  credit_card_invoices: number;
  shared_debts: number;
  projected_balance?: number;
}

interface DashboardSidebarProps {
  savings: number;
  projectedBalance: number;
  projection: MonthlyProjection | null;
  formatCurrency: (value: number) => string;
}

export function DashboardSidebar({
  savings,
  projectedBalance,
  projection,
  formatCurrency
}: DashboardSidebarProps) {
  return (
    <aside className="lg:col-span-4 space-y-4 md:space-y-6 animate-fade-in-right stagger-6">
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Acesso rápido
        </h2>
        
        <Link
          to="/cartoes"
          className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
            <p className="font-medium">Cartões</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
        </Link>

        <Link
          to="/compartilhados"
          className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
            <p className="font-medium">Compartilhados</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
        </Link>
      </div>

      <div className="p-4 rounded-xl border border-border bg-muted/30 animate-scale-in hover-glow">
        <p className="text-xs text-muted-foreground mb-1">Saldo do mês</p>
        <p className="font-semibold">
          {savings >= 0 ? "Positivo" : "Negativo"}
        </p>
        <p className={cn(
          "text-sm flex items-center gap-1",
          savings >= 0 ? "text-green-500" : "text-red-500"
        )}>
          {savings >= 0 ? <ArrowDownRight className="h-3 w-3 animate-soft-bounce" /> : <ArrowUpRight className="h-3 w-3 animate-soft-bounce" />}
          {formatCurrency(Math.abs(savings))}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-foreground text-background animate-scale-in-bounce hover-lift">
        <p className="text-xs opacity-70 mb-1">Projeção fim do mês</p>
        <p className="font-mono text-2xl font-bold animate-count-up">
          {formatCurrency(projectedBalance)}
        </p>
        
        {projection && (
          projection.future_income > 0 || 
          projection.future_expenses > 0 || 
          projection.credit_card_invoices > 0 || 
          projection.shared_debts > 0
        ) && (
          <div className="mt-3 pt-3 border-t border-background/20 space-y-1 text-xs opacity-80">
            {projection.future_income > 0 && (
              <div className="flex justify-between">
                <span>+ Receitas futuras</span>
                <span>{formatCurrency(projection.future_income)}</span>
              </div>
            )}
            {projection.future_expenses > 0 && (
              <div className="flex justify-between">
                <span>- Despesas futuras</span>
                <span>{formatCurrency(projection.future_expenses)}</span>
              </div>
            )}
            {projection.credit_card_invoices > 0 && (
              <div className="flex justify-between">
                <span>- Faturas cartão</span>
                <span>{formatCurrency(projection.credit_card_invoices)}</span>
              </div>
            )}
            {projection.shared_debts > 0 && (
              <div className="flex justify-between">
                <span>- Compartilhados</span>
                <span>{formatCurrency(projection.shared_debts)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
