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

    </aside>
  );
}
