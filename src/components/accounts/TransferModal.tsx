import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransfer } from "@/hooks/useTransfer";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccountId: string;
  fromAccountName: string;
  fromAccountBalance: number;
}

export function TransferModal({
  open,
  onOpenChange,
  fromAccountId,
  fromAccountName,
  fromAccountBalance,
}: TransferModalProps) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Transferência");

  const { data: accounts = [] } = useAccounts();
  const transfer = useTransfer();

  // Filtrar contas (excluir a conta de origem)
  const availableAccounts = accounts.filter((acc) => acc.id !== fromAccountId);

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

    if (!toAccountId) {
      return;
    }

    if (numericAmount <= 0) {
      return;
    }

    if (numericAmount > fromAccountBalance) {
      return;
    }

    await transfer.mutateAsync({
      fromAccountId,
      toAccountId,
      amount: numericAmount,
      description,
      date: new Date().toISOString().split("T")[0],
    });

    // Reset form
    setToAccountId("");
    setAmount("");
    setDescription("Transferência");
    onOpenChange(false);
  };

  const numericAmount = getNumericAmount();
  const isInvalid = numericAmount > fromAccountBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
          <DialogDescription>
            Transfira dinheiro de uma conta para outra
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conta de origem (readonly) */}
          <div className="space-y-2">
            <Label>De</Label>
            <div className="p-3 rounded-xl border border-border bg-muted/30">
              <p className="font-medium">{fromAccountName}</p>
              <p className="text-sm text-muted-foreground">
                Saldo disponível: R$ {fromAccountBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Conta de destino */}
          <div className="space-y-2">
            <Label htmlFor="to-account">Para</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger id="to-account">
                <SelectValue placeholder="Selecione a conta de destino" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
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
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              type="text"
              placeholder="Ex: Pagamento, Reserva..."
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
                !toAccountId ||
                numericAmount <= 0 ||
                isInvalid ||
                transfer.isPending
              }
              className="flex-1"
            >
              {transfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                "Transferir"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
