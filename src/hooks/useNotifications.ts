/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Notification } from "@/services/notificationService";
import { logger } from "@/utils/logger";

export function useNotifications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 15000, // Polling a cada 15s como fallback do Realtime
    staleTime: 10000, // 10s de cache (Realtime invalida antes)
  });

  // Calcular notificações não lidas
  const unreadCount = query.data?.filter((n) => !n.is_read).length || 0;

  return {
    ...query,
    unreadCount,
  };
}

export function useMarkNotificationAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id],
        (old) => old?.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      logger.error("Erro ao marcar notificação como lida:", _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .or("is_read.eq.false,is_read.is.null");

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id],
        (old) => old?.map((n) => ({ ...n, is_read: true })) ?? []
      );
      return { previous };
    },
    onError: (_err, _v, context) => {
      if (context?.previous)
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      toast.error("Erro ao marcar notificações como lidas");
      logger.error("Erro ao marcar notificações como lidas", _err);
    },
    onSuccess: () => {
      toast.success("Todas as notificações foram marcadas como lidas");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDismissNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id],
        (old) => old?.filter((n) => n.id !== notificationId) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      logger.error("Erro ao dispensar notificação:", _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDismissAll() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .or("is_dismissed.eq.false,is_dismissed.is.null");

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      queryClient.setQueryData<Notification[]>(["notifications", user?.id], () => []);
      return { previous };
    },
    onError: (_err, _v, context) => {
      if (context?.previous)
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      toast.error("Erro ao remover notificações");
      logger.error("Erro ao remover notificações", _err);
    },
    onSuccess: () => {
      toast.success("Todas as notificações foram limpas");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook para buscar preferências de notificação
export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase.from("notification_preferences" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Se não existir, criar com valores padrão
      if (!data) {
        const { data: newPrefs, error: insertError } = await (
          supabase.from("notification_preferences" as any) as any
        )
          .insert({
            user_id: user.id,
            invoice_due_enabled: true,
            invoice_due_days_before: 3,
            budget_warning_enabled: true,
            budget_warning_threshold: 80,
            shared_pending_enabled: true,
            recurring_enabled: true,
            savings_goal_enabled: true,
            weekly_summary_enabled: true,
            email_notifications: false,
            push_notifications: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs;
      }

      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase.from("notification_preferences" as any) as any)
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferências atualizadas");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar preferências");
      logger.error("Erro ao atualizar preferências", error);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
