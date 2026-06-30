// Utility functions for credit card invoice calculations
import {
  parseDateUTC as parseDate,
  formatDateUTC as formatDate,
  getCompetenceDateUTC as getCompetenceDate,
  addMonthsToDate,
} from "@/utils/dateUtils";

export type ClosingDayMode = "FIXED_DAY" | "LAST_DAY" | "LAST_BUSINESS_DAY";

export interface InvoiceData {
  invoiceTotal: number;
  transactions: any[];
  status: "OPEN" | "CLOSED" | "PAID";
  daysToClose: number;
  closingDate: Date;
  dueDate: Date;
  startDate: Date;
}

/**
 * Calculate the actual closing date for a given reference month,
 * considering the closing day mode and any manual override.
 */
export const getActualClosingDate = (
  year: number,
  month: number, // 0-indexed
  closingDay: number,
  mode: ClosingDayMode = "FIXED_DAY",
  overrideDate?: string | null
): Date => {
  if (overrideDate) return parseDate(overrideDate);

  switch (mode) {
    case "LAST_DAY": {
      // Last calendar day of the month (UTC to avoid timezone shifting per MASTER_BLUEPRINT §3.3)
      return new Date(Date.UTC(year, month + 1, 0));
    }
    case "LAST_BUSINESS_DAY": {
      // Last weekday (Mon-Fri) of the month
      let d = new Date(Date.UTC(year, month + 1, 0));
      while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        d.setUTCDate(d.getUTCDate() - 1);
      }
      return d;
    }
    case "FIXED_DAY":
    default: {
      // Use the fixed day, clamped to the month's max days
      const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(closingDay || 1, maxDay);
      return new Date(Date.UTC(year, month, day));
    }
  }
};

/**
 * Determines which invoice month to show based on current date and actual closing date
 */
export const getTargetDate = (
  date: Date,
  closingDay?: number,
  mode: ClosingDayMode = "FIXED_DAY"
): Date => {
  if (!closingDay) return date;

  const actualClosing = getActualClosingDate(date.getFullYear(), date.getMonth(), closingDay, mode);
  const currentDay = date.getDate();
  const closingDateDay = actualClosing.getDate();

  if (currentDay > closingDateDay) {
    return addMonthsToDate(date, 1);
  }

  return date;
};

/**
 * Calculates invoice data for a given card and reference date.
 *
 * CICLO REAL DE FECHAMENTO:
 * Um cartão com closing_day=10 tem ciclo: dia 11 do mês anterior → dia 10 do mês atual.
 * Compras do dia 11/mai a 10/jun pertencem à fatura de JUNHO.
 *
 * O sistema usa competence_date (sempre YYYY-MM-01) para indicar a qual fatura
 * a transação pertence. Quando o usuário lança uma compra de dia 15/mai num cartão
 * que fecha dia 10, o sistema seta competence_date = 2025-06-01 (fatura de junho).
 *
 * Portanto, o filtro correto é comparar competence_date.month/year com referenceDate.month/year.
 * O startDate e closingDate são usados apenas para EXIBIÇÃO do período do ciclo.
 */
