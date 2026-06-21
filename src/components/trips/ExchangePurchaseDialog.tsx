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
import { moneyUtils } from "@/utils/money";

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
  const [localAmount, setLocalAmount] = useState("");
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
      setLocalAmount((purchase.foreign_amount * purchase.exchange_rate).toFixed(2));
      setDescription(purchase.description || "");
      setPurchaseDate(purchase.purchase_date);
    } else {
      setForeignAmount("");
      setLocalAmount("");
      setDescription("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
    }
  }, [purchase, open]);

  // Cálculos em tempo real
  const foreignAmountNum = moneyUtils.parse(foreignAmount) || 0;
  const localAmountNum = moneyUtils.parse(localAmount) || 0;

  let exchangeRateNum = 0;
  if (foreignAmountNum > 0 && localAmountNum > 0) {
    exchangeRateNum = localAmountNum / foreignAmountNum;
  }

  const handleSubmit = () => {
    if (foreignAmountNum <= 0 || localAmountNum <= 0) return;

    onSubmit({
      foreign_amount: foreignAmountNum,
      exchange_rate: exchangeRateNum,
      cet_percentage: 0,
      description: description || undefined,
      purchase_date: purchaseDate,
    });
  };

  const isValid = foreignAmountNum > 0 && localAmountNum > 0 && purchaseDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle>
            {isEditing ? "Editar Compra de Câmbio" : "Nova Compra de Câmbio"}
          </DialogTitle>
          <DialogDescription>
            Registre uma compra de {currency} para esta viagem
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-4">
          <div className="space-y-4 mt-2">
            {/* Valor em moeda estrangeira */}
            <div className="space-y-2">
              <Label>Valor em {currency} *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 font-medium">
                  {currencySymbol}
                </span>
                <CurrencyInput
                  placeholder="1000.00"
                  value={foreignAmount}
                  onChange={setForeignAmount}
                  currency={currency}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Total Pago */}
            <div className="space-y-2">
              <Label>Total Pago (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 font-medium">
                  R$
                </span>
                <CurrencyInput
                  placeholder="0.00"
                  value={localAmount}
                  onChange={setLocalAmount}
                  currency="BRL"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Cálculo em tempo real */}
            {exchangeRateNum > 0 && (
              <div className="p-4 rounded-xl bg-muted/50 border border-primary/20 bg-primary/5">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground font-medium">Taxa Efetiva:</span>
                  <span className="font-mono font-bold text-lg text-primary">
                    R$ {exchangeRateNum.toFixed(4).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Data */}
              <div className="space-y-2">
                <Label>Data da Compra *</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Wise, Nomad..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl h-12" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 rounded-xl h-12 font-bold" onClick={handleSubmit} disabled={isLoading || !isValid}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
