import { cn } from "@/lib/utils";
import { Wallet, CheckCircle } from "lucide-react";

interface AccountSummaryProps {
  balancesByCurrency: { currency: string; balance: number; symbol: string }[];
  activeAccountsCount: number;
}

export function AccountSummary({ balancesByCurrency, activeAccountsCount }: AccountSummaryProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 transition-all duration-300">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div className="flex flex-col gap-4 w-full">
          {balancesByCurrency.map(({ currency, balance, symbol }) => (
            <div key={currency} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm sm:text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">
                  Saldo Geral Consolidado ({currency})
                </p>
                <p className={cn(
                  "font-mono text-3xl sm:text-4xl font-black tracking-tight leading-none", 
                  balance >= 0 ? "text-positive" : "text-negative"
                )}>
                  {symbol} {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
          {balancesByCurrency.length === 0 && (
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                 <Wallet className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <p className="text-sm sm:text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">
                   Saldo Geral Consolidado (BRL)
                 </p>
                 <p className="font-mono text-3xl sm:text-3xl font-black tracking-tight leading-none text-positive">
                   R$ 0,00
                 </p>
               </div>
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 shrink-0 self-start sm:self-auto">
          <div className="w-8 h-8 rounded-lg bg-success/12 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest leading-none mb-1">Contas Ativas</p>
            <p className="font-mono text-base font-bold leading-none">{activeAccountsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
