import { Link } from "react-router-dom";
import { CreditCard, Users, ArrowUpRight } from "lucide-react";

export function DashboardQuickAccess() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-4 w-full">
      <Link
        to="/cartoes"
        className="flex-1 group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift bg-card"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <p className="font-medium">Cartões de Crédito</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
      </Link>

      <Link
        to="/compartilhados"
        className="flex-1 group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 card-animated hover-lift bg-card"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-secondary group-hover:scale-110 transition-transform" />
          </div>
          <p className="font-medium">Compartilhados</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
      </Link>
    </div>
  );
}
