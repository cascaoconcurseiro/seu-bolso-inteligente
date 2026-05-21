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

export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
  account_id: string | null;
  currency: string;
  is_recurring: boolean;
  recurrence_pattern: string | null; // 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  recurrence_day: number | null;
  last_generated_date: string | null;
}

export interface GenerationResult {
  success: boolean;
  generated: number;
  errors: string[];
}

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
 * Gera transações recorrentes pendentes para um usuário
 */
export async function generatePendingRecurringTransactions(
  userId: string,
  upToDate: Date = new Date()
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: true,
    generated: 0,
    errors: [],
  };

  try {
    // Buscar transações recorrentes ativas
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_recurring", true)
      .order("date", { ascending: true });

    if (fetchError) {
      result.success = false;
      result.errors.push(`Erro ao buscar transações recorrentes: ${fetchError.message}`);
      return result;
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      return result;
    }

    const today = dateFns.startOfDay(upToDate);
    const transactionsToCreate: any[] = [];

    // Buscar contas do usuário para calcular competência correta no cartão de crédito
    const { data: userAccounts } = await supabase
      .from("accounts")
      .select("id, type, closing_day")
      .eq("user_id", userId);

    const accountMap = new Map<string, { type: string; closing_day: number | null }>();
    (userAccounts || []).forEach(acc => {
      accountMap.set(acc.id, { type: acc.type, closing_day: acc.closing_day });
    });

    /**
     * Calcula a competence_date respeitando o ciclo do cartão de crédito.
     * Se não for cartão, retorna o primeiro dia do mês da transação.
     */
    const calculateCompetenceForRecurrence = (dateStr: string, accountId: string | null): string => {
      const d = new Date(dateStr + 'T12:00:00Z');
      const account = accountId ? accountMap.get(accountId) : null;
      if (account && account.type === 'CREDIT_CARD' && account.closing_day !== null) {
        const day = d.getUTCDate();
        let compMonth = d.getUTCMonth();
        let compYear = d.getUTCFullYear();
        if (day > account.closing_day) {
          compMonth++;
          if (compMonth > 11) { compMonth = 0; compYear++; }
        }
        return `${compYear}-${String(compMonth + 1).padStart(2, '0')}-01`;
      }
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    };


    for (const tx of recurringTransactions) {
      if (!tx.recurrence_pattern) continue;

      // Determinar a última data gerada
      const lastGeneratedDate = tx.last_generated_date 
        ? new Date(tx.last_generated_date)
        : new Date(tx.date);

      // Calcular próximas ocorrências até hoje
      let nextDate = calculateNextOccurrence(
        lastGeneratedDate,
        tx.recurrence_pattern,
        tx.recurrence_day
      );

      // Gerar transações até a data limite (hoje)
      while (dateFns.isBefore(dateFns.startOfDay(nextDate), today) || dateFns.format(nextDate, 'yyyy-MM-dd') === dateFns.format(today, 'yyyy-MM-dd')) {
        // Criar nova transação baseada na recorrente
        const formattedDate = dateFns.format(nextDate, "yyyy-MM-dd");
        const newTransaction = {
          user_id: tx.user_id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          date: formattedDate,
          competence_date: calculateCompetenceForRecurrence(formattedDate, tx.account_id),
          category_id: tx.category_id,
          account_id: tx.account_id,
          currency: tx.currency,
          is_recurring: false, // A transação gerada não é recorrente
          source_transaction_id: tx.id, // Referência à transação original
          is_installment: false,
          is_shared: tx.is_shared || false,
          is_settled: false,
        };

        transactionsToCreate.push(newTransaction);

        // Calcular próxima data
        nextDate = calculateNextOccurrence(
          nextDate,
          tx.recurrence_pattern,
          tx.recurrence_day
        );

        // Limite de segurança: máximo 12 transações por vez
        if (transactionsToCreate.length >= 12) {
          break;
        }
      }

      // Atualizar last_generated_date da transação original
      if (transactionsToCreate.length > 0) {
        const lastCreatedDate = transactionsToCreate[transactionsToCreate.length - 1].date;
        
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ last_generated_date: lastCreatedDate as string })
          .eq("id", tx.id);

        if (updateError) {
          result.errors.push(`Erro ao atualizar last_generated_date: ${updateError.message}`);
        }
      }
    }

    // Inserir todas as transações geradas
    if (transactionsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactionsToCreate);

      if (insertError) {
        result.success = false;
        result.errors.push(`Erro ao criar transações: ${insertError.message}`);
      } else {
        result.generated = transactionsToCreate.length;
      }
    }

    return result;
  } catch (error: unknown) {
    result.success = false;
    result.errors.push(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return result;
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

      const lastDate = tx.last_generated_date 
        ? new Date(tx.last_generated_date)
        : new Date(tx.date);

      const nextDate = calculateNextOccurrence(
        lastDate,
        tx.recurrence_pattern,
        tx.recurrence_day
      );

      if (dateFns.isBefore(dateFns.startOfDay(nextDate), today) || dateFns.format(nextDate, 'yyyy-MM-dd') === dateFns.format(today, 'yyyy-MM-dd')) {
        pendingCount++;
      }
    }

    return pendingCount;
  } catch {
    return 0;
  }
}
