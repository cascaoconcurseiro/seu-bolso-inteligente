import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Globe, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankIcon } from "@/components/financial/BankIcon";
import { getBankById } from "@/lib/banks";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface AccountInfo {
  id: string;
  name: string;
  type: string;
  balance: number;
  bank_id: string | null;
  currency: string;
  is_international: boolean | null;
}

interface SimpleTransaction {
  id: string;
  description: string;
  type: string;
  amount: number;
  destination_account_id: string | null;
  destination_amount?: number | null;
}

interface AccountCardProps {
  account: AccountInfo;
  lastTransactions: SimpleTransaction[];
  formatCurrency: (value: number) => string;
  getCurrencySymbol: (currency: string) => string;
  accountTypeLabels: Record<string, string>;
}

export function AccountCard({
  account,
  lastTransactions,
  formatCurrency,
  getCurrencySymbol,
  accountTypeLabels
}: AccountCardProps) {
  const bank = getBankById(account.bank_id);
  const isInternational = account.is_international;
  const currencySymbol = getCurrencySymbol(account.currency || 'BRL');
  const { isPrivate } = usePrivacy();

  return (
    <div className="group flex flex-col rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden">
      <Link to={`/contas/${account.id}`} className="flex flex-col flex-1">
        {/* Card Header visual mimicry */}
        <div className="p-5 relative overflow-hidden" style={{ backgroundColor: bank.color }}>
          {/* Subtle glowing orb */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-white/15 backdrop-blur-sm">
                <BankIcon bankId={account.bank_id} size="md" />
              </div>
              <div>
                <p className="font-display font-bold text-base tracking-tight" style={{ color: bank.textColor }}>
                  {account.name}
                </p>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-80" style={{ color: bank.textColor }}>
                  {isInternational ? 'Conta Global' : (accountTypeLabels[account.type] || account.type)}
                </p>
              </div>
            </div>
            {isInternational && (
              <span className="text-[10px] bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 backdrop-blur-sm" style={{ color: bank.textColor }}>
                <Globe className="h-3 w-3" />
                {account.currency}
              </span>
            )}
          </div>
          
          <div className="mt-6 relative z-10">
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-75" style={{ color: bank.textColor }}>Saldo Disponível</p>
            <p className={cn("font-mono text-2xl sm:text-3xl font-black tracking-tight mt-1", isPrivate && "blur-md opacity-50 select-none")} style={{ color: bank.textColor }}>
              {isPrivate ? "•••••" : (isInternational 
                ? `${currencySymbol} ${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : formatCurrency(Number(account.balance)))
              }
            </p>
          </div>
        </div>

        {/* Card transactions footer */}
        <div className="p-5 space-y-3.5 flex-1 bg-gradient-to-b from-card to-background border-t border-border/40">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Últimas transações</p>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {lastTransactions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Nenhuma movimentação registrada</p>
          ) : (
            <div className="space-y-2.5">
              {lastTransactions.map((tx) => {
                const isIncome = tx.type === "INCOME" || tx.destination_account_id === account.id;
                const displayAmt = (tx.destination_account_id === account.id && tx.destination_amount !== null && tx.destination_amount !== undefined)
                  ? Math.abs(Number(tx.destination_amount))
                  : Math.abs(Number(tx.amount));
                return (
                  <div key={tx.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={cn(
                        "p-1 rounded-md shrink-0",
                        isIncome ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                      )}>
                        {isIncome ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                      </div>
                      <span className="truncate text-muted-foreground font-medium">{tx.description}</span>
                    </div>
                    <span className={cn("font-mono font-bold ml-2 shrink-0 tabular-nums", isIncome ? "text-positive" : "text-negative")}>
                      {isIncome ? "+" : "-"}{isInternational ? currencySymbol : ""}{isInternational ? displayAmt.toFixed(2) : formatCurrency(displayAmt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
