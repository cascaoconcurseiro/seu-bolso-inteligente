/**
 * Hook para gerenciar notificações do sistema
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import {
  getActiveNotifications,
  getUnreadNotifications,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAllRead,
  cleanupOldNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  Notification,
  NotificationPreferences,
} from "@/services/notificationService";

/**
 * Hook principal para notificações
 */
export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar notificações ativas
  const { 
    data: notifications = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getActiveNotifications(user!.id),
    enabled: !!user,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
    staleTime: 30000,
    retry: false, // Não tentar novamente se falhar (tabela pode não existir)
  });

  // Contar não lidas
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: () => countUnreadNotifications(user!.id),
    enabled: !!user,
    refetchInterval: 60000, // Reduzido para 1 minuto
    staleTime: 30000,
    retry: false, // Não tentar novamente se falhar
  });

  // Marcar como lida
  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  // Marcar todas como lidas
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  // Dispensar notificação
  const dismissMutation = useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  // Dispensar todas lidas
  const dismissAllReadMutation = useMutation({
    mutationFn: () => dismissAllRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Limpar antigas (executa uma vez ao carregar) - desabilitado se tabela não existe
  useEffect(() => {
    if (user && notifications.length > 0) {
      cleanupOldNotifications(user.id);
    }
  }, [user, notifications.length]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    dismiss: dismissMutation.mutate,
    dismissAllRead: dismissAllReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}

/**
 * Hook para preferências de notificação
 */
export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: () => getNotificationPreferences(user!.id),
    enabled: !!user,
    retry: false, // Não tentar novamente se falhar
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) => 
      updateNotificationPreferences(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

/**
 * Hook para apenas contar notificações não lidas (leve)
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: () => countUnreadNotifications(user!.id),
    enabled: !!user,
    refetchInterval: 60000, // Reduzido para 1 minuto
    staleTime: 30000,
    retry: false, // Não tentar novamente se falhar
  });

  return count;
}
