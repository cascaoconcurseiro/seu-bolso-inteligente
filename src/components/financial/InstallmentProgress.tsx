import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "./CurrencyDisplay";

interface InstallmentProgressProps {
  current: number;
  total: number;
  paidAmount: number;
  totalAmount: number;
  description?: string;
  className?: string;
}

export function InstallmentProgress({
  current,
  total,
  paidAmount,
  totalAmount,
  description,
  className,
}: InstallmentProgressProps) {
  const progress = (current / total) * 100;
  const remaining = totalAmount - paidAmount;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          {description && (
            <p className="text-sm font-medium text-foreground">{description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Parcela {current} de {total}
          </p>
        </div>
        <div className="text-right">
          <CurrencyDisplay value={remaining} size="sm" className="text-foreground" />
          <p className="text-xs text-muted-foreground">restante</p>
        </div>
      </div>
      <div className="installment-progress">
        <div
          className="installment-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Pago: <CurrencyDisplay value={paidAmount} size="sm" />
        </span>
        <span>
          Total: <CurrencyDisplay value={totalAmount} size="sm" />
        </span>
      </div>
    </div>
  );
}