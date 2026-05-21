import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, Users, Calendar, Banknote, ArrowRight } from "lucide-react";
import { moneyUtils } from "@/utils/money";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/utils/dateUtils";

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
  const isInternational = currency !== 'BRL';
  const budgetUsagePercent = myPersonalBudget ? Math.min(100, (myTotalSpent / myPersonalBudget) * 100) : 0;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
      {/* Gasto Total da Viagem */}
      <div className="group p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Banknote className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gasto Total</span>
        </div>
        <p className="font-mono text-2xl font-black tracking-tighter text-foreground mb-1">
          {moneyUtils.format(totalExpenses, currency)}
        </p>
      </div>

      {/* Meu Gasto Individual */}
      <div className="group p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-blue-500/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Users className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Meu Gasto</span>
        </div>
        <p className="font-mono text-2xl font-black tracking-tighter text-foreground mb-1">
          {moneyUtils.format(myTotalSpent, currency)}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium">
          Inclui sua parte nos compartilhados
        </p>
      </div>

      {/* Meu Orçamento Individual */}
      <div className={cn(
        "group p-5 rounded-2xl border transition-all",
        myPersonalBudget 
          ? "border-border/50 bg-card/50 backdrop-blur-sm hover:border-green-500/30" 
          : "border-dashed border-border/50 bg-muted/5 opacity-60"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
            myPersonalBudget ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
          )}>
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Orçamento</span>
        </div>
        
        {myPersonalBudget ? (
          <div className="space-y-2">
            <p className="font-mono text-2xl font-black tracking-tighter text-foreground">
              {moneyUtils.format(myPersonalBudget, currency)}
            </p>
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    budgetUsagePercent > 90 ? "bg-red-500" : budgetUsagePercent > 70 ? "bg-orange-500" : "bg-green-500"
                  )}
                  style={{ width: `${budgetUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase">
                <span className={cn(budgetUsagePercent > 90 ? "text-red-500" : "text-muted-foreground")}>
                  {budgetUsagePercent.toFixed(0)}% USADO
                </span>
                <span className="text-muted-foreground">
                  FALTA {moneyUtils.format(Math.max(0, myPersonalBudget - myTotalSpent), currency)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs font-medium text-muted-foreground italic">
            Sem orçamento definido
          </p>
        )}
      </div>

      {/* Período da Viagem */}
      <div className="group p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-orange-500/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duração</span>
        </div>
        <p className="font-bold text-lg leading-tight text-foreground mb-1">
          {dateFns.format(parseLocalDate(startDate), "dd 'de' MMM", { locale: ptBR })}
          <span className="mx-2 text-muted-foreground/30 font-normal">→</span>
          {dateFns.format(parseLocalDate(endDate), "dd 'de' MMM", { locale: ptBR })}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
          {dateFns.differenceInDays(parseLocalDate(endDate), parseLocalDate(startDate)) + 1} dias de viagem
        </p>
      </div>
    </div>
  );
}
