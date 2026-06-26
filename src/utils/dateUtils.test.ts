import { describe, it, expect } from "vitest";
import { parseSafeDate } from "./dateUtils";

describe("parseSafeDate", () => {
  it("retorna Date válido para string YYYY-MM-DD", () => {
    const d = parseSafeDate("2026-06-27");
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d!.getTime())).toBe(false);
  });

  it("retorna Date válido para ISO string", () => {
    const d = parseSafeDate("2026-06-27T00:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d!.getTime())).toBe(false);
  });

  it("retorna null para string nula", () => {
    expect(parseSafeDate(null)).toBeNull();
  });

  it("retorna null para string undefined", () => {
    expect(parseSafeDate(undefined)).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(parseSafeDate("")).toBeNull();
  });

  it("retorna null para string inválida como 'null'", () => {
    expect(parseSafeDate("null")).toBeNull();
  });

  it("retorna null para string inválida como 'undefined'", () => {
    expect(parseSafeDate("undefined")).toBeNull();
  });

  it("não crashea no sort quando usada como comparador", () => {
    const dates = ["2026-06-30", null, "2026-06-15", undefined, "invalid", "2026-06-01"]
      .map((d) => parseSafeDate(d as any))
      .filter((d): d is Date => d !== null);

    expect(() => dates.sort((a, b) => a.getTime() - b.getTime())).not.toThrow();
    expect(dates[0].getTime()).toBeLessThan(dates[dates.length - 1].getTime());
  });
});
