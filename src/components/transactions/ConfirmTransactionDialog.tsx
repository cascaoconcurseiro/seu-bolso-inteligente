import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface ConfirmTarget {
  id: string;
  description: string;
  amount: number;
  date: Date;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  kind: "scheduled" | "recurring";
  currency?: string;
}

interface Props {
  target: ConfirmTarget | null;
  onClose: () => void;
  onConfirm: (id: string, amount: number, date: string, kind: "scheduled" | "recurring") => void;
  isPending?: boolean;
}

export function ConfirmTransactionDialog({ target, onClose, onConfirm, isPending }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (target) {
      setAmount(String(target.amount));
      setDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [target]);

  const isExpense = target?.type === "EXPENSE";
  const isIncome = target?.type === "INCOME";

  const actionLabel = isIncome
    ? "Confirmar recebimento"
    : target?.type === "TRANSFER"
      ? "Confirmar transferência"
      : "Confirmar pagamento";

  const amountColor = isExpense ? "text-negative" : isIncome ? "text-positive" : "text-foreground";

  function handleConfirm() {
    if (!target) return;
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;
    onConfirm(target.id, parsed, date, target.kind);
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{actionLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border/60">
            <p className="text-sm font-semibold text-foreground">{target?.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {target?.kind === "recurring" ? "Ocorrência recorrente" : "Agendado manualmente"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-amount" className="text-xs font-medium">
              Valor real{" "}
              <span className="text-muted-foreground font-normal">(ajuste se necessário)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="confirm-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn("pl-9 font-mono tabular-nums", amountColor)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-date" className="text-xs font-medium">
              Data de efetivação
            </Label>
            <Input
              id="confirm-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending} className="flex-1">
            {isPending ? "Confirmando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
