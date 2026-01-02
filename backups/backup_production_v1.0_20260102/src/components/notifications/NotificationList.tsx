import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, DollarSign, Users, Calendar, Gift, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarkNotificationAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";

interface NotificationListProps {
  notifications: Notification[];
  onClose: () => void;
}

const notificationIcons = {
  SHARED_EXPENSE: DollarSign,
  SHARED_PENDING: DollarSign,
  SHARED_SETTLED: Gift,
  FAMILY_INVITE: Users,
  TRIP_INVITE: Calendar,
  PAYMENT_RECEIVED: Gift,
  SYSTEM: AlertCircle,
};

export function NotificationList({ notifications, onClose }: NotificationListProps) {
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navegar para a página relevante baseado no tipo
    if (notification.type === "SHARED_EXPENSE") {
      // Pode adicionar navegação para a página de despesas compartilhadas
      onClose();
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Nenhuma notificação</p>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="flex flex-col max-h-[500px]">
      {unreadNotifications.length > 0 && (
        <div className="px-4 py-2 border-b flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Marcar todas como lidas
          </Button>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || AlertCircle;
            
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3",
                  !notification.is_read && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  !notification.is_read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={cn(
                      "text-sm font-medium truncate",
                      !notification.is_read && "font-semibold"
                    )}>
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                    {notification.message}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function Bell({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
