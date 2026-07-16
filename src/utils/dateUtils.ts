/**
 * Utilitários de Data e Hora
 *
 * Todas as funções usam o horário de Brasília (America/Sao_Paulo)
 */

// Timezone de Brasília
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

/**
 * Obtém a data e hora atual no horário de Brasília
 */
export function getBrazilDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: BRAZIL_TIMEZONE }));
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatBrazilDate(date: Date | string, format: "short" | "long" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "short") {
    return d.toLocaleDateString("pt-BR");
  }

  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Verifica se uma data é hoje (no horário de Brasília)
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = getBrazilDate();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Obtém o range de datas de um mês específico formatado como YYYY-MM-DD
 * Útil para queries que precisam de startDate e endDate
 */
export function getMonthDateRange(
  date: Date = getBrazilDate(),
  startDay: number = 1
): {
  startDate: string;
  endDate: string;
  monthKey: string;
} {
  const year = date.getFullYear();
  let month = date.getMonth();

  if (date.getDate() < startDay) {
    month = month - 1;
  }

  const startDate = new Date(year, month, startDay);
  const endDate = new Date(year, month + 1, startDay - 1);
  const normalizedStart = new Date(year, month, 1);

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate),
    monthKey: `${normalizedStart.getFullYear()}-${String(normalizedStart.getMonth() + 1).padStart(2, "0")}`,
  };
}

/**
 * Formata uma data no formato ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma string de data do banco (YYYY-MM-DD ou ISO) em Date com hora fixa
 * ao meio-dia para evitar problemas de fuso horário.
 * Retorna null se a string for nula, vazia ou resultar em data inválida.
 */
export function parseSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Converte uma string de data no formato YYYY-MM-DD em um objeto Date UTC,
 * evitando problemas de fuso horário (shifting).
 * MASTER_BLUEPRINT §3.3: usar Date.UTC(), nunca new Date(year, month, day).
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes("T") || dateStr.includes("Z")) {
    return new Date(dateStr);
  }
  const parts = dateStr.split("-");
  if (parts.length !== 3) return new Date(dateStr);

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day));
}

// ─── Funções migradas de lib/dateUtils (unificação DRY) ─────────────────

import { parseISO, addMonths as dfAddMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Parse ISO string (YYYY-MM-DD) usando date-fns.
 * Usa UTC para evitar problemas de timezone.
 */
export function parseDateUTC(dateString: string): Date {
  const date = parseISO(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  return date;
}

/**
 * Formata uma data para YYYY-MM-DD em UTC.
 */
export function formatDateUTC(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

/**
 * Obtém competence_date (YYYY-MM-01) em UTC.
 */
export function getCompetenceDateUTC(date: Date): string {
  const yyyyMM = formatInTimeZone(date, "UTC", "yyyy-MM");
  return `${yyyyMM}-01`;
}

/**
 * Adiciona meses usando date-fns (lida com bordas de mês corretamente).
 */
export function addMonthsToDate(date: Date, months: number): Date {
  return dfAddMonths(date, months);
}

/**
 * Namespace para compatibilidade com código que usava `import { dateUtils } from "@/lib/dateUtils"`.
 */
export const dateUtils = {
  parseDate: parseDateUTC,
  formatDate: formatDateUTC,
  getCompetenceDate: getCompetenceDateUTC,
  addMonthsToDate,
};
