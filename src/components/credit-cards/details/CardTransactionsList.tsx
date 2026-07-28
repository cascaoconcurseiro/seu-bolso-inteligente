/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import * as dateFns from "date-fns";

interface CardTransactionsListProps {
  transactions: any[];
  selectedCardId: string;
  formatCurrency: (value: number) => string;
  handleEditTransaction: (tx: any) => void;
  setDeleteConfirm: (v: { isOpen: boolean; transaction: any | null }) => void;
}

export function CardTransactionsList({
  transactions,
  selectedCardId,
  formatCurrency,
  handleEditTransaction,
  setDeleteConfirm,
}: CardTransactionsListProps) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
        Lançamentos ({transactions.length})
      </h2>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {transactions.map((tx: any, index: number) => (
          <div
            key={tx.id}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("button")) return; // ignora botões internos (dropdown de opções)
              handleEditTransaction(tx);
            }}
            className={cn(
              "group flex items-start gap-3 p-3 hover:bg-muted/50 transition-all duration-200 hover:pl-4 cursor-pointer relative",
              index !== transactions.length - 1 && "border-b border-border"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm border border-border/50 group-hover:scale-110 transition-transform",
                tx.type === "INCOME" ? "bg-positive/10" : "bg-background"
              )}
            >
              {tx.category?.icon || (tx.type === "INCOME" ? "💰" : "💸")}
            </div>

            <div className="flex-1 min-w-0 pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate text-foreground/90 group-hover:text-foreground transition-colors">
                  {tx.description}
                </p>
                {tx.is_installment && tx.current_installment && tx.total_installments && (
                  <span className="text-xs px-1 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-bold tracking-wider">
                    {tx.current_installment}/{tx.total_installments}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                <span className="truncate">{tx.category?.name || "Sem categoria"}</span>
                <span className="opacity-50">•</span>
                <span>{dateFns.format(new Date(tx.date + "T00:00:00"), "dd/MM/yyyy")}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-0">
              <div className="flex flex-col items-end gap-0.5">
                {(() => {
                  const isCredit =
                    tx.type === "INCOME" ||
                    (tx.type === "TRANSFER" && tx.destination_account_id === selectedCardId);
                  return (
                    <>
                      <span
                        className={cn(
                          "font-mono font-bold text-right whitespace-nowrap",
                          isCredit ? "text-positive" : "text-foreground"
                        )}
                      >
                        {isCredit ? "+" : ""}
                        {formatCurrency(tx.amount)}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider whitespace-nowrap opacity-70",
                          isCredit ? "text-positive" : "text-muted-foreground"
                        )}
                      >
                        {isCredit ? "Crédito" : "Débito"}
                      </span>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-muted"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                    <DropdownMenuItem
                      onClick={() => handleEditTransaction(tx)}
                      className="cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar Lançamento
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirm({ isOpen: true, transaction: tx })}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Lançamento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
