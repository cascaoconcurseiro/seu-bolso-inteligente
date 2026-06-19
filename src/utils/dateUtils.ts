/**
 * Utilitários de Data e Hora
 * 
 * Todas as funções usam o horário de Brasília (America/Sao_Paulo)
 */

// Timezone de Brasília
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Obtém a data e hora atual no horário de Brasília
 */
export function getBrazilDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
}

/**
 * Obtém apenas a data (sem hora) no horário de Brasília
 * Formato: YYYY-MM-DD
 */
export function getBrazilDateString(): string {
  const date = getBrazilDate();
  return date.toISOString().split('T')[0];
}

/**
 * Obtém o horário atual de Brasília
 */
export function getBrazilTime(): { hour: number; minute: number; second: number } {
  const date = getBrazilDate();
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

/**
 * Obtém o período do dia no horário de Brasília
 */
export function getBrazilPeriodOfDay(): 'morning' | 'afternoon' | 'evening' {
  const { hour } = getBrazilTime();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Obtém o dia da semana no horário de Brasília
 * 0 = domingo, 6 = sábado
 */
export function getBrazilDayOfWeek(): number {
  return getBrazilDate().getDay();
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatBrazilDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('pt-BR');
  }
  
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formata uma data e hora para o padrão brasileiro
 */
export function formatBrazilDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Verifica se uma data é hoje (no horário de Brasília)
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = getBrazilDate();
  
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Verifica se uma data é ontem (no horário de Brasília)
 */
export function isYesterday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date(getBrazilDate());
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.getDate() === yesterday.getDate() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getFullYear() === yesterday.getFullYear();
}

/**
 * Obtém o início do mês atual (no horário de Brasília)
 */
export function getStartOfMonth(): Date {
  const date = getBrazilDate();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Obtém o fim do mês atual (no horário de Brasília)
 */
export function getEndOfMonth(): Date {
  const date = getBrazilDate();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Obtém o range de datas de um mês específico formatado como YYYY-MM-DD
 * Útil para queries que precisam de startDate e endDate
 */
export function getMonthDateRange(date: Date = getBrazilDate(), startDay: number = 1): {
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
    monthKey: `${normalizedStart.getFullYear()}-${String(normalizedStart.getMonth() + 1).padStart(2, '0')}`,
  };
}

/**
 * Formata uma data no formato ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Alias para formatDateISO para compatibilidade
 */


/**
 * Obtém o range de datas do mês atual
 */
export function getCurrentMonthRange() {
  return getMonthDateRange(getBrazilDate());
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adiciona meses a uma data
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calcula a diferença em dias entre duas datas
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

/**
 * Obtém uma chave única para o dia atual (para localStorage)
 */
export function getTodayKey(): string {
  const today = getBrazilDate();
  return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

/**
 * Converte uma string de data no formato YYYY-MM-DD em um objeto Date local,
 * evitando problemas de fuso horário (shifting).
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

