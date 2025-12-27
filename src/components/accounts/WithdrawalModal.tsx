import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Banknote } from "lucide-react";
import { useWithdrawal } from "@/hooks/useWithdrawal";

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  accountBalance: number;
}

export function WithdrawalModal({
  open,
  onOpenChange,
  accountId,
  accountName,
  accountBalance,
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Saque em dinheiro");

  const withdrawal = useWithdrawal();

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const cents = parseInt(numbers || "0") / 100;
    return cents.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setAmount(formatted);
  };

  const getNumericAmount = () => {
    return parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = getNumericAmount();

    if (numericAmount <= 0) {
      return;
    }

    if (numericAmount > accountBalance) {
      return;
    }

    await withdrawal.mutateAsync({
      accountId,
      amount: numericAmount,
      description,
      date: new Date().toISOString().split("T")[0],
    });

    // Reset form
    setAmount("");
    setDescription("Saque em dinheiro");
    onOpenChange(false);
  };

  const numericAmount = getNumericAmount();
  const isInvalid = numericAmount > accountBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Sacar dinheiro
          </DialogTitle>
          <DialogDescription>
            Registre um saque em dinheiro desta conta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conta */}
          <div className="space-y-2">
            <Label>Conta</Label>
            <div className="p-3 rounded-xl border border-border bg-muted/30">
              <p className="font-medium">{accountName}</p>
              <p className="text-sm text-muted-foreground">
                Saldo disponível: R$ {accountBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do saque</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                className="pl-12"
              />
            </div>
            {isInvalid && (
              <p className="text-sm text-destructive">Saldo insuficiente</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              type="text"
              placeholder="Ex: Saque no caixa eletrônico"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                numericAmount <= 0 ||
                isInvalid ||
                withdrawal.isPending
              }
              className="flex-1"
            >
              {withdrawal.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sacando...
                </>
              ) : (
                "Confirmar Saque"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
