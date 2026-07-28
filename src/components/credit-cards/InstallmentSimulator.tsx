import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { NumericFormat } from "react-number-format";
import { cn } from "@/lib/utils";

interface InstallmentSimulatorProps {
  creditLimit: number | null;
  currentBalance: number;
  formatCurrency: (v: number) => string;
}

export function InstallmentSimulator({
  creditLimit,
  currentBalance,
  formatCurrency,
}: InstallmentSimulatorProps) {
  const [open, setOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [installments, setInstallments] = useState(12);
  const [interestRate, setInterestRate] = useState(2.99);

  const available = Math.max(0, (creditLimit ?? 0) - Math.abs(currentBalance));
  const monthly = purchaseAmount > 0 && installments > 0 ? purchaseAmount / installments : 0;
  const totalWithInterest =
    purchaseAmount > 0 && installments > 1
      ? purchaseAmount * Math.pow(1 + interestRate / 100, installments)
      : purchaseAmount;
  const monthlyWithInterest = installments > 0 ? totalWithInterest / installments : 0;
  const exceedsLimit = purchaseAmount > available;

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <button
        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-80 hover:opacity-100 transition-opacity"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5" />
          Simulador de Parcelamento
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-3 space-y-4 bg-black/20 rounded-2xl p-4 border border-white/10">
          {/* Purchase amount */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Valor da compra</Label>
            <NumericFormat
              value={purchaseAmount || ""}
              onValueChange={(v) => setPurchaseAmount(v.floatValue ?? 0)}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={2}
              prefix="R$ "
              placeholder="R$ 0,00"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/50"
            />
            {exceedsLimit && (
              <p className="text-xs text-red-300">
                ⚠ Excede o limite disponível ({formatCurrency(available)})
              </p>
            )}
          </div>

          {/* Installments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70">Parcelas</Label>
              <span className="text-sm font-bold text-white">{installments}x</span>
            </div>
            <Slider
              min={1}
              max={24}
              step={1}
              value={[installments]}
              onValueChange={([v]) => setInstallments(v)}
              className="accent-white"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>1x</span>
              <span>6x</span>
              <span>12x</span>
              <span>18x</span>
              <span>24x</span>
            </div>
          </div>

          {/* Interest rate */}
          {installments > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-white/70">Juros/mês</Label>
                <NumericFormat
                  value={interestRate}
                  onValueChange={(v) => setInterestRate(v.floatValue ?? 0)}
                  decimalSeparator=","
                  decimalScale={2}
                  suffix="%"
                  className="w-20 text-right bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-white/50"
                />
              </div>
            </div>
          )}

          {/* Result */}
          {purchaseAmount > 0 && (
            <div
              className={cn(
                "rounded-xl p-3 space-y-2 border",
                exceedsLimit ? "bg-red-500/20 border-red-400/30" : "bg-white/10 border-white/15"
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/70">Parcela</span>
                <span className="font-bold text-white text-sm">
                  {installments}x{" "}
                  {formatCurrency(installments === 1 ? purchaseAmount : monthlyWithInterest)}
                </span>
              </div>
              {installments > 1 && interestRate > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Sem juros</span>
                    <span className="text-xs text-white/60">{formatCurrency(monthly)}/mês</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/10">
                    <span className="text-xs text-white/70">Total com juros</span>
                    <span className="text-xs font-semibold text-orange-300">
                      {formatCurrency(totalWithInterest)}
                    </span>
                  </div>
                </>
              )}
              {installments === 1 && (
                <p className="text-xs text-white/50 text-center">Pagamento à vista</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
