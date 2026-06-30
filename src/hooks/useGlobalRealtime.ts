import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateTableQueries } from "@/utils/queryInvalidation";
import { logger } from "@/utils/logger";

/**
 * Mapeamento de tabela → query keys afetadas.
 * Cada evento de DB só invalida as queries realmente impactadas,
 * em vez de invalidar 50+ queries como antes.
 */
const TABLE_TO_QUERY_KEYS: Record<string, string[]> = {
  transactions: ["transactions", "dashboard-data", "financial-summary", "monthly-projection",
    "wealth-evolution", "monthly-evolution-report", "expenses-by-category"],
  accounts: ["accounts", "account-statement", "dashboard-data"],
  transaction_splits: ["transactions", "shared-transactions-with-splits", "shared-balances", "shared-transactions-consolidated"],
  budgets: ["budgets", "budgets-progress"],
  goals: ["goals", "goal-history", "goal-milestones"],
  goal_milestones: ["goal-milestones"],
  assets: ["assets", "asset-transactions"],
  asset_transactions: ["assets", "asset-transactions"],
  categories: ["categories"],
  trips: ["trips"],
  trip_members: ["trips", "trip-members", "trip-participants", "trip-participant-balances"],
  trip_invitations: ["pending-trip-invitations", "sent-trip-invitations"],
  family_members: ["family", "family-members"],
  family_invitations: ["family-invitations", "pending-family-invitations"],
  notifications: ["notifications"],
  auto_share_rules: ["auto-share-rules"],
};

/**
 * Escuta eventos de tempo real (Realtime) do Supabase com canais narrow.
 * Cada tabela tem seu próprio canal com filtro por user_id.
 * Invalida apenas as queries realmente impactadas pela mudança.
 */
export function useGlobalRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const errorTimestampsRef = useRef<number[]>([]);
  const MAX_ERRORS_PER_WINDOW = 5;
  const ERROR_WINDOW_MS = 30000;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    const debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    const shouldStopRetrying = (): boolean => {
      const now = Date.now();
      errorTimestampsRef.current = errorTimestampsRef.current.filter(
        (t) => now - t < ERROR_WINDOW_MS
      );
      return errorTimestampsRef.current.length >= MAX_ERRORS_PER_WINDOW;
    };

    const connectTable = (table: string, filter: string) => {
      if (cancelled) return;

      const channelName = `db-changes-${table}-${user.id}`;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter },
          () => {
            // Debounce: agrupa eventos da mesma tabela em 800ms
            const existing = debounceTimers.get(table);
            if (existing) clearTimeout(existing);

            debounceTimers.set(
              table,
              setTimeout(() => {
                if (cancelled) return;
                const keys = TABLE_TO_QUERY_KEYS[table];
                if (keys) {
                  invalidateTableQueries(queryClient, keys);
                }
                debounceTimers.delete(table);
              }, 800)
            );
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            logger.debug(`Realtime conectado: ${channelName}`);
          } else if (status === "CHANNEL_ERROR") {
            errorTimestampsRef.current.push(Date.now());
            logger.error(`Erro no canal ${channelName}`);
            if (!cancelled && !shouldStopRetrying()) {
              const delay = Math.min(2000 * (errorTimestampsRef.current.length + 1), 30000);
              setTimeout(() => connectTable(table, filter), delay);
            }
          } else if (status === "CLOSED" || status === "TIMED_OUT") {
            if (!cancelled && !shouldStopRetrying()) {
              setTimeout(() => connectTable(table, filter), 5000);
            }
          }
        });

      channels.push(channel);
    };

    // Canais narrow — cada tabela com filtro por user_id
    connectTable("transactions", `user_id=eq.${user.id}`);
    connectTable("accounts", `user_id=eq.${user.id}`);
    connectTable("transaction_splits", `user_id=eq.${user.id}`);
    connectTable("budgets", `user_id=eq.${user.id}`);
    connectTable("goals", `user_id=eq.${user.id}`);
    connectTable("goal_milestones", `user_id=eq.${user.id}`);
    connectTable("assets", `user_id=eq.${user.id}`);
    connectTable("asset_transactions", `user_id=eq.${user.id}`);
    connectTable("categories", `user_id=eq.${user.id}`);

    return () => {
      cancelled = true;
      debounceTimers.forEach((t) => clearTimeout(t));
      debounceTimers.clear();
      channels.forEach((ch) => {
        supabase.removeChannel(ch).catch(() => {});
      });
    };
  }, [user?.id, queryClient]);
}