export const getInvoiceData = (
  account: {
    id: string;
    closing_day: number | null;
    due_day: number | null;
    closing_day_mode?: string | null;
    closing_date_override?: string | null;
  },
  transactions: any[],
  referenceDate: Date
): InvoiceData => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed
  const closingDay = account.closing_day || 1;
  const dueDay = account.due_day || 10;
  const mode = (account.closing_day_mode as ClosingDayMode) || "FIXED_DAY";

  // ── Datas do ciclo para EXIBIÇÃO ──────────────────────────────────────────
  const closingDate = getActualClosingDate(
    year,
    month,
    closingDay,
    mode,
    account.closing_date_override
  );

  // Start date: dia seguinte ao fechamento do mês ANTERIOR
  // Ex: fecha dia 10 → ciclo começa dia 11 do mês anterior
  const prevMonthClosing = addMonthsToDate(closingDate, -1);
  const startDate = new Date(prevMonthClosing);
  startDate.setDate(startDate.getDate() + 1);

  // Due date: vencimento para pagamento
  const dueDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
  let dueDate = parseDate(dueDateStr);
  // Se dia de vencimento <= dia de fechamento, vencimento cai no mês seguinte
  if (dueDay <= closingDay) {
    dueDate = addMonthsToDate(dueDate, 1);
  }

  // ── Filtro de transações ──────────────────────────────────────────────────
  // Usar competence_date para determinar a qual fatura a transação pertence.
  // competence_date é sempre YYYY-MM-01, representando o mês da fatura.
  // Pagamentos (TRANSFER → cartão) usam date física, não competence_date.
  const filteredTransactions = transactions.filter((t: any) => {
    if (t.account_id !== account.id && t.destination_account_id !== account.id) return false;

    // Pagamentos de fatura: TRANSFER chegando neste cartão
    // Usar date da transferência (não competence_date)
    if (t.type === "TRANSFER" && t.destination_account_id === account.id) {
      const payDate = parseDate(t.date);
      return payDate.getMonth() === month && payDate.getFullYear() === year;
    }

    // Transferências SAINDO deste cartão (self-transfer de saldo rotativo)
    if (t.type === "TRANSFER" && t.account_id === account.id) {
      // Self-transfer (saldo rotativo): usar date física
      if (t.destination_account_id === account.id) {
        const txDate = parseDate(t.date);
        return txDate.getMonth() === month && txDate.getFullYear() === year;
      }
      return false;
    }

    // Despesas e receitas: usar competence_date (fonte da verdade do mês da fatura)
    const competenceStr = t.competence_date || t.date;
    const txDate = parseDate(competenceStr);
    return txDate.getMonth() === month && txDate.getFullYear() === year;
  });

  // ── Cálculo do total da fatura ────────────────────────────────────────────
  const invoiceTotal = filteredTransactions.reduce((acc: number, t: any) => {
    const amount = Number(t.amount);

    if (t.type === "EXPENSE") return acc + amount;
    if (t.type === "INCOME") return acc - amount;

    // Saldo Rotativo (Self-Transfer no mesmo cartão)
    if (
      t.type === "TRANSFER" &&
      t.account_id === account.id &&
      t.destination_account_id === account.id
    ) {
      if (t.description?.includes("Estorno Saldo Rotativo")) return acc - amount;
      if (t.description?.includes("Saldo Rotativo Fatura Anterior")) return acc + amount;
      return acc;
    }

    // Pagamento recebido neste cartão (abate a fatura)
    if (t.type === "TRANSFER" && t.destination_account_id === account.id) return acc - amount;
    // Transferência saindo (não deve acontecer em cartão normal)
    if (t.type === "TRANSFER" && t.account_id === account.id) return acc + amount;

    return acc;
  }, 0);

  // ── Status ────────────────────────────────────────────────────────────────
  // OPEN: ciclo ainda não fechou (closingDate >= hoje)
  // CLOSED: ciclo fechou mas não há pagamento registrado (ainda não pago)
  // PAID: há um pagamento (TRANSFER) registrado nesta fatura que abate o total
  const now = new Date();
  const isClosed = closingDate < now;
  const daysToClose = Math.ceil((closingDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

  const payments = filteredTransactions.filter(
    (t: any) => t.type === "TRANSFER" && t.destination_account_id === account.id
  );
  const totalPaid = payments.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
  const isFullyPaid = isClosed && totalPaid > 0 && totalPaid >= invoiceTotal - 0.01;

  const status: "OPEN" | "CLOSED" | "PAID" = isFullyPaid ? "PAID" : isClosed ? "CLOSED" : "OPEN";

  return {
    invoiceTotal,
    transactions: filteredTransactions,
    status,
    daysToClose,
    closingDate,
    dueDate,
    startDate,
  };
};

/**
 * Format invoice cycle range string
 */
export const formatCycleRange = (startDate: Date, closingDate: Date): string => {
  const formatDay = (d: Date) => {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  return `${formatDay(startDate)} a ${formatDay(closingDate)}`;
};
