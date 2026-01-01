import { AlertTriangle, AlertCircle, Info, X, CreditCard, Wallet, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialAlerts, FinancialAlert, AlertSeverity } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  error: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-500",
    bg: "bg-yellow-500/10 border-yellow-500/30",
  },
  info: {
    icon: Info,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
};

const typeIcons: Record<string, typeof CreditCard> = {
  NEGATIVE_BALANCE: Wallet,
  CREDIT_LIMIT_WARNING: CreditCard,
  INSTALLMENT_DUE: Calendar,
};

interface AlertItemProps {
  alert: FinancialAlert;
  onDismiss?: (id: string) => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const config = severityConfig[alert.severity];
  const Icon = typeIcons[alert.type] || config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        config.bg
      )}
    >
      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={() => onDismiss(alert.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface AlertsPanelProps {
  maxAlerts?: number;
  showTitle?: boolean;
  className?: string;
}

export function AlertsPanel({ maxAlerts = 5, showTitle = true, className }: AlertsPanelProps) {
  const { alerts, hasAlerts, errorCount, warningCount } = useFinancialAlerts();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts
    .filter((a) => !dismissedIds.has(a.id))
    .slice(0, maxAlerts);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  if (!hasAlerts || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
            {errorCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500 text-white">
                {warningCount}
              </span>
            )}
          </h3>
        </div>
      )}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={handleDismiss} />
        ))}
      </div>
      {alerts.length > maxAlerts && (
        <p className="text-xs text-muted-foreground text-center">
          +{alerts.length - maxAlerts} alertas
        </p>
      )}
    </div>
  );
}
