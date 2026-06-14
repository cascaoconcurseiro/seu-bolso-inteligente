import { Link } from "react-router-dom";
import { CreditCard, Users, ArrowUpRight } from "lucide-react";

export function DashboardQuickAccess() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <Link
        to="/cartoes"
        className="flex-1 group relative overflow-hidden rounded-2xl p-5 border border-border/80 bg-card hover:border-indigo-500/50 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shadow-sm group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/30 transition-colors duration-300">
              <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <p className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Cartões de Crédito</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Gerenciar faturas e limites</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center border border-border/50 group-hover:border-indigo-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-all duration-300">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>
        </div>
      </Link>

      <Link
        to="/compartilhados"
        className="flex-1 group relative overflow-hidden rounded-2xl p-5 border border-border/80 bg-card hover:border-emerald-500/50 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shadow-sm group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/30 transition-colors duration-300">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <p className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Compartilhados</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Despesas em grupo</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center border border-border/50 group-hover:border-emerald-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-all duration-300">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>
        </div>
      </Link>
    </div>
  );
}
