import { describe, expect, it } from "vitest";
import { getReportQueryRange, isInReportPeriod } from "./reportPeriod";

describe("reportPeriod", () => {
  const currentDate = new Date(2026, 6, 19);

  it("uses the selected custom range, inclusively, for the database query", () => {
    expect(
      getReportQueryRange({
        viewType: "CUSTOM",
        currentDate,
        customStartDate: "2024-03-10",
        customEndDate: "2024-04-05",
      })
    ).toEqual({ startDate: "2024-03-10", endDate: "2024-04-05" });
  });

  it("includes both endpoints of a valid custom range", () => {
    const period = {
      viewType: "CUSTOM" as const,
      currentDate,
      customStartDate: "2024-03-10",
      customEndDate: "2024-04-05",
    };

    expect(isInReportPeriod("2024-03-10", period)).toBe(true);
    expect(isInReportPeriod("2024-04-05", period)).toBe(true);
    expect(isInReportPeriod("2024-04-06", period)).toBe(false);
  });

  it("rejects an inverted custom range", () => {
    expect(
      isInReportPeriod("2024-04-01", {
        viewType: "CUSTOM",
        currentDate,
        customStartDate: "2024-04-05",
        customEndDate: "2024-03-10",
      })
    ).toBe(false);
  });
});
