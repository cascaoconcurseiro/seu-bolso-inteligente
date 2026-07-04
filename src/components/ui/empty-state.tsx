import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type EmptyStateVariant = "default" | "success" | "warning" | "danger";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

const variantStyles: Record<
  EmptyStateVariant,
  { bg: string; glow: string; icon: string; ring: string }
> = {
  default: {
    bg: "bg-accent/10",
    glow: "shadow-[0_0_40px_hsl(var(--accent)/0.15)]",
    icon: "text-accent",
    ring: "ring-accent/20",
  },
  success: {
    bg: "bg-positive/10",
    glow: "shadow-[0_0_40px_hsl(var(--positive)/0.15)]",
    icon: "text-positive",
    ring: "ring-positive/20",
  },
  warning: {
    bg: "bg-warning/10",
    glow: "shadow-[0_0_40px_hsl(var(--warning)/0.15)]",
    icon: "text-warning",
    ring: "ring-warning/20",
  },
  danger: {
    bg: "bg-negative/10",
    glow: "shadow-[0_0_40px_hsl(var(--negative)/0.15)]",
    icon: "text-negative",
    ring: "ring-negative/20",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-10 text-center overflow-hidden",
        "rounded-3xl border border-border/40 bg-gradient-to-b from-card/60 to-muted/10",
        "animate-fade-in-up",
        className
      )}
    >
      {/* Decorative blur behind icon */}
      <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none")}>
        <div className={cn("w-40 h-40 rounded-full blur-3xl opacity-30", styles.bg)} />
      </div>

      {/* Icon container */}
      <div
        className={cn(
          "relative z-10 w-20 h-20 mb-5 rounded-2xl flex items-center justify-center",
          "ring-2",
          styles.bg,
          styles.glow,
          styles.ring
        )}
      >
        <Icon className={cn("h-9 w-9", styles.icon)} strokeWidth={1.5} />
      </div>

      <h3 className="relative z-10 text-base font-bold text-foreground mb-2 tracking-tight">
        {title}
      </h3>
      <p className="relative z-10 text-sm text-muted-foreground max-w-xs leading-relaxed">
        {description}
      </p>
      {action && <div className="relative z-10 mt-6">{action}</div>}
    </div>
  );
}
