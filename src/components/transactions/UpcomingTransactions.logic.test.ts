/**
 * Testa a lógica de filtragem e ordenação do UpcomingTransactions
 * sem precisar montar o componente React completo.
 */
import { describe, it, expect } from "vitest";
import { parseSafeDate } from "@/utils/dateUtils";

type ItemKind = "scheduled" | "recurring";

interface TestItem {
  id: string;
  date: Date;
  amount: number;
  kind: ItemKind;
}

function buildItems(rawDates: (string | null | undefined)[], kind: ItemKind): TestItem[] {
  return rawDates
    .map((d, i) => ({ raw: d, _date: parseSafeDate(d), id: String(i) }))
    .filter((x): x is typeof x & { _date: Date } => x._date !== null)
    .map((x) => ({ id: x.id, date: x._date, amount: 100, kind }));
}

function sortItems(items: TestItem[]) {
  return items
    .filter((i) => i.date instanceof Date && !isNaN(i.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

describe("UpcomingTransactions — lógica de filtragem e sort", () => {
  it("não crasha com datas null ou undefined na lista", () => {
    const items = buildItems([null, undefined, "2026-06-30", "null", ""], "scheduled");
    expect(() => sortItems(items)).not.toThrow();
  });

  it("filtra itens com date inválida antes do sort", () => {
    const items = buildItems(["2026-06-01", null, "2026-06-15", undefined], "scheduled");
    const result = sortItems(items);
    expect(result.every((i) => !isNaN(i.date.getTime()))).toBe(true);
  });

  it("ordena por data crescente", () => {
    const items = buildItems(["2026-06-30", "2026-06-10", "2026-06-20"], "recurring");
    const result = sortItems(items);
    expect(result[0].date.getDate()).toBe(10);
    expect(result[1].date.getDate()).toBe(20);
    expect(result[2].date.getDate()).toBe(30);
  });

  it("combina agendados e recorrentes sem crashar", () => {
    const scheduled = buildItems(["2026-06-05", null, "2026-06-25"], "scheduled");
    const recurring = buildItems(["2026-06-15", undefined], "recurring");
    const all = [...scheduled, ...recurring];
    expect(() => sortItems(all)).not.toThrow();
    const result = sortItems(all);
    // Deve ter apenas os válidos (3 scheduled válidos + 1 recurring válido = 4... mas null e undefined são filtrados)
    expect(result.length).toBe(3);
  });
});
