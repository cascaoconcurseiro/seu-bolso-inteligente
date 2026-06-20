import { moneyUtils } from "@/utils/money";
import { Globe, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { InfoTooltip } from "@/components/ui/info-tooltip";

const WealthEvolutionChart = lazy(() => import("./WealthEvolutionChart"));

interface DashboardHeroProps {
  balance: number;
  totalPatrimony?: number;
  income: number;
  expenses: number;

  currency: string;
  formatCurrency: (value: number) => string;
  wealthHistory?: { month_label: string; balance: number; }[];
  monthlyBudget?: number | null;
  realTimeRate?: number | null;
  isRateLoading?: boolean;
}

export function DashboardHero({
  balance,
  totalPatrimony = 0,
  income,
  expenses,

  currency,
  formatCurrency,
  wealthHistory,
  monthlyBudget,
  realTimeRate,
  isRateLoading,
}: DashboardHeroProps) {
  const { isPrivate } = usePrivacy();

  // O balance já é o saldo real das contas. Os pendentes são apenas informativos (chips abaixo).
  // Somar pending aqui causaria duplicação pois eles já fazem parte do saldo bancário registrado.
  const predictedBalance = balance;

  return (
    <div className="relative group overflow-hidden p-6 md:p-8 rounded-[2rem] border border-border/50 bg-gradient-to-br from-card/80 via-card/50 to-muted/30 backdrop-blur-xl animate-fade-in-up">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-colors duration-1000" />
      <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-colors duration-1000" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
               <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
               </div>
               <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold flex items-center gap-1">
                 Saldo das Contas ({currency})
                 <InfoTooltip content="Soma do saldo atual de todas as suas contas correntes e poupanças. Não inclui investimentos nem reserva de emergência." />
               </p>
            </div>

            {currency !== "BRL" && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm animate-in fade-in zoom-in duration-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {isRateLoading ? (
                  <span className="h-3 w-16 bg-primary/20 animate-pulse rounded" />
                ) : realTimeRate ? (
                  <span>1 {currency} = {moneyUtils.format(realTimeRate, "BRL")}</span>
                ) : (
                  <span>Cotando...</span>
                )}
              </div>
            )}
          </div>
          
          <h1 className={cn(
            "font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tighter transition-all duration-500",
            predictedBalance >= 0 ? "text-primary" : "text-destructive",
            isPrivate && "blur-md opacity-50 select-none"
          )}>
            {isPrivate ? "R$ •••••" : formatCurrency(predictedBalance)}
          </h1>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 group/patrimony transition-all hover:bg-blue-500/15">
              <div className="p-1.5 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/20 group-hover/patrimony:scale-110 transition-transform">
                <Globe className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-blue-600/70 font-bold uppercase tracking-wider">Patrimônio</p>
                <p className={cn("text-sm font-bold text-blue-600", isPrivate && "blur-md opacity-50 select-none")}>
                  {isPrivate ? "•••••" : formatCurrency(totalPatrimony)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 group/income transition-all hover:bg-green-500/15">
              <div className="p-1.5 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/20 group-hover/income:scale-110 transition-transform">
                <TrendingUp className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-green-600/70 font-bold uppercase tracking-wider">Entradas</p>
                <p className={cn("text-sm font-bold text-green-600", isPrivate && "blur-md opacity-50 select-none")}>
                  {isPrivate ? "•••••" : formatCurrency(income)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 group/expense transition-all hover:bg-red-500/15">
              <div className="p-1.5 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 group-hover/expense:scale-110 transition-transform">
                <TrendingDown className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-red-600/70 font-bold uppercase tracking-wider">Saídas</p>
                <p className={cn("text-sm font-bold text-red-600", isPrivate && "blur-md opacity-50 select-none")}>
                  {isPrivate ? "•••••" : formatCurrency(expenses)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sparkline de Evolução Patrimonial dos últimos 6 meses */}
        {wealthHistory && wealthHistory.length > 0 && (
          <Suspense fallback={
            <div className="w-full lg:w-[280px] h-[90px] rounded-2xl border border-border/30 bg-card/10 backdrop-blur-sm p-3.5 relative overflow-hidden group/chart animate-pulse">
              <div className="w-1/2 h-3 bg-muted rounded mb-2"></div>
              <div className="w-full h-full bg-muted/50 rounded-lg mt-2"></div>
            </div>
          }>
            <WealthEvolutionChart 
              wealthHistory={wealthHistory} 
              formatCurrency={formatCurrency} 
            />
          </Suspense>
        )}
      </div>

      {/* Barra de Progresso do Orçamento Mensal Global */}
      {(monthlyBudget ?? 0) > 0 && (
        <div className="mt-8 pt-6 border-t border-border/30">
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Target className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
                  Orçamento do Mês
                  <InfoTooltip content="Configurado nas suas preferências. Ajuda a limitar os gastos (saídas) totais do mês corrente." />
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(expenses)} <span className="text-muted-foreground font-normal">/ {formatCurrency(monthlyBudget)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-xs font-bold",
                expenses > monthlyBudget ? "text-destructive" : "text-emerald-500"
              )}>
                {((expenses / monthlyBudget) * 100).toFixed(1)}% utilizado
              </p>
            </div>
          </div>
          <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                expenses > monthlyBudget ? "bg-destructive" : 
                expenses > monthlyBudget * 0.8 ? "bg-orange-500" : 
                "bg-emerald-500"
              )}
              style={{ width: `${Math.min((expenses / monthlyBudget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

