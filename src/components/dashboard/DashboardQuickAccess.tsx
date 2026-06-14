import { Link } from "react-router-dom";
import { CreditCard, Users, ArrowUpRight } from "lucide-react";

export function DashboardQuickAccess() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-4 w-full">
      <Link
        to="/cartoes"
        className="flex-1 group relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-background/50 backdrop-blur-md hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:bg-primary/20 transition-colors duration-300">
              <CreditCard className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <p className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Cartões de Crédito</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gerenciar faturas e limites</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>
        </div>
      </Link>

      <Link
        to="/compartilhados"
        className="flex-1 group relative overflow-hidden rounded-2xl p-5 border border-border/50 bg-background/50 backdrop-blur-md hover:border-secondary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shadow-inner group-hover:bg-secondary/20 transition-colors duration-300">
              <Users className="h-6 w-6 text-secondary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <p className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Compartilhados</p>
              <p className="text-xs text-muted-foreground mt-0.5">Despesas em grupo</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 group-hover:border-secondary/30 group-hover:bg-secondary/5 transition-all duration-300">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>
        </div>
      </Link>
    </div>
  );
}
