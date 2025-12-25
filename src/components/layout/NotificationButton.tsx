import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  read: boolean;
  createdAt: Date;
}

// TODO: Replace with real notifications from database
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Bem-vindo!",
    message: "Configure suas contas para começar a controlar suas finanças.",
    type: "info",
    read: false,
    createdAt: new Date(),
  },
];

export function NotificationButton() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-negative text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={cn(
                  "w-full p-4 text-left border-b border-border last:border-0 transition-colors",
                  notification.read ? "bg-background" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    notification.read ? "bg-transparent" : "bg-primary"
                  )} />
                  <div>
                    <p className={cn(
                      "font-medium text-sm",
                      !notification.read && "text-foreground"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
