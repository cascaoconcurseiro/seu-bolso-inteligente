import { useMemo, useState, useEffect, useRef } from "react";
import { CheckCircle2, Trash2, CalendarClock, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { calculateNextOccurrence } from "@/services/recurrenceService";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { getMonthDateRange } from "@/utils/dateUtils";
import { moneyUtils } from "@/utils/money";
import { toast } from "sonner";
import { generateAllNotifications } from "@/services/notificationGenerator";
import { ConfirmTransactionDialog, ConfirmTarget } from "./ConfirmTransactionDialog";
import { useConfirmScheduledBill, useConfirmRecurringOccurrence, useCancelScheduledBill } from "@/hooks/useScheduledBills";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnifiedItem {
  id: string;
  description: string;
  amount: number;
  date: Date;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  kind: "scheduled" | "recurring";
  categoryIcon?: string;
  accountName?: string;
  currency?: string;
  recurrencePattern?: string;
}

function formatDate(date: Date) {
  return dateFns.format(date, "dd/MM", { locale: ptBR });
}

function daysLabel(date: Date, today: Date) {
  const days = dateFns.differenceInCalendarDays(dateFns.startOfDay(date), today);
  if (days < 0) return { label: `Atrasada ${Math.abs(days)}d`, overdue: true };
  if (days === 0) return { label: "Hoje", overdue: false };
  if (days === 1) return { label: "Amanhã", overdue: false };
  return { label: formatDate(date), overdue: false };
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

function UnifiedItemRow({
  item,
  isPrivate,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: {
  item: UnifiedItem;
  isPrivate: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirming?: boolean;
  isCancelling?: boolean;
}) {
  const today = useMemo(() => dateFns.startOfDay(new Date()), []);
  const { label, overdue } = daysLabel(item.date, today);

  const isExpense = item.type === "EXPENSE";
  const isIncome = item.type === "INCOME";
  const isTransfer = item.type === "TRANSFER";

  const amountColor = isExpense ? "text-negative" : isIncome ? "text-positive" : "text-muted-foreground";
  const amountPrefix = isExpense ? "-" : isIncome ? "+" : "";

  const defaultIcon = isIncome ? "💰" : isTransfer ? "↔️" : "📋";
  const confirmLabel = isIncome ? "Marcar como recebido" : isTransfer ? "Marcar como realizado" : "Marcar como pago";

  const borderClass = overdue
    ? "border-destructive/30 bg-destructive/5"
    : item.kind === "scheduled"
      ? isIncome
        ? "border-positive/20 bg-positive/5"
        : isTransfer
          ? "border-border/60 bg-muted/30"
          : "border-primary/20 bg-primary/5"
      : "border-border/60 bg-card/50";

  return (
    <div className={cn("flex items-center gap-3 px-3 py-3 rounded-xl border transition-all", borderClass)}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-muted/50">
        {item.categoryIcon ?? defaultIcon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.kind === "recurring" && item.recurrencePattern && (
            <>
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground">{patternLabel(item.recurrencePattern)}</span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          <span
            className={cn(
              "text-[11px] font-medium",
              overdue ? "text-destructive" : item.kind === "scheduled" && isIncome ? "text-positive" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
          {item.accountName && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[11px] text-muted-foreground truncate">{item.accountName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={cn("text-sm font-bold font-mono tabular-nums mr-1", amountColor)}>
          {isPrivate
            ? "••••"
            : amountPrefix + moneyUtils.format(Number(item.amount), item.currency ?? "BRL")}
        </span>

        {onConfirm && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg hover:bg-positive/10 hover:text-positive"
            title={confirmLabel}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
        {item.kind === "scheduled" && onCancel && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            title="Remover agendamento"
            onClick={onCancel}
            disabled={isCancelling}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function UpcomingTransactions() {
  const { user } = useAuth();
  const { isPrivate } = usePrivacy();
  const { currentDate, startDay } = useMonth();
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const notifiedRef = useRef(false);

  const confirmScheduled = useConfirmScheduledBill();
  const confirmRecurring = useConfirmRecurringOccurrence();
  const cancelMutation = useCancelScheduledBill();

  const { startDate, endDate } = getMonthDateRange(currentDate, startDay);

  // Transações agendadas manualmente (PENDING) do mês selecionado
  const { data: pendingBills = [] } = useQuery({
    queryKey: ["scheduled-bills", user?.id, startDate, endDate],
    enabled: !!user,
    queryFn: async (): Promise<UnifiedItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, description, amount, date, currency, type,
          category:categories(id, name, icon),
          account:accounts!account_id(id, name)
        `)
        .eq("user_id", user.id)
        .eq("status", "PENDING")
        .is("deleted_at", null)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data || [])
        .filter((t: any) => !!t.date)
        .map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          date: new Date(t.date + "T12:00:00"),
          type: t.type as "INCOME" | "EXPENSE" | "TRANSFER",
          kind: "scheduled" as const,
          categoryIcon: t.category?.icon,
          accountName: t.account?.name,
          currency: t.currency,
        }));
    },
  });

  // Transações recorrentes — calcular ocorrência que cai no mês selecionado
  const { data: recurringTxs = [] } = useQuery({
    queryKey: ["recurring-for-month", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          category:categories(id, name, icon),
          account:accounts!account_id(id, name, currency)
        `)
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

  const monthStart = useMemo(() => dateFns.startOfDay(new Date(startDate + "T00:00:00")), [startDate]);
  const monthEnd = useMemo(() => dateFns.startOfDay(new Date(endDate + "T00:00:00")), [endDate]);

  const recurringItems = useMemo<UnifiedItem[]>(() => {
    return recurringTxs.flatMap((tx) => {
      if (!tx.date && !(tx as any).last_generated_date) return [];

      const recurrenceDay = (tx as any).recurrence_day ?? null;
      const rawDate = (tx as any).last_generated_date ?? tx.date;
      const lastDate = new Date(rawDate + "T12:00:00");
      if (isNaN(lastDate.getTime())) return [];

      // Avança até encontrar ocorrência dentro ou após o mês
      let nextDate = calculateNextOccurrence(lastDate, tx.recurrence_pattern!, recurrenceDay);
      let safety = 0;
      while (dateFns.isBefore(dateFns.startOfDay(nextDate), monthStart) && safety < 1000) {
        nextDate = calculateNextOccurrence(nextDate, tx.recurrence_pattern!, recurrenceDay);
        safety++;
      }

      if (isNaN(nextDate.getTime())) return [];

      // Só inclui se a ocorrência cai dentro do mês
      if (dateFns.isAfter(dateFns.startOfDay(nextDate), monthEnd)) return [];

      return [{
        id: tx.id,
        description: tx.description,
        amount: Number(tx.amount),
        date: nextDate,
        type: tx.type as "INCOME" | "EXPENSE" | "TRANSFER",
        kind: "recurring" as const,
        categoryIcon: (tx as any).category?.icon,
        accountName: (tx as any).account?.name,
        currency: tx.currency,
        recurrencePattern: tx.recurrence_pattern!,
      }] satisfies UnifiedItem[];
    });
  }, [recurringTxs, monthStart, monthEnd]);

  const allItems = useMemo(
    () =>
      [...pendingBills, ...recurringItems]
        .filter((i) => i.date instanceof Date && !isNaN(i.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [pendingBills, recurringItems]
  );

  const monthlyExpenses = useMemo(
    () => allItems.filter((i) => i.type === "EXPENSE").reduce((s, i) => s + i.amount, 0),
    [allItems]
  );
  const monthlyIncome = useMemo(
    () => allItems.filter((i) => i.type === "INCOME").reduce((s, i) => s + i.amount, 0),
    [allItems]
  );

  // Dispara notificações de vencimento uma vez por montagem
  useEffect(() => {
    if (user && !notifiedRef.current) {
      notifiedRef.current = true;
      generateAllNotifications(user.id).catch(() => {});
    }
  }, [user]);

  function handleConfirm(id: string, amount: number, date: string, kind: "scheduled" | "recurring") {
    setConfirmTarget(null);
    if (kind === "scheduled") {
      confirmScheduled.mutate({ id, amount, paidDate: date });
    } else {
      confirmRecurring.mutate({ templateId: id, amount, date });
    }
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CalendarClock className="h-8 w-8 text-primary opacity-60" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Nenhuma previsão para este mês</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Agende uma transação ou crie uma recorrência para ver o que está por vir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Resumo do mês */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary/70">
          Previsto para {dateFns.format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Despesas</p>
            <p className="text-2xl font-bold font-display text-negative tabular-nums">
              {isPrivate ? "••••" : "-" + moneyUtils.format(monthlyExpenses)}
            </p>
          </div>
          {monthlyIncome > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Receitas</p>
              <p className="text-2xl font-bold font-display text-positive tabular-nums">
                {isPrivate ? "••••" : "+" + moneyUtils.format(monthlyIncome)}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {allItems.length} {allItems.length === 1 ? "item previsto" : "itens previstos"} ·{" "}
          {pendingBills.length} agendado{pendingBills.length !== 1 ? "s" : ""} ·{" "}
          {recurringItems.length} recorrente{recurringItems.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Lista unificada ordenada por data */}
      <div className="space-y-2">
        {allItems.map((item) => (
          <UnifiedItemRow
            key={`${item.kind}-${item.id}`}
            item={item}
            isPrivate={isPrivate}
            onConfirm={() => setConfirmTarget({
              id: item.id,
              description: item.description,
              amount: item.amount,
              date: item.date,
              type: item.type,
              kind: item.kind,
              currency: item.currency,
            })}
            onCancel={item.kind === "scheduled" ? () => cancelMutation.mutate(item.id) : undefined}
            isConfirming={confirmScheduled.isPending || confirmRecurring.isPending}
            isCancelling={cancelMutation.isPending}
          />
        ))}
      </div>

      <ConfirmTransactionDialog
        target={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isPending={confirmScheduled.isPending || confirmRecurring.isPending}
      />
    </div>
  );
}
