import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransfer } from "@/hooks/useTransfer";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

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

  // Filtrar contas disponíveis para transferência:
  // - Excluir a conta de origem
  // - Excluir cartões de crédito (não podem receber transferências)
  // - Se conta origem é internacional, só mostrar contas da mesma moeda OU contas BRL (com conversão)
  const availableAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Não pode transferir para si mesmo
      if (acc.id === fromAccountId) return false;
      
      // Cartões de crédito não podem receber transferências
      if (acc.type === "CREDIT_CARD") return false;
      
      // Se conta origem é internacional (não-BRL)
      if (fromAccountCurrency !== "BRL") {
        // Só pode transferir para:
        // 1. Contas da mesma moeda
        // 2. Contas BRL (com conversão)
        const accCurrency = acc.currency || "BRL";
        return accCurrency === fromAccountCurrency || accCurrency === "BRL";
      }
      
      // Se conta origem é BRL, pode transferir para qualquer conta
      return true;
    });
  }, [accounts, fromAccountId, fromAccountCurrency]);

  // Detectar se é transferência cross-currency
  const selectedDestAccount = accounts.find((acc) => acc.id === toAccountId);
  const destCurrency = selectedDestAccount?.currency || "BRL";
  const isCrossCurrency = fromAccountCurrency !== destCurrency;

  // Calcular valor de destino quando taxa de câmbio muda
  useEffect(() => {
    if (isCrossCurrency && exchangeRate) {
      const numericAmount = getNumericAmount();
      const rate = parseFloat(exchangeRate.replace(",", ".")) || 0;
      if (numericAmount > 0 && rate > 0) {
        // Se origem é BRL, dividir pela taxa; se destino é BRL, multiplicar
        const destValue = fromAccountCurrency === "BRL" 
          ? numericAmount / rate 
          : numericAmount * rate;
        setDestinationAmount(destValue.toFixed(2).replace(".", ","));
      }
    } else {
      setDestinationAmount("");
    }
  }, [exchangeRate, amount, isCrossCurrency, fromAccountCurrency]);

  // Limpar taxa de câmbio quando mudar conta de destino
  useEffect(() => {
    setExchangeRate("");
    setDestinationAmount("");
  }, [toAccountId]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const getNumericAmount = () => {
    return parseFloat(amount) || 0;
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

    // Validar taxa de câmbio para transferências cross-currency
    if (isCrossCurrency) {
      const rate = parseFloat(exchangeRate.replace(",", ".")) || 0;
      if (rate <= 0) {
        return;
      }
    }

    const rate = isCrossCurrency ? parseFloat(exchangeRate.replace(",", ".")) : undefined;
    const destAmount = isCrossCurrency ? parseFloat(destinationAmount.replace(",", ".")) : undefined;

    await transfer.mutateAsync({
      fromAccountId,
      toAccountId,
      amount: numericAmount,
      description,
      date: new Date().toISOString().split("T")[0],
      exchangeRate: rate,
      destinationAmount: destAmount,
    });

    // Reset form
    setToAccountId("");
    setAmount("");
    setDescription("Transferência");
    setExchangeRate("");
    setDestinationAmount("");
    onOpenChange(false);
  };

  const numericAmount = getNumericAmount();
  const isInvalid = numericAmount > fromAccountBalance;
  const isMissingExchangeRate = isCrossCurrency && (!exchangeRate || parseFloat(exchangeRate.replace(",", ".")) <= 0);

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
                Saldo disponível: {getCurrencySymbol(fromAccountCurrency)} {fromAccountBalance.toFixed(2)}
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
                    <div className="flex items-center gap-2">
                      {account.name} - {account.bank}
                      {account.is_international && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                          {account.currency}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alerta de transferência cross-currency */}
          {isCrossCurrency && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                Transferência entre moedas diferentes ({fromAccountCurrency} → {destCurrency}).
                Informe a taxa de câmbio utilizada.
              </AlertDescription>
            </Alert>
          )}

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor {isCrossCurrency && `(${fromAccountCurrency})`}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm z-10">
                {getCurrencySymbol(fromAccountCurrency)}
              </span>
              <CurrencyInput
                id="amount"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                currency={fromAccountCurrency}
                className="pl-12"
              />
            </div>
            {isInvalid && (
              <p className="text-sm text-destructive">Saldo insuficiente</p>
            )}
          </div>

          {/* Taxa de câmbio (apenas para cross-currency) */}
          {isCrossCurrency && (
            <>
              <div className="space-y-2">
                <Label htmlFor="exchange-rate">
                  Taxa de câmbio (1 {destCurrency} = ? {fromAccountCurrency})
                </Label>
                <Input
                  id="exchange-rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 5,50"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Informe quanto vale 1 {destCurrency} em {fromAccountCurrency}
                </p>
              </div>

              {/* Valor de destino calculado */}
              {destinationAmount && (
                <div className="p-3 rounded-xl border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Valor a receber</p>
                  <p className="font-mono font-semibold text-lg">
                    {getCurrencySymbol(destCurrency)} {destinationAmount}
                  </p>
                </div>
              )}
            </>
          )}

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
                isMissingExchangeRate ||
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
