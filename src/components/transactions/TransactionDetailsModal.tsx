import { } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  FastForward,
  HandCoins,
  Calendar,
  Wallet,
  Tag,
  Users,
  Repeat,
  Clock,
  CheckCircle,
  Plane,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

import { Transaction, DBTransactionSplit } from "@/hooks/useTransactions";

interface TransactionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onAdvance?: () => void;
  onSettlement?: () => void;
}

export function TransactionDetailsModal({
  open,
  onOpenChange,
  transaction,
  onEdit,
  onDelete,
  onAdvance,
  onSettlement,
}: TransactionDetailsModalProps) {
  if (!transaction) return null;

  const formatCurrency = (value: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(Math.abs(value));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data indefinida';
    const date = new Date(dateStr + "T12:00:00");
    if (!dateFns.isValid(date)) return 'Data inválida';
    return dateFns.format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const isExpense = transaction.type === "EXPENSE";
  const isIncome = transaction.type === "INCOME";
  const isTransfer = transaction.type === "TRANSFER";
  const isShared = transaction.is_shared;
  const isInstallment = transaction.is_installment;
  const splits = transaction.transaction_splits || [];
  const hasPendingSplits = splits.some((s: DBTransactionSplit) => !s.is_settled);
  const isFullySettled = splits.length > 0 && splits.every((s: DBTransactionSplit) => s.is_settled);

  const getTransferTypeLabel = () => {
    const desc = transaction.description.toLowerCase();
    const isFatura = desc.includes("fatura") || desc.includes("cartão") || desc.includes("cartao");
    if (isFatura) return "Pagamento de Fatura";
    
    const sourceCurrency = transaction.account?.currency || transaction.currency || "BRL";
    const destCurrency = transaction.destination_currency || sourceCurrency;
    
    if (sourceCurrency !== destCurrency) {
      return "Transferência Internacional";
    }
    return "Transferência";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogDescription className="sr-only">Detalhes da transação</DialogDescription>
        
        {/* Header com ícone, título e subtítulo */}
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0",
              isIncome ? "bg-positive/10" : isTransfer ? "bg-primary/10" : "bg-muted"
            )}>
              {isTransfer ? "🔄" : (transaction.category?.icon || (isIncome ? "💰" : "💸"))}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate text-left">{transaction.description}</DialogTitle>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                {isTransfer ? getTransferTypeLabel() : (transaction.category?.name || "Sem categoria")}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Valor em destaque */}
          <div className="rounded-2xl bg-muted p-5 text-center">
            {isTransfer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className="font-mono text-2xl font-black text-negative">
                    -{formatCurrency(Number(transaction.amount), transaction.currency || "BRL")}
                  </span>
                  {transaction.destination_amount && (
                    <>
                      <span className="text-xl text-muted-foreground">➔</span>
                      <span className="font-mono text-2xl font-black text-positive">
                        +{formatCurrency(Number(transaction.destination_amount), transaction.destination_currency || "BRL")}
                      </span>
                    </>
                  )}
                </div>
                {transaction.exchange_rate && (
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                    Câmbio: 1 {transaction.currency || "BRL"} = {Number(transaction.exchange_rate).toFixed(4)} {transaction.destination_currency || "BRL"}
                  </p>
                )}
              </div>
            ) : (
              <p className={cn(
                "font-mono text-3xl font-black tracking-tight",
                isIncome ? "text-positive" : isExpense ? "text-destructive" : "text-primary"
              )}>
                {isIncome ? "+" : isExpense ? "-" : ""}{formatCurrency(Number(transaction.amount), transaction.currency || "BRL")}
              </p>
            )}
          </div>

          {/* Grid de informações */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Data
                </p>
                <p className="text-[13px] font-medium">{formatDate(transaction.date)}</p>
              </div>

              {/* Conta */}
              {transaction.account && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5" />
                    Conta
                  </p>
                  <p className="text-[13px] font-medium">{transaction.account.name}</p>
                </div>
              )}

              {/* Categoria */}
              {(transaction.category || isTransfer) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    {isTransfer ? "Tipo" : "Categoria"}
                  </p>
                  <p className="text-[13px] font-medium flex items-center gap-1.5">
                    <span className="text-lg">{isTransfer ? "🔄" : (transaction.category?.icon || "🏷️")}</span>
                    {isTransfer ? getTransferTypeLabel() : (transaction.category?.name || "Sem categoria")}
                  </p>
                </div>
              )}

              {/* Viagem */}
              {transaction.trip && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5" />
                    Viagem
                  </p>
                  <p className="text-[13px] font-medium">{transaction.trip.name}</p>
                </div>
              )}
            </div>

            {/* Badges */}
            {(isInstallment || isShared || transaction.is_recurring) && (
              <div className="flex flex-wrap gap-2">
                {isInstallment && (
                  <Badge variant="secondary" className="gap-2 text-[11px] px-2 py-[2px] rounded-xl bg-secondary/12 text-secondary-foreground">
                    <Repeat className="h-3.5 w-3.5" />
                    Parcela {transaction.current_installment}/{transaction.total_installments}
                  </Badge>
                )}
                {isShared && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "gap-2 text-[11px] px-2 py-[2px] rounded-xl",
                      isFullySettled && "bg-success/12 text-success",
                      hasPendingSplits && "bg-warning/12 text-warning",
                      !isFullySettled && !hasPendingSplits && "bg-secondary/12 text-secondary-foreground"
                    )}
                  >
                    {isFullySettled ? (
                      <><CheckCircle className="h-3.5 w-3.5" /> Acertado</>
                    ) : hasPendingSplits ? (
                      <><Clock className="h-3.5 w-3.5" /> Pendente</>
                    ) : (
                      <><Users className="h-3.5 w-3.5" /> Compartilhada</>
                    )}
                  </Badge>
                )}
                {transaction.is_recurring && (
                  <Badge variant="secondary" className="gap-2 text-[11px] px-2 py-[2px] rounded-xl bg-secondary/12 text-secondary-foreground">
                    <Repeat className="h-3.5 w-3.5" />
                    Recorrente
                  </Badge>
                )}
              </div>
            )}

            {/* Divisão */}
            {isShared && splits.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Divisão</p>
                <div className="space-y-2">
                  {splits.map((split: DBTransactionSplit) => (
                    <div
                      key={split.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border"
                    >
                      <div className="flex items-center gap-2.5">
                        {split.is_settled ? (
                          <CheckCircle className="h-4 w-4 text-positive" />
                        ) : (
                          <Clock className="h-4 w-4 text-warning" />
                        )}
                        <span className="text-sm font-medium">{split.name}</span>
                      </div>
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        split.is_settled ? "text-positive" : "text-warning"
                      )}>
                        {formatCurrency(split.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {transaction.notes && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Observações
                </p>
                <p className="text-sm bg-muted/50 p-3 rounded-xl border border-border/50">{transaction.notes}</p>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2.5">
            {onEdit && (
              <Button
                variant="outline"
                className="w-full gap-2"
                size="default"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Edit className="h-5 w-5" />
                Editar
              </Button>
            )}

            {isInstallment && transaction.series_id && onAdvance && (
              <Button
                variant="outline"
                className="w-full gap-2"
                size="default"
                onClick={() => {
                  onOpenChange(false);
                  onAdvance();
                }}
              >
                <FastForward className="h-5 w-5" />
                Adiantar Parcelas
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                size="default"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-5 w-5" />
                Excluir Transação
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
