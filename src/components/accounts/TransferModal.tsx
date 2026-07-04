import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/ui/amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowRightLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransfer } from "@/hooks/useTransfer";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { moneyUtils } from "@/utils/money";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccountId: string;
  fromAccountName: string;
  fromAccountBalance: number;
  fromAccountCurrency?: string;
}

export function TransferModal({
  open,
  onOpenChange,
  fromAccountId,
  fromAccountName,
  fromAccountBalance,
  fromAccountCurrency = "BRL",
}: TransferModalProps) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Transferência");
  const [exchangeRate, setExchangeRate] = useState("");
  const [destinationAmount, setDestinationAmount] = useState("");

  const { data: accounts = [] } = useAccounts();
  const transfer = useTransfer();

  const availableAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (acc.id === fromAccountId) return false;
      if (acc.type === "CREDIT_CARD") return false;

      if (fromAccountCurrency !== "BRL") {
        const accCurrency = acc.currency || "BRL";
        return accCurrency === fromAccountCurrency || accCurrency === "BRL";
      }
      return true;
    });
  }, [accounts, fromAccountId, fromAccountCurrency]);

  const selectedDestAccount = accounts.find((acc) => acc.id === toAccountId);
  const destCurrency = selectedDestAccount?.currency || "BRL";
  const isCrossCurrency = fromAccountCurrency !== destCurrency;

  const foreignCurrency = fromAccountCurrency === "BRL" ? destCurrency : fromAccountCurrency;

  useEffect(() => {
    if (isCrossCurrency && exchangeRate) {
      const numericAmount = moneyUtils.parse(amount) || 0;
      const rate = moneyUtils.parse(exchangeRate.replace(",", ".")) || 0;
      if (numericAmount > 0 && rate > 0) {
        const destValue =
          fromAccountCurrency === "BRL"
            ? moneyUtils.div(numericAmount, rate)
            : moneyUtils.mul(numericAmount, rate);
        setDestinationAmount(destValue.toFixed(2).replace(".", ","));
      } else {
        setDestinationAmount("");
      }
    } else {
      setDestinationAmount("");
    }
  }, [exchangeRate, amount, isCrossCurrency, fromAccountCurrency]);

  useEffect(() => {
    setExchangeRate("");
    setDestinationAmount("");
  }, [toAccountId]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const getNumericAmount = () => {
    return moneyUtils.parse(amount) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = getNumericAmount();

    if (!toAccountId || numericAmount <= 0 || numericAmount > fromAccountBalance) {
      return;
    }

    if (isCrossCurrency) {
      const rate = moneyUtils.parse(exchangeRate.replace(",", ".")) || 0;
      if (rate <= 0) return;
    }

    const rate = isCrossCurrency ? moneyUtils.parse(exchangeRate.replace(",", ".")) : undefined;
    const destAmount = isCrossCurrency
      ? moneyUtils.parse(destinationAmount.replace(",", "."))
      : undefined;

    await transfer.mutateAsync({
      fromAccountId,
      toAccountId,
      amount: numericAmount,
      description,
      date: new Date().toISOString().split("T")[0],
      exchangeRate: rate,
      destinationAmount: destAmount,
    });

    setToAccountId("");
    setAmount("");
    setDescription("Transferência");
    setExchangeRate("");
    setDestinationAmount("");
    onOpenChange(false);
  };

  const numericAmount = getNumericAmount();
  const isInvalid = numericAmount > fromAccountBalance;
  const isMissingExchangeRate =
    isCrossCurrency && (!exchangeRate || moneyUtils.parse(exchangeRate.replace(",", ".")) <= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <DialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <DialogTitle>Transferir entre contas</DialogTitle>
          <DialogDescription>Transfira dinheiro de forma instantânea</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6 overflow-y-auto"
        >
          <div className="grid gap-4">
            {/* Conta de origem (readonly) */}
            <div className="space-y-2">
              <Label className="text-sm uppercase tracking-wider text-muted-foreground">De</Label>
              <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                <p className="font-semibold text-sm">{fromAccountName}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Saldo disponível: {getCurrencySymbol(fromAccountCurrency)}{" "}
                  {fromAccountBalance.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center -my-2 relative z-10">
              <div className="bg-background border border-border/50 rounded-full p-2 text-muted-foreground shadow-sm">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Conta de destino */}
            <div className="space-y-2">
              <Label
                htmlFor="to-account"
                className="text-sm uppercase tracking-wider text-muted-foreground"
              >
                Para
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger id="to-account" className="h-12 rounded-xl">
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2 font-medium">
                        {account.name}
                        {account.is_international && (
                          <span className="text-sm bg-accent/15 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {account.currency}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alerta de transferência cross-currency */}
          {isCrossCurrency && (
            <Alert className="border-accent/20 bg-accent/10 text-accent rounded-xl">
              <ArrowRightLeft className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">
                Transferência internacional ({fromAccountCurrency} → {destCurrency}). A cotação é
                obrigatória.
              </AlertDescription>
            </Alert>
          )}

          {/* Valor */}
          <div className="space-y-2">
            <AmountInput
              label={`Valor a enviar ${isCrossCurrency ? `(${fromAccountCurrency})` : ""}`}
              value={amount}
              onChange={handleAmountChange}
              currency={fromAccountCurrency}
              currencySymbol={getCurrencySymbol(fromAccountCurrency)}
              size="md"
              textColorClass={isInvalid ? "text-destructive" : "text-primary"}
              autoFocus
            />
            {isInvalid && (
              <p className="text-sm font-medium text-destructive mt-1">Saldo insuficiente</p>
            )}
          </div>

          {/* Taxa de câmbio (apenas para cross-currency) */}
          {isCrossCurrency && (
            <div className="space-y-4 p-4 border border-border/50 rounded-2xl bg-muted/10">
              <div className="space-y-2">
                <Label htmlFor="exchange-rate" className="text-sm font-semibold">
                  Cotação Atual (1 {foreignCurrency} = ? BRL)
                </Label>
                <Input
                  id="exchange-rate"
                  name="exchange-rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 5,50"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Valor de destino calculado */}
              {destinationAmount && (
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 flex flex-col gap-1">
                  <p className="text-sm text-accent/80 uppercase font-black tracking-widest">
                    Valor recebido no destino
                  </p>
                  <p className="font-mono font-black text-2xl text-accent">
                    {getCurrencySymbol(destCurrency)} {destinationAmount}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-sm uppercase tracking-wider text-muted-foreground"
            >
              Descrição (Opcional)
            </Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="Ex: Pagamento, Reserva…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !toAccountId ||
                numericAmount <= 0 ||
                isInvalid ||
                isMissingExchangeRate ||
                transfer.isPending
              }
              className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
            >
              {transfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando…
                </>
              ) : (
                "Transferir Agora"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
