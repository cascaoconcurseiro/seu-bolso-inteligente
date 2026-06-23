/**
 * Botão de Notificações com Centro de Notificações Integrado
 * 
 * Exibe badge com contagem de não lidas e abre dropdown com lista completa
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, X, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useNotifications, 
  useMarkNotificationAsRead, 
  useMarkAllAsRead,
  useDismissNotification,
  useDismissAll
} from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  getNotificationIcon, 
  getPriorityColor, 
  Notification 
} from "@/services/notificationService";
import { 
  generateAllNotifications, 
  checkAndCreateWelcomeNotification 
} from "@/services/notificationGenerator";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { 
    data: notifications = [],
    unreadCount, 
    isLoading,
    refetch,
  } = useNotifications();
  
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const dismiss = useDismissNotification();
  const dismissAll = useDismissAll();

  // Gerar notificações ao abrir o app (uma vez por sessão)
  useEffect(() => {
    const generateNotifications = async () => {
      if (!user) return;
      
      const sessionKey = `notifications_generated_${user.id}`;
      const lastGenerated = localStorage.getItem(sessionKey);
      const now = Date.now();
      
      // Gerar no máximo uma vez a cada 5 minutos
      if (lastGenerated && now - parseInt(lastGenerated) < 5 * 60 * 1000) {
        return;
      }

      // Prevenir execuções concorrentes movendo o setItem para antes do await
      localStorage.setItem(sessionKey, now.toString());
      setIsGenerating(true);
      try {
        // Verificar boas-vindas para novos usuários
        const userName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
        await checkAndCreateWelcomeNotification(user.id, userName);
        
        // Gerar outras notificações
        await generateAllNotifications(user.id);
        
        refetch();
      } catch (error) {
        console.error('Erro ao gerar notificações:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-white text-sm flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {isGenerating && (
            <span className="absolute -bottom-0.5 -right-0.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[380px] p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm gap-1 text-muted-foreground"
                onClick={() => dismissAll.mutate()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Você está em dia! 🎉
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Não lidas */}
              {unreadNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50 sticky top-0">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Novas ({unreadNotifications.length})
                    </span>
                  </div>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onDismiss={() => dismiss.mutate(notification.id)}
                    />
                  ))}
                </div>
              )}

              {/* Lidas */}
              {readNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/30 sticky top-0">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Anteriores
                    </span>
                  </div>
                  {readNotifications.slice(0, 10).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onDismiss={() => dismiss.mutate(notification.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/30">
          <Link 
            to="/configuracoes?section=notifications"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Configurar notificações →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ===== Item de Notificação =====

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}

function NotificationItem({ notification, onClick, onDismiss }: NotificationItemProps) {
  const icon = notification.icon || getNotificationIcon(notification.type);
  const timeAgo = dateFns.formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleClick = () => {
    onClick();
    // Se tem action_url, navegar
    if (notification.action_url && !notification.action_label) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg",
        !notification.is_read ? "bg-primary/10" : "bg-muted"
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm leading-tight",
            !notification.is_read && "font-medium"
          )}>
            {notification.title}
          </p>
          
          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="Remover notificação"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">
            {timeAgo}
          </span>
          
          {notification.priority !== 'NORMAL' && notification.priority !== 'LOW' && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              getPriorityColor(notification.priority)
            )}>
              {notification.priority === 'HIGH' ? 'Importante' : 'Urgente'}
            </span>
          )}
          
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </div>

        {/* Action button */}
        {notification.action_url && notification.action_label && (
          <Link 
            to={notification.action_url}
            className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {notification.action_label}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
