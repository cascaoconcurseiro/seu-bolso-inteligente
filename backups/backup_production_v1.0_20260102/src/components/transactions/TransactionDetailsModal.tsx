import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
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
    const date = new Date(dateStr + "T12:00:00");
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const isExpense = transaction.type === "EXPENSE";
  const isIncome = transaction.type === "INCOME";
  const isTransfer = transaction.type === "TRANSFER";
  const isShared = transaction.is_shared;
  const isInstallment = transaction.is_installment;
  const splits = transaction.transaction_splits || [];
  const hasPendingSplits = splits.some((s: any) => !s.is_settled);
  const isFullySettled = splits.length > 0 && splits.every((s: any) => s.is_settled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
                isIncome ? "bg-positive/10" : isTransfer ? "bg-primary/10" : "bg-muted"
              )}>
                {transaction.category?.icon || (isIncome ? "💰" : isTransfer ? "🔄" : "💸")}
              </div>
              <div>
                <DialogTitle className="text-left">{transaction.description}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {transaction.category?.name || "Sem categoria"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount */}
          <div className="text-center py-4 border-y">
            <p className={cn(
              "font-mono text-4xl font-bold",
              isIncome ? "text-positive" : isExpense ? "text-destructive" : "text-primary"
            )}>
              {isIncome ? "+" : isExpense ? "-" : ""}{formatCurrency(Number(transaction.amount))}
            </p>
            {transaction.currency && transaction.currency !== "BRL" && (
              <p className="text-sm text-muted-foreground mt-1">
                Moeda: {transaction.currency}
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Data</p>
                <p className="text-sm font-medium">{formatDate(transaction.date)}</p>
              </div>
            </div>

            {/* Account */}
            {transaction.account && (
              <div className="flex items-start gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Conta</p>
                  <p className="text-sm font-medium">{transaction.account.name}</p>
                </div>
              </div>
            )}

            {/* Category */}
            {transaction.category && (
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Categoria</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <span>{transaction.category.icon}</span>
                    {transaction.category.name}
                  </p>
                </div>
              </div>
            )}

            {/* Trip */}
            {transaction.trip && (
              <div className="flex items-start gap-2">
                <Plane className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Viagem</p>
                  <p className="text-sm font-medium">{transaction.trip.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {isInstallment && (
              <Badge variant="secondary" className="gap-1">
                <Repeat className="h-3 w-3" />
                Parcela {transaction.current_installment}/{transaction.total_installments}
              </Badge>
            )}
            {isShared && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "gap-1",
                  isFullySettled && "bg-positive/10 text-positive",
                  hasPendingSplits && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                )}
              >
                {isFullySettled ? (
                  <><CheckCircle className="h-3 w-3" /> Acertado</>
                ) : hasPendingSplits ? (
                  <><Clock className="h-3 w-3" /> Pendente</>
                ) : (
                  <><Users className="h-3 w-3" /> Compartilhada</>
                )}
              </Badge>
            )}
            {transaction.is_recurring && (
              <Badge variant="secondary" className="gap-1">
                <Repeat className="h-3 w-3" />
                Recorrente
              </Badge>
            )}
          </div>

          {/* Splits Section */}
          {isShared && splits.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Divisão</p>
              <div className="space-y-2">
                {splits.map((split: any) => (
                  <div
                    key={split.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {split.is_settled ? (
                        <CheckCircle className="h-4 w-4 text-positive" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm">{split.name}</span>
                    </div>
                    <span className={cn(
                      "font-mono text-sm font-medium",
                      split.is_settled ? "text-positive" : "text-amber-600 dark:text-amber-400"
                    )}>
                      {formatCurrency(split.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {transaction.notes && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Observações
              </p>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{transaction.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {isShared && hasPendingSplits && onSettlement && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-positive hover:text-positive"
                onClick={() => {
                  onOpenChange(false);
                  onSettlement();
                }}
              >
                <HandCoins className="h-4 w-4" />
                Confirmar Ressarcimento
              </Button>
            )}
            {isInstallment && transaction.series_id && onAdvance && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-blue-600 hover:text-blue-600"
                onClick={() => {
                  onOpenChange(false);
                  onAdvance();
                }}
              >
                <FastForward className="h-4 w-4" />
                Adiantar Parcelas
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
