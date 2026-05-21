import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BalanceCardProps {
  title: string;
  value: number;
  trend?: number;
  trendLabel?: string;
  className?: string;
  variant?: "default" | "primary" | "accent";
}

export function BalanceCard({
  title,
  value,
  trend,
  trendLabel,
  className,
  variant = "default",
}: BalanceCardProps) {
  const hasTrend = trend !== undefined;
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  const TrendIcon = isPositiveTrend
    ? TrendingUp
    : isNegativeTrend
    ? TrendingDown
    : Minus;

  const trendColorClass = isPositiveTrend
    ? "text-positive"
    : isNegativeTrend
    ? "text-negative"
    : "text-muted-foreground";

  const variantClasses = {
    default: "bg-card",
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <div
      className={cn(
        "rounded-xl p-6 shadow-sm transition-all duration-200 hover:shadow-md",
        variantClasses[variant],
        className
      )}
    >
      <p
        className={cn(
          "text-sm font-medium mb-2",
          variant === "default" ? "text-muted-foreground" : "opacity-80"
        )}
      >
        {title}
      </p>
      <CurrencyDisplay
        value={value}
        size="xl"
        className={cn(
          variant === "primary" && "text-primary-foreground",
          variant === "accent" && "text-accent-foreground",
          variant === "default" && "text-foreground"
        )}
      />
      {hasTrend && (
        <div className={cn("flex items-center gap-1.5 mt-3", trendColorClass)}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isPositiveTrend && "+"}
            {trend?.toFixed(1)}%
          </span>
          {trendLabel && (
            <span
              className={cn(
                "text-xs",
                variant === "default" ? "text-muted-foreground" : "opacity-70"
              )}
            >
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}