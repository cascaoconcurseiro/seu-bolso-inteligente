import { TrendingUp, TrendingDown, MoreHorizontal, Trash2, Landmark, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

interface AccountStatementProps {
  transactions: any[];
  sortedDates: string[];
  groupedTransactions: Record<string, any[]>;
  getDateLabel: (dateStr: string) => string;
  formatCurrency: (value: number, currency?: string) => string;
  accountCurrency: string;
  openingBalance: number;
  closingBalance: number;
  onDeleteTransaction: (tx: any) => void;
}

export function AccountStatement({
  transactions,
  sortedDates,
  groupedTransactions,
  getDateLabel,
  formatCurrency,
  accountCurrency,
  openingBalance,
  closingBalance,
  onDeleteTransaction,
}: AccountStatementProps) {
  const { isPrivate } = usePrivacy();

  const fmt = (v: number) =>
    isPrivate ? "•••••" : formatCurrency(v, accountCurrency);

  return (
    <div className="space-y-4">
      {/* ── Linha de Saldo Anterior (abertura do mês) ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted">
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Saldo Anterior</p>
              <p className="text-xs text-muted-foreground">Acumulado de meses anteriores</p>
            </div>
          </div>
          <p className={cn(
            "font-mono font-bold text-base",
            openingBalance >= 0 ? "text-foreground" : "text-negative",
            isPrivate && "blur-md opacity-50 select-none"
          )}>
            {fmt(openingBalance)}
          </p>
        </div>
      </div>

      {/* ── Transações do mês ── */}
      {transactions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sem movimentações neste mês"
          description="Nenhuma transação foi registrada nesta conta no período selecionado."
        />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dayTransactions = groupedTransactions[dateStr];

            return (
              <div key={dateStr} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  {getDateLabel(dateStr)}
                </h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  {dayTransactions.map((tx, idx) => {
                    const isIncome = tx.isIncoming;
                    const txDate = new Date(tx.date);
                    const isInitialBalance = tx.isInitialBalance;

                    let description = tx.description;
                    if (tx.type === "TRANSFER") {
                      description = tx.isIncoming
                        ? `Transferência recebida — ${tx.description}`
                        : `Transferência enviada — ${tx.description}`;
                    }

                    return (
                      <div
                        key={tx.id}
                        className={cn(
                          "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
                          idx !== dayTransactions.length - 1 && "border-b border-border",
                          isInitialBalance && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            isInitialBalance
                              ? "bg-primary/10"
                              : tx.type === "TRANSFER"
                              ? "bg-blue-500/10"
                              : isIncome
                              ? "bg-positive/10"
                              : "bg-negative/10"
                          )}>
                            {isInitialBalance ? (
                              <Landmark className="h-5 w-5 text-primary" />
                            ) : tx.type === "TRANSFER" ? (
                              <ArrowUpDown className="h-5 w-5 text-blue-500" />
                            ) : isIncome ? (
                              <TrendingUp className="h-5 w-5 text-positive" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-negative" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <p className="font-medium truncate text-sm sm:text-base">{description}</p>
                              {isInitialBalance && (
                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0">
                                  Abertura
                                </span>
                              )}
                              {tx.is_shared && !isInitialBalance && (
                                <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0">
                                  Compartilhado
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap mt-0.5">
                              <span>{dateFns.format(txDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                              {tx.category?.name && (
                                <>
                                  <span>•</span>
                                  <span>{tx.category.name}</span>
                                </>
                              )}
                              {tx.is_installment && tx.current_installment && tx.total_installments && (
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px]">
                                  {tx.current_installment}/{tx.total_installments}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3 flex items-center gap-1 sm:gap-2">
                          <div>
                            <p className={cn(
                              "font-mono text-base sm:text-lg font-bold",
                              isInitialBalance
                                ? "text-primary"
                                : tx.type === "TRANSFER"
                                ? "text-blue-500"
                                : isIncome
                                ? "text-positive"
                                : "text-negative",
                              isPrivate && "blur-md opacity-50 select-none"
                            )}>
                              {isPrivate
                                ? "•••••"
                                : `${isIncome ? "+" : "-"}${formatCurrency(Math.abs(Number(tx.amount)), tx.currency || accountCurrency)}`}
                            </p>
                            <p className={cn(
                              "text-[10px] text-muted-foreground font-mono",
                              isPrivate && "blur-md opacity-50 select-none"
                            )}>
                              Saldo: {fmt(tx.runningBalance)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 hover:bg-muted rounded-full transition-colors">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onDeleteTransaction(tx)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Linha de Saldo Final (fechamento do mês) ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted">
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Saldo Final do Período</p>
              <p className="text-xs text-muted-foreground">Abertura do próximo mês</p>
            </div>
          </div>
          <p className={cn(
            "font-mono font-bold text-lg",
            closingBalance >= 0 ? "text-positive" : "text-negative",
            isPrivate && "blur-md opacity-50 select-none"
          )}>
            {fmt(closingBalance)}
          </p>
        </div>
      </div>
    </div>
  );
}
