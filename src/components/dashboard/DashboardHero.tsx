import { moneyUtils } from "@/utils/money";
import { Globe, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DashboardHeroProps {
  balance: number;
  income: number;
  expenses: number;
  currency: string;
  formatCurrency: (value: number) => string;
  wealthHistory?: { month_label: string; balance: number; }[];
}

export function DashboardHero({
  balance,
  income,
  expenses,
  currency,
  formatCurrency,
  wealthHistory,
}: DashboardHeroProps) {
  const { isPrivate } = usePrivacy();

  // Tendência: positiva se o saldo atual for maior ou igual ao saldo de 6 meses atrás
  const isPositiveTrend = useMemo(() => {
    if (!wealthHistory || wealthHistory.length < 2) return balance >= 0;
    const first = wealthHistory[0].balance;
    const last = wealthHistory[wealthHistory.length - 1].balance;
    return last >= first;
  }, [wealthHistory, balance]);

  const strokeColor = isPositiveTrend ? "#10b981" : "#f43f5e";

  const savings = income - expenses;

  const SparklineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border/50 bg-card/95 px-3 py-1.5 text-[11px] font-bold text-foreground shadow-xl backdrop-blur-md">
          <p className="text-muted-foreground text-[9px] uppercase tracking-wider mb-0.5">
            {payload[0].payload.month_label}
          </p>
          <p className="font-display">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative group overflow-hidden p-6 md:p-8 rounded-[2rem] border border-border/50 bg-gradient-to-br from-card/80 via-card/50 to-muted/30 backdrop-blur-xl animate-fade-in-up">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-colors duration-1000" />
      <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-colors duration-1000" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
             </div>
             <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
               Saldo Mensal Previsto ({currency})
             </p>
          </div>
          
          <h1 className={cn(
            "font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tighter transition-all duration-500",
            savings >= 0 ? "text-primary" : "text-destructive",
            isPrivate && "blur-md opacity-50 select-none"
          )}>
            {isPrivate ? "R$ •••••" : formatCurrency(savings)}
          </h1>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 group/patrimony transition-all hover:bg-blue-500/15">
              <div className="p-1.5 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/20 group-hover/patrimony:scale-110 transition-transform">
                <Globe className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-blue-600/70 font-bold uppercase tracking-wider">Patrimônio</p>
                <p className={cn("text-sm font-bold text-blue-600", isPrivate && "blur-md opacity-50 select-none")}>
                  {isPrivate ? "•••••" : formatCurrency(balance)}
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
          <div className="w-full lg:w-[280px] h-[90px] rounded-2xl border border-border/30 bg-card/10 backdrop-blur-sm p-3.5 relative overflow-hidden group/chart transition-all duration-300 hover:border-border/60">
            <div className="absolute top-2.5 left-3.5 z-10 flex items-center gap-1.5 pointer-events-none">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isPositiveTrend ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              )} />
              <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                Evolução (6 Meses)
              </p>
            </div>
            
            <div className="w-full h-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wealthHistory} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="wealthEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={<SparklineTooltip />}
                    cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={strokeColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#wealthEvolutionGradient)"
                    dot={{ r: 0 }}
                    activeDot={{ r: 4, strokeWidth: 0, fill: strokeColor }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

