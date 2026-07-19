export type ReportViewType = "MONTH" | "YEAR" | "CUSTOM";

export interface ReportPeriod {
  viewType: ReportViewType;
  currentDate: Date;
  customStartDate?: string;
  customEndDate?: string;
}

function isValidDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function isValidCustomRange({ customStartDate, customEndDate }: ReportPeriod): boolean {
  return (
    isValidDate(customStartDate) && isValidDate(customEndDate) && customStartDate <= customEndDate
  );
}

export function getReportQueryRange(period: ReportPeriod): { startDate: string; endDate: string } {
  if (period.viewType === "CUSTOM" && isValidCustomRange(period)) {
    return { startDate: period.customStartDate!, endDate: period.customEndDate! };
  }

  const year = period.currentDate.getFullYear();
  return { startDate: `${year - 1}-01-01`, endDate: `${year}-12-31` };
}

export function isInReportPeriod(transactionDate: string, period: ReportPeriod): boolean {
  const date = transactionDate.slice(0, 10);
  if (!isValidDate(date)) return false;

  if (period.viewType === "CUSTOM") {
    return (
      isValidCustomRange(period) && date >= period.customStartDate! && date <= period.customEndDate!
    );
  }

  const year = period.currentDate.getFullYear();
  if (period.viewType === "YEAR") return date.startsWith(`${year}-`);

  const month = String(period.currentDate.getMonth() + 1).padStart(2, "0");
  return date.startsWith(`${year}-${month}-`);
}
