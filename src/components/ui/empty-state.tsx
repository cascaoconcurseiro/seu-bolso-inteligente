import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center animate-fade-in",
      "rounded-[2rem] border border-border/50 bg-gradient-to-b from-card/80 to-muted/20 backdrop-blur-xl shadow-sm",
      className
    )}>
      <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
        <Icon className="h-8 w-8 text-primary/70" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
