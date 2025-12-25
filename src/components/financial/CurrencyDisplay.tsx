import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface CurrencyDisplayProps {
  value: number;
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  showIcon?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl md:text-4xl",
};

export function CurrencyDisplay({
  value,
  size = "md",
  showSign = false,
  showIcon = false,
  className,
}: CurrencyDisplayProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value));

  const colorClass = isPositive
    ? "text-positive"
    : isNegative
    ? "text-negative"
    : "text-muted-foreground";

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "value-display inline-flex items-center gap-1",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {showIcon && <Icon className="h-4 w-4" />}
      {showSign && isPositive && "+"}
      {showSign && isNegative && "−"}
      {formattedValue}
    </span>
  );
}