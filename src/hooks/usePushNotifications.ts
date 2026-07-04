import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// VAPID public key — deve estar em .env como VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const isSupported = "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;

  const { data: hasSubscription, refetch } = useQuery({
    queryKey: ["push-subscription", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!user && isSupported,
  });

  const subscribe = useMutation({
    mutationFn: async () => {
      if (!VAPID_PUBLIC_KEY) throw new Error("VAPID key não configurada");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permissão negada");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user!.id,
          endpoint: json.endpoint!,
          p256dh: (json.keys as any).p256dh,
          auth: (json.keys as any).auth,
        },
        { onConflict: "user_id,endpoint" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Notificações push ativadas");
    },
    onError: (e: Error) => {
      if (e.message === "Permissão negada") toast.error("Permissão negada pelo navegador");
      else toast.error("Erro ao ativar notificações");
    },
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user!.id)
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    },
    onSuccess: () => {
      refetch();
      toast.success("Notificações push desativadas");
    },
    onError: () => toast.error("Erro ao desativar notificações"),
  });

  return { isSupported, permission, hasSubscription: !!hasSubscription, subscribe, unsubscribe };
}
