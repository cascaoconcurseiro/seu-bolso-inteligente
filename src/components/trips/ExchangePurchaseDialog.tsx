import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExchangePurchase, ExchangePurchaseInput } from "@/types/tripExchange";
import { calculateEffectiveRate, calculateLocalAmount, getCurrencySymbol } from "@/services/exchangeCalculations";

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
  const [cetPercentage, setCetPercentage] = useState("6.38"); // IOF padrão
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
      setCetPercentage(purchase.cet_percentage.toString());
      setDescription(purchase.description || "");
      setPurchaseDate(purchase.purchase_date);
    } else {
      setForeignAmount("");
      setExchangeRate("");
      setCetPercentage("6.38");
      setDescription("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
    }
  }, [purchase, open]);

  // Cálculos em tempo real
  const foreignAmountNum = parseFloat(foreignAmount) || 0;
  const exchangeRateNum = parseFloat(exchangeRate) || 0;
  const cetPercentageNum = parseFloat(cetPercentage) || 0;

  let effectiveRate = 0;
  let localAmount = 0;

  if (exchangeRateNum > 0 && cetPercentageNum >= 0) {
    effectiveRate = calculateEffectiveRate(exchangeRateNum, cetPercentageNum);
    if (foreignAmountNum > 0) {
      localAmount = calculateLocalAmount(foreignAmountNum, effectiveRate);
    }
  }

  const handleSubmit = () => {
    if (foreignAmountNum <= 0 || exchangeRateNum <= 0) return;

    onSubmit({
      foreign_amount: foreignAmountNum,
      exchange_rate: exchangeRateNum,
      cet_percentage: cetPercentageNum,
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={foreignAmount}
                onChange={(e) => setForeignAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Taxa de câmbio */}
          <div className="grid grid-cols-2 gap-4">
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

            {/* CET */}
            <div className="space-y-2">
              <Label>CET / IOF (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="6.38"
                  value={cetPercentage}
                  onChange={(e) => setCetPercentage(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Cálculos em tempo real */}
          {effectiveRate > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa Efetiva:</span>
                <span className="font-mono font-medium">
                  R$ {effectiveRate.toFixed(4)}
                </span>
              </div>
              {localAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total em R$:</span>
                  <span className="font-mono font-bold text-lg">
                    R$ {localAmount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
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
