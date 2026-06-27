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
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel>;

    const connect = () => {
      if (cancelled) return;

      logger.debug("Conectando ao Supabase Realtime...");

      channel = supabase
        .channel("global-db-changes")
        .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
          const { table } = payload;
          logger.debug(`Evento Realtime recebido na tabela: ${table}`);

          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          timeoutRef.current = setTimeout(() => {
            logger.debug("Executando invalidação financeira após evento Realtime");
            invalidateAllFinancialData(queryClient);
          }, 1500);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            logger.info("Conectado ao Supabase Realtime com sucesso");
            retryCountRef.current = 0; // reset retry count on success
          } else if (status === "CHANNEL_ERROR") {
            logger.error("Erro no canal Supabase Realtime");
            // Tentar reconectar com backoff exponencial
            if (!cancelled && retryCountRef.current < MAX_RETRIES) {
              const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
              retryCountRef.current++;
              logger.warn(`Tentando reconectar em ${delay}ms (tentativa ${retryCountRef.current})`);
              setTimeout(connect, delay);
            } else if (retryCountRef.current >= MAX_RETRIES) {
              logger.error("Número máximo de tentativas de reconexão atingido");
            }
          } else if (status === "CLOSED" || status === "TIMED_OUT") {
            // Supabase Realtime fecha o canal depois de um tempo — reconectar
            if (!cancelled) {
              logger.debug("Canal Realtime fechado, reconectando...");
              setTimeout(connect, 1000);
            }
          }
        });

      return channel;
    };

    const activeChannel = connect();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [user?.id, queryClient]);
}
