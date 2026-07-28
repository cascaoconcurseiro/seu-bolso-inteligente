/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { Repeat2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateNextOccurrence } from "@/services/recurrenceService";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { moneyUtils } from "@/utils/money";
import * as dateFns from "date-fns";

const MAX_ITEMS = 3;

function urgencyClass(daysUntil: number) {
  if (daysUntil <= 3) return "text-warning";
  return "text-muted-foreground";
}

function daysLabel(daysUntil: number) {
  if (daysUntil === 0) return "Hoje";
  if (daysUntil === 1) return "Amanhã";
  if (daysUntil <= 7) return `${daysUntil} dias`;
  return dateFns.format(dateFns.addDays(dateFns.startOfDay(new Date()), daysUntil), "dd/MM");
}

export const DashboardUpcomingRecurring = memo(function DashboardUpcomingRecurring() {
  const { user } = useAuth();
  const { isPrivate } = usePrivacy();

  const { data: transactions = [] } = useQuery({
    queryKey: ["upcoming-recurring", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          category:categories(id, name, icon)
        `
        )
        .eq("user_id", user.id)
        .eq("is_recurring", true)
        .not("recurrence_pattern", "is", null)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const today = useMemo(() => dateFns.startOfDay(new Date()), []);

  const upcoming = useMemo(() => {
    return transactions
      .filter((t) => t.is_recurring && t.recurrence_pattern)
      .map((tx) => {
        const lastDate = (tx as any).last_generated_date
          ? new Date((tx as any).last_generated_date + "T12:00:00")
          : new Date(tx.date + "T12:00:00");

        let nextDate = calculateNextOccurrence(
          lastDate,
          tx.recurrence_pattern!,
          (tx as any).recurrence_day ?? null
        );
        let safety = 0;
        while (dateFns.isBefore(dateFns.startOfDay(nextDate), today) && safety < 1000) {
          nextDate = calculateNextOccurrence(
            nextDate,
            tx.recurrence_pattern!,
            (tx as any).recurrence_day ?? null
          );
          safety++;
        }

        const daysUntil = dateFns.differenceInCalendarDays(dateFns.startOfDay(nextDate), today);

        return { tx, daysUntil };
      })
      .filter(({ daysUntil }) => daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, MAX_ITEMS);
  }, [transactions, today]);

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/40">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Repeat2 className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">Recorrências próximas</h3>
          <p className="text-xs text-muted-foreground">Próximas cobranças automáticas</p>
        </div>
        <Link
          to="/transacoes"
          state={{ tab: "proximas" }}
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1 shrink-0"
        >
          Ver mais <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border/40">
        {upcoming.map(({ tx, daysUntil }) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <span className="text-xl shrink-0">{tx.category?.icon ?? "🔁"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{tx.description}</p>
              <p className={cn("text-xs font-medium", urgencyClass(daysUntil))}>
                {daysLabel(daysUntil)}
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-bold font-mono tabular-nums shrink-0",
                tx.type === "EXPENSE" ? "text-destructive" : "text-positive"
              )}
            >
              {isPrivate
                ? "••••"
                : (tx.type === "EXPENSE" ? "-" : "+") +
                  moneyUtils.format(Number(tx.amount), tx.currency || "BRL")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
