import { describe, it, expect } from "vitest";
import { getTargetDate, getActualClosingDate, formatCycleRange, getInvoiceData } from "./invoiceUtils";
import { addMonthsToCompetence } from "@/hooks/transactions/useCreateTransaction";

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("regra única de fatura do cartão", () => {
  it("compra no dia do fechamento vai para a próxima fatura", () => {
    expect(getTargetDate(local(2026, 10, 10), 10).getMonth()).toBe(10); // novembro
    expect(getTargetDate(local(2026, 10, 9), 10).getMonth()).toBe(9); // outubro
    expect(getTargetDate(local(2026, 10, 11), 10).getMonth()).toBe(10);
  });

  it("closing_date_override só vale para o mês da data", () => {
    const d = getActualClosingDate(2026, 9, 10, "FIXED_DAY", "2026-10-12");
    expect(d.getUTCDate()).toBe(12);
    const other = getActualClosingDate(2026, 10, 10, "FIXED_DAY", "2026-10-12");
    expect(other.getUTCDate()).toBe(10);
  });

  it("período do ciclo é 10/09 a 09/10 para fechamento dia 10", () => {
    const card = { id: "c", closing_day: 10, due_day: 20 };
    const inv = getInvoiceData(card, [], new Date(2026, 9, 15));
    expect(formatCycleRange(inv.startDate, inv.closingDate)).toBe("10/09 a 09/10");
  });

  it("parcelas derivam da primeira fatura, sem cortar em mês curto", () => {
    expect(addMonthsToCompetence("2026-02-01", 0)).toBe("2026-02-01");
    expect(addMonthsToCompetence("2026-02-01", 1)).toBe("2026-03-01");
    expect(addMonthsToCompetence("2026-11-01", 2)).toBe("2027-01-01");
    expect(addMonthsToCompetence("2026-12-01", 13)).toBe("2028-01-01");
  });
});
