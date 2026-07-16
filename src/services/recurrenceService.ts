/**
 * Serviço de Recorrência de Transações
 *
 * Gera automaticamente transações recorrentes baseadas em transações marcadas como is_recurring.
 * Este serviço pode ser chamado:
 * - Ao abrir o app (verificar transações pendentes)
 * - Por um cron job no backend
 * - Manualmente pelo usuário
 */

import { supabase } from "@/integrations/supabase/client";
import * as dateFns from "date-fns";

/**
 * Calcula a próxima data de ocorrência baseada no padrão de recorrência
 */
export function calculateNextOccurrence(
  lastDate: Date,
  pattern: string,
  recurrenceDay?: number | null
): Date {
  switch (pattern) {
    case "DAILY":
      return dateFns.addDays(lastDate, 1);
    case "WEEKLY":
      return dateFns.addWeeks(lastDate, 1);
    case "MONTHLY":
      // Se tem dia específico, usa ele; senão, adiciona 1 mês
      if (recurrenceDay) {
        const nextMonth = dateFns.addMonths(lastDate, 1);
        // Ajusta para o dia correto, considerando meses com menos dias
        const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(recurrenceDay, maxDay);
        return dateFns.setDate(nextMonth, targetDay);
      }
      return dateFns.addMonths(lastDate, 1);
    case "YEARLY":
      return dateFns.addYears(lastDate, 1);
    default:
      return dateFns.addMonths(lastDate, 1);
  }
}

/**
 * Verifica se há transações recorrentes pendentes
 */
export async function checkPendingRecurrences(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, recurrence_pattern, recurrence_day, last_generated_date")
      .eq("user_id", userId)
      .eq("is_recurring", true);

    if (error || !data) return 0;

    const today = dateFns.startOfDay(new Date());
    let pendingCount = 0;

    for (const tx of data) {
      if (!tx.recurrence_pattern) continue;

      // Determinar a última data de forma segura contra deslocamentos de fuso horário
      const lastDate = tx.last_generated_date
        ? new Date(tx.last_generated_date + "T12:00:00")
        : new Date(tx.date + "T12:00:00");

      const nextDate = calculateNextOccurrence(lastDate, tx.recurrence_pattern, tx.recurrence_day);

      if (
        dateFns.isBefore(dateFns.startOfDay(nextDate), today) ||
        dateFns.format(nextDate, "yyyy-MM-dd") === dateFns.format(today, "yyyy-MM-dd")
      ) {
        pendingCount++;
      }
    }

    return pendingCount;
  } catch {
    return 0;
  }
}
