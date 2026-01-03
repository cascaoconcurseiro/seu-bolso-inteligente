import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExchangePurchase, ExchangePurchaseInput } from "@/types/tripExchange";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

interface ExchangePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  purchase?: ExchangePurchase;
  onSubmit: (data: ExchangePurchaseInput) => void;
  isLoading: boolean;
}

export function ExchangePurchaseDialog({
  open,
  onOpenChange,
  currency,
  purchase,
  onSubmit,
  isLoading,
}: ExchangePurchaseDialogProps) {
  const [foreignAmount, setForeignAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const currencySymbol = getCurrencySymbol(currency);
  const isEditing = !!purchase;

  // Preencher campos quando editando
  useEffect(() => {
    if (purchase) {
      setForeignAmount(purchase.foreign_amount.toString());
      setExchangeRate(purchase.exchange_rate.toString());
      setDescription(purchase.description || "");
      setPurchaseDate(purchase.purchase_date);
    } else {
      setForeignAmount("");
      setExchangeRate("");
      setDescription("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
    }
  }, [purchase, open]);

  // Cálculos em tempo real
  const foreignAmountNum = parseFloat(foreignAmount) || 0;
  const exchangeRateNum = parseFloat(exchangeRate) || 0;

  let localAmount = 0;
  if (exchangeRateNum > 0 && foreignAmountNum > 0) {
    localAmount = foreignAmountNum * exchangeRateNum;
  }

  const handleSubmit = () => {
    if (foreignAmountNum <= 0 || exchangeRateNum <= 0) return;

    onSubmit({
      foreign_amount: foreignAmountNum,
      exchange_rate: exchangeRateNum,
      cet_percentage: 0,
      description: description || undefined,
      purchase_date: purchaseDate,
    });
  };

  const isValid = foreignAmountNum > 0 && exchangeRateNum > 0 && purchaseDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Compra de Câmbio" : "Nova Compra de Câmbio"}
          </DialogTitle>
          <DialogDescription>
            Registre uma compra de {currency} para esta viagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Valor em moeda estrangeira */}
          <div className="space-y-2">
            <Label>Valor em {currency} *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                {currencySymbol}
              </span>
              <CurrencyInput
                placeholder="1000.00"
                value={foreignAmount}
                onChange={setForeignAmount}
                currency={currency}
                className="pl-10"
              />
            </div>
          </div>

          {/* Taxa de câmbio */}
          <div className="space-y-2">
            <Label>Taxa de Câmbio *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="number"
                step="0.0001"
                placeholder="5.1234"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Cálculo em tempo real */}
          {localAmount > 0 && (
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total em R$:</span>
                <span className="font-mono font-bold text-lg">
                  R$ {localAmount.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Data */}
          <div className="space-y-2">
            <Label>Data da Compra *</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex: Wise, Nomad, Casa de câmbio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isValid}>
            {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
