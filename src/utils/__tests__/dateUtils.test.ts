import { describe, it, expect, vi } from "vitest";
import * as dateUtils from "../dateUtils";

describe("dateUtils", () => {
  describe("getBrazilDate", () => {
    it("should return a date in Brazil timezone", () => {
      // Mock system time to a fixed value
      const mockDate = new Date("2026-05-11T12:00:00Z");
      vi.setSystemTime(mockDate);

      const brazilDate = dateUtils.getBrazilDate();

      // SP is UTC-3 (usually)
      // If system is UTC, Brazil time should be 9:00
      expect(brazilDate.getHours()).toBe(9);

      vi.useRealTimers();
    });
  });

  describe("formatBrazilDate", () => {
    it("should format date to PT-BR standard", () => {
      const date = new Date("2026-05-11T12:00:00Z");
      expect(dateUtils.formatBrazilDate(date)).toBe("11/05/2026");
    });

    it("should format long date correctly", () => {
      const date = new Date("2026-05-11T12:00:00Z");
      const longDate = dateUtils.formatBrazilDate(date, "long");
      expect(longDate).toContain("maio");
      expect(longDate).toContain("2026");
    });
  });

  describe("getMonthDateRange", () => {
    it("should return correct range for May 2026", () => {
      const date = new Date("2026-05-15T12:00:00Z");
      const range = dateUtils.getMonthDateRange(date);

      expect(range.startDate).toBe("2026-05-01");
      expect(range.endDate).toBe("2026-05-31");
      expect(range.monthKey).toBe("2026-05");
    });

    it("should handle leap years (Feb 2024)", () => {
      const date = new Date("2024-02-10T12:00:00Z");
      const range = dateUtils.getMonthDateRange(date);

      expect(range.startDate).toBe("2024-02-01");
      expect(range.endDate).toBe("2024-02-29");
    });
  });

  describe("isToday", () => {
    it("should return true for current date", () => {
      const now = dateUtils.getBrazilDate();
      expect(dateUtils.isToday(now)).toBe(true);
    });

    it("should return false for different dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateUtils.isToday(tomorrow)).toBe(false);
    });
  });
});
