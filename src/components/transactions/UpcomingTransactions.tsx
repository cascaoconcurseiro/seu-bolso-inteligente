import { useMemo } from "react";
import { RefreshCw, CalendarClock, Zap, Repeat2 } from "lucide-react";
import { ScheduledBillsSection } from "./ScheduledBillsSection";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateNextOccurrence } from "@/services/recurrenceService";
import { usePrivacy } from "@/contexts/PrivacyContext";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

interface UpcomingItem {
  id: string;
  description: string;
  amount: number;
  nextDate: Date;
  daysUntil: number;
  pattern: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  categoryIcon?: string;
  categoryName?: string;
  accountName?: string;
}

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function UrgencyBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil <= 3) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
        {daysUntil === 0 ? "Hoje" : daysUntil === 1 ? "Amanhã" : `${daysUntil} dias`}
      </span>
    );
  }
  if (daysUntil <= 7) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
        {daysUntil} dias
      </span>
    );
  }
  return (
    <span className="text-[10px] text-muted-foreground">
      {dateFns.format(new Date(Date.now() + daysUntil * 86400000), "dd MMM", { locale: ptBR })}
    </span>
  );
}

function patternLabel(pattern: string) {
  const labels: Record<string, string> = {
    DAILY: "Diário",
    WEEKLY: "Semanal",
    MONTHLY: "Mensal",
    YEARLY: "Anual",
  };
  return labels[pattern] ?? pattern;
}

function UpcomingItemRow({ item, isPrivate }: { item: UpcomingItem; isPrivate: boolean }) {
  const isExpense = item.type === "EXPENSE";
  const icon = item.categoryIcon ?? (isExpense ? "💸" : "💰");

  const dotClass = isExpense
    ? item.daysUntil <= 3
      ? "bg-warning/15 text-warning"
      : "bg-muted text-muted-foreground"
    : "bg-positive/10 text-positive";

  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-border transition-all">
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0",
          dotClass
        )}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Repeat2 className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[11px] text-muted-foreground">{patternLabel(item.pattern)}</span>
          {item.accountName && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[11px] text-muted-foreground truncate">{item.accountName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className={cn(
            "text-sm font-bold font-mono tabular-nums",
            isExpense ? "text-negative" : "text-positive"
          )}
        >
          {isPrivate ? "••••" : (isExpense ? "-" : "+") + formatCurrencyBRL(Number(item.amount))}
        </span>
        <UrgencyBadge daysUntil={item.daysUntil} />
      </div>
    </div>
  );
}

export function UpcomingTransactions() {
  const { user } = useAuth();
  const { isPrivate } = usePrivacy();

  const { data: transactions = [] } = useQuery({
    queryKey: ["upcoming-recurring-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          category:categories(id, name, icon),
          account:accounts!account_id(id, name, currency)
        `
        )
        .eq("user_id", user.id)
        .eq("is_recurring", true)
        .not("recurrence_pattern", "is", null)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const today = useMemo(() => dateFns.startOfDay(new Date()), []);

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
    const recurring = transactions.filter((t) => t.is_recurring && t.recurrence_pattern);

    return recurring
      .map((tx) => {
        const lastDate = tx.last_generated_date
          ? new Date(tx.last_generated_date + "T12:00:00")
          : new Date(tx.date + "T12:00:00");

        let nextDate = calculateNextOccurrence(
          lastDate,
          tx.recurrence_pattern!,
          (tx as any).recurrence_day ?? null
        );
        let safety = 0;
        while (dateFns.isBefore(dateFns.startOfDay(nextDate), today) && safety < 1000) {
          nextDate = calculateNextOccurrence(nextDate, tx.recurrence_pattern!, (tx as any).recurrence_day ?? null);
          safety++;
        }

        const daysUntil = dateFns.differenceInCalendarDays(dateFns.startOfDay(nextDate), today);

        return {
          id: tx.id,
          description: tx.description,
          amount: Number(tx.amount),
          nextDate,
          daysUntil,
          pattern: tx.recurrence_pattern!,
          type: tx.type as "INCOME" | "EXPENSE" | "TRANSFER",
          categoryIcon: tx.category?.icon,
          categoryName: tx.category?.name,
          accountName: tx.account?.name,
        } satisfies UpcomingItem;
      })
      .filter((item) => item.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [transactions, today]);

  // Total de despesas previstas nos próximos 30 dias
  const monthlyPreview = useMemo(() => {
    return upcomingItems
      .filter((i) => i.type === "EXPENSE" && i.daysUntil <= 30)
      .reduce((sum, i) => sum + i.amount, 0);
  }, [upcomingItems]);

  const nearestDue = upcomingItems.filter((i) => i.type === "EXPENSE")[0];

  const thisWeek = upcomingItems.filter((i) => i.daysUntil <= 7);
  const nextDays = upcomingItems.filter((i) => i.daysUntil > 7 && i.daysUntil <= 30);
  const later = upcomingItems.filter((i) => i.daysUntil > 30);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Contas agendadas manualmente (PENDING) — sempre visível */}
      <ScheduledBillsSection />

      {upcomingItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CalendarClock className="h-8 w-8 text-primary opacity-60" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Nenhuma recorrência cadastrada</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Crie uma transação recorrente para ver aqui suas contas fixas e o que está por vir.
            </p>
          </div>
        </div>
      )}

      {upcomingItems.length > 0 && (
      <>
      {/* Summary card */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary/70">
          Previsto nos próximos 30 dias
        </p>
        <p className="text-3xl font-bold font-display text-foreground tabular-nums">
          {isPrivate ? "R$ ••••" : formatCurrencyBRL(monthlyPreview)}
        </p>
        {nearestDue && (
          <p className="text-xs text-muted-foreground">
            {nearestDue.daysUntil <= 0
              ? `${nearestDue.description} vence hoje`
              : nearestDue.daysUntil === 1
                ? `Próxima: ${nearestDue.description} amanhã`
                : `Próxima: ${nearestDue.description} em ${nearestDue.daysUntil} dias`}
          </p>
        )}
      </div>

      {/* Esta semana */}
      {thisWeek.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-warning" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Esta semana
            </h3>
          </div>
          {thisWeek.map((item) => (
            <UpcomingItemRow key={item.id} item={item} isPrivate={isPrivate} />
          ))}
        </section>
      )}

      {/* Próximos 30 dias */}
      {nextDays.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Próximas semanas
            </h3>
          </div>
          {nextDays.map((item) => (
            <UpcomingItemRow key={item.id} item={item} isPrivate={isPrivate} />
          ))}
        </section>
      )}

      {/* Mais adiante */}
      {later.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Mais adiante
            </h3>
          </div>
          {later.map((item) => (
            <UpcomingItemRow key={item.id} item={item} isPrivate={isPrivate} />
          ))}
        </section>
      )}
      </>
      )}
    </div>
  );
}
