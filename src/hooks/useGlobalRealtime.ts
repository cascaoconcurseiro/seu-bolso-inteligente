import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateAllFinancialData } from "@/utils/queryInvalidation";
import { logger } from "@/utils/logger";

/**
 * Escuta eventos de tempo real (Realtime) do Supabase globalmente.
 * Invalida queries do React Query automaticamente quando há mudanças no banco.
 * Reconecta automaticamente em caso de erro no canal.
 */
export function useGlobalRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimestampsRef = useRef<number[]>([]);
  const MAX_ERRORS_PER_WINDOW = 5;
  const ERROR_WINDOW_MS = 30000; // 30 segundos

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel>;
    let stableTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanupTimers = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (stableTimer) {
        clearTimeout(stableTimer);
        stableTimer = null;
      }
    };

    const shouldStopRetrying = (): boolean => {
      const now = Date.now();
      // Remove erros fora da janela
      errorTimestampsRef.current = errorTimestampsRef.current.filter(
        (t) => now - t < ERROR_WINDOW_MS
      );
      return errorTimestampsRef.current.length >= MAX_ERRORS_PER_WINDOW;
    };

    const connect = () => {
      if (cancelled) return;

      channel = supabase
        .channel("global-db-changes")
        .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
          const { table } = payload;

          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          timeoutRef.current = setTimeout(() => {
            invalidateAllFinancialData(queryClient);
          }, 1500);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            logger.info("Conectado ao Supabase Realtime com sucesso");
            // Reset do contador de erros só depois de 10s estável
            if (stableTimer) clearTimeout(stableTimer);
            stableTimer = setTimeout(() => {
              errorTimestampsRef.current = [];
            }, 10000);
          } else if (status === "CHANNEL_ERROR") {
            errorTimestampsRef.current.push(Date.now());
            logger.error(
              `Erro no canal Supabase Realtime (${errorTimestampsRef.current.length} erros em ${ERROR_WINDOW_MS / 1000}s)`
            );

            if (!cancelled && !shouldStopRetrying()) {
              const delay = Math.min(2000 * (errorTimestampsRef.current.length + 1), 30000);
              logger.warn(`Reconectando em ${delay}ms`);
              setTimeout(connect, delay);
            } else if (shouldStopRetrying()) {
              logger.error(
                "Muitos erros no canal Realtime. Parando tentativas — usando apenas polling."
              );
            }
          } else if (status === "CLOSED" || status === "TIMED_OUT") {
            if (!cancelled && !shouldStopRetrying()) {
              setTimeout(connect, 5000);
            }
          }
        });

      return channel;
    };

    const activeChannel = connect();

    return () => {
      cancelled = true;
      cleanupTimers();
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [user?.id, queryClient]);
}
