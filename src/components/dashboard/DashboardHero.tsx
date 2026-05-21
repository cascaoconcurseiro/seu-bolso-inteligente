import { moneyUtils } from "@/utils/money";
import { Globe, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  balance: number;
  income: number;
  expenses: number;
  currency: string;
  formatCurrency: (value: number) => string;
}

export function DashboardHero({
  balance,
  income,
  expenses,
  currency,
  formatCurrency,
}: DashboardHeroProps) {
  return (
    <div className="relative group overflow-hidden p-6 md:p-8 rounded-[2rem] border border-border/50 bg-gradient-to-br from-card/80 via-card/50 to-muted/30 backdrop-blur-xl animate-fade-in-up">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-colors duration-1000" />
      <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-colors duration-1000" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded-lg bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
             </div>
             <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
               Patrimônio Total Estimado ({currency})
             </p>
          </div>
          
          <h1 className={cn(
            "font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tighter transition-all duration-500",
            balance >= 0 ? "text-foreground" : "text-destructive"
          )}>
            {formatCurrency(balance)}
          </h1>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 group/income transition-all hover:bg-green-500/15">
              <div className="p-1.5 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/20 group-hover/income:scale-110 transition-transform">
                <TrendingUp className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-green-600/70 font-bold uppercase tracking-wider">Entradas</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(income)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 group/expense transition-all hover:bg-red-500/15">
              <div className="p-1.5 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 group-hover/expense:scale-110 transition-transform">
                <TrendingDown className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-red-600/70 font-bold uppercase tracking-wider">Saídas</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(expenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
