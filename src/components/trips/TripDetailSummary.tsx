import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, Users, Calendar, Banknote, ArrowRight } from "lucide-react";
import { moneyUtils } from "@/utils/money";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/utils/dateUtils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";

interface TripDetailSummaryProps {
  totalExpenses: number;
  myTotalSpent: number;
  myPersonalBudget: number | null;
  startDate: string;
  endDate: string;
  currency: string;
  formatCurrency: (value: number, currency?: string) => string;
}

export function TripDetailSummary({
  totalExpenses,
  myTotalSpent,
  myPersonalBudget,
  startDate,
  endDate,
  currency,
}: TripDetailSummaryProps) {
  const { data: profile } = useUserProfile();
  const baseCurrency = profile?.base_currency || "BRL";
  const isInternational = currency !== baseCurrency;
  
  const { data: rate } = useCurrencyRate(isInternational ? currency : "", baseCurrency);

  const budgetUsagePercent = myPersonalBudget ? Math.min(100, (myTotalSpent / myPersonalBudget) * 100) : 0;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
      {/* Gasto Total da Viagem */}
      <div className="group p-5 rounded-4xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Banknote className="w-20 h-20 text-primary" />
        </div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Banknote className="h-6 w-6" />
          </div>
          <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Gasto Total</span>
        </div>
        <div className="relative z-10">
          <p className="font-display text-3xl font-black tracking-tighter text-foreground mb-1 truncate">
            {moneyUtils.format(totalExpenses, currency)}
          </p>
          {isInternational && rate && (
            <p className="text-sm text-muted-foreground font-bold flex items-center gap-1">
              ≈ {moneyUtils.format(moneyUtils.mul(totalExpenses, rate), baseCurrency)}
            </p>
          )}
        </div>
      </div>

      {/* Meu Gasto Individual */}
      <div className="group p-5 rounded-4xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Users className="w-20 h-20 text-accent" />
        </div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
          <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Meu Gasto</span>
        </div>
        <div className="relative z-10">
          <p className="font-display text-3xl font-black tracking-tighter text-foreground mb-1 truncate">
            {moneyUtils.format(myTotalSpent, currency)}
          </p>
          {isInternational && rate && (
            <p className="text-sm text-muted-foreground font-bold flex items-center gap-1 mb-1">
              ≈ {moneyUtils.format(moneyUtils.mul(myTotalSpent, rate), baseCurrency)}
            </p>
          )}
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-70">
            Incl. compartilhados
          </p>
        </div>
      </div>

      {/* Meu Orçamento Individual */}
      <div className={cn(
        "group p-5 rounded-4xl border transition-all shadow-sm relative overflow-hidden",
        myPersonalBudget 
          ? "border-border/40 bg-card/60 backdrop-blur-md hover:shadow-md" 
          : "border-dashed border-border/40 bg-muted/5 opacity-80"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Wallet className="w-20 h-20 text-success" />
        </div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform",
            myPersonalBudget ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"
          )}>
            <Wallet className="h-6 w-6" />
          </div>
          <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Orçamento</span>
        </div>
        
        <div className="relative z-10">
          {myPersonalBudget ? (
            <div className="space-y-2">
              <div>
                <p className="font-display text-3xl font-black tracking-tighter text-foreground truncate">
                  {moneyUtils.format(myPersonalBudget, currency)}
                </p>
                {isInternational && rate && (
                  <p className="text-sm text-muted-foreground font-bold flex items-center gap-1">
                    ≈ {moneyUtils.format(moneyUtils.mul(myPersonalBudget, rate), baseCurrency)}
                  </p>
                )}
              </div>
              <div className="space-y-2.5 mt-3">
                <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden shadow-inner border border-border/40 relative">
                  <div 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                      budgetUsagePercent > 90 ? "bg-gradient-to-r from-red-600 to-red-400" : budgetUsagePercent > 70 ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-green-500 to-green-400"
                    )}
                    style={{ width: `${budgetUsagePercent}%` }}
                  />
                  {budgetUsagePercent > 90 && (
                    <div 
                      className="absolute top-0 left-0 h-full w-full opacity-30" 
                      style={{ 
                        backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
                        backgroundSize: '1rem 1rem',
                        animation: 'progress-stripes 1s linear infinite'
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-sm font-black uppercase tracking-widest">
                  <span className={cn(budgetUsagePercent > 90 ? "text-destructive" : "text-muted-foreground")}>
                    {budgetUsagePercent.toFixed(0)}% USADO
                  </span>
                  <span className="text-muted-foreground">
                    FALTA {moneyUtils.format(Math.max(0, myPersonalBudget - myTotalSpent), currency)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2 pt-2">
              <p className="text-sm font-bold text-muted-foreground/80">
                Sem orçamento definido
              </p>
              <div className="text-sm font-bold text-primary flex items-center gap-1 uppercase tracking-widest hover:underline cursor-pointer">
                Definir Orçamento <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Período da Viagem */}
      <div className="group p-5 rounded-4xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Calendar className="w-20 h-20 text-warning" />
        </div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning group-hover:scale-110 transition-transform">
            <Calendar className="h-6 w-6" />
          </div>
          <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Duração</span>
        </div>
        <div className="relative z-10 space-y-2">
          <p className="font-display text-base font-black tracking-tighter text-foreground flex items-center gap-2">
            {dateFns.format(parseLocalDate(startDate), "dd 'de' MMM", { locale: ptBR })}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            {dateFns.format(parseLocalDate(endDate), "dd 'de' MMM", { locale: ptBR })}
          </p>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
            {dateFns.differenceInDays(parseLocalDate(endDate), parseLocalDate(startDate))} dias de viagem
          </p>
        </div>
      </div>
    </div>
  );
}
