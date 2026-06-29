import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationPermissionPrompt() {
  const { isSupported, hasSubscription, subscribe, permission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Só mostra se: suporta push, não tem subscription, permissão não foi negada, não foi dispensado
  const shouldShow = isSupported && !hasSubscription && permission !== "denied" && !dismissed;

  if (!shouldShow) return null;

  return (
    <div className="mx-4 mt-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3 animate-in slide-in-from-top-4 duration-500">
      <Bell className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Receber notificações?</p>
        <p className="text-xs text-muted-foreground">
          Saiba quando contas vencem mesmo com o app fechado
        </p>
      </div>
      <Button
        size="sm"
        className="rounded-xl shrink-0"
        onClick={() => subscribe.mutate()}
        disabled={subscribe.isPending}
      >
        Ativar
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
