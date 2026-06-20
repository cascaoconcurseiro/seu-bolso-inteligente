import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { parseDate } from "@/lib/dateUtils";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Activity } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { EmptyState } from "@/components/ui/empty-state";

interface DashboardRecentActivityProps {
  recentTransactions: any[];
  formatCurrencyWithSymbol: (value: number, currency: string) => string;
}

export function DashboardRecentActivity({
  recentTransactions,
  formatCurrencyWithSymbol
}: DashboardRecentActivityProps) {
  const { isPrivate } = usePrivacy();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Atividade recente
        </h2>
        <Link 
          to="/transacoes" 
          className="text-[10px] uppercase tracking-wider font-bold text-primary hover:text-primary/80 transition-colors"
        >
          Ver todas
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhuma atividade"
          description="Você ainda não registrou nenhuma transação recente no seu controle financeiro."
        />
      ) : (
        <div className="space-y-2">
          {recentTransactions.map((tx, index) => {
            let txDate: Date;
            try {
              txDate = tx.date ? parseDate(tx.date) : new Date();
            } catch (error) {
              txDate = new Date();
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const txMidnight = new Date(txDate);
            txMidnight.setHours(0, 0, 0, 0);

            let dateLabel = txDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            if (txMidnight.getTime() === today.getTime()) dateLabel = "Hoje";
            else if (txMidnight.getTime() === yesterday.getTime()) dateLabel = "Ontem";
            
            const isIncome = tx.type === "INCOME";
            const isTransfer = tx.type === "TRANSFER";

            return (
              <div
                key={tx.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-border/50 hover:bg-card/50 hover:shadow-sm transition-all duration-300 animate-fade-in-up",
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Category Icon Circle */}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-sm transition-transform group-hover:scale-110 duration-500",
                    isIncome ? "bg-green-500/10 text-green-600" : 
                    isTransfer ? "bg-blue-500/10 text-blue-600" : 
                    "bg-muted text-muted-foreground"
                  )}>
                    {tx.category?.icon || (isIncome ? "💰" : isTransfer ? "⇄" : "💸")}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm md:text-base truncate tracking-tight text-foreground/90">
                        {tx.description}
                      </p>
                      {tx.is_shared && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" title="Compartilhado" />
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <span className="truncate">{tx.category?.name || (isTransfer ? "Transferência" : "Geral")}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="whitespace-nowrap">{dateLabel}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <p className={cn(
                    "font-display font-black text-sm md:text-base tracking-tight",
                    isIncome ? "text-green-600" : isTransfer ? "text-blue-600" : "text-foreground",
                    isPrivate && "blur-md opacity-50 select-none"
                  )}>
                    {isPrivate ? "•••••" : `${isIncome ? "+" : isTransfer ? "" : "-"}${formatCurrencyWithSymbol(Number(tx.amount), tx.currency || 'BRL')}`}
                  </p>
                  {isTransfer && tx.destination_amount && tx.destination_currency && (tx.currency || 'BRL') !== tx.destination_currency && (
                    <p className={cn("text-[10px] font-display font-bold text-green-600 tracking-tight mt-0.5", isPrivate && "blur-md opacity-50 select-none")} title="Valor convertido creditado">
                      {isPrivate ? "➔ •••••" : `➔ ${formatCurrencyWithSymbol(Number(tx.destination_amount), tx.destination_currency)}`}
                    </p>
                  )}
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center justify-end gap-1">
                    {isIncome ? <ArrowDownLeft className="h-2 w-2" /> : isTransfer ? <RefreshCw className="h-2 w-2" /> : <ArrowUpRight className="h-2 w-2" />}
                    {isIncome ? "Entrada" : isTransfer ? "Transfer" : "Saída"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
