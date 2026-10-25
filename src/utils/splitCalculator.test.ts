import { describe, expect, it } from "vitest";
import { splitCalculator } from "./splitCalculator";

describe("splitCalculator", () => {
  it("keeps preset percentages at 100% when three people share the other half", () => {
    const splits = ["a", "b", "c"].map((memberId) => ({
      memberId,
      percentage: 0,
      amount: 0,
    }));

    const result = splitCalculator.applyPreset(splits, 100, 50);

    expect(result.reduce((sum, split) => sum + split.percentage, 0)).toBe(50);
    expect(result.reduce((sum, split) => sum + split.amount, 0)).toBe(50);
    expect(result.map((split) => split.percentage)).toEqual([16.66, 16.66, 16.68]);
  });

  it("removes split rows when the preset assigns the full amount to the creator", () => {
    const splits = [{ memberId: "a", percentage: 50, amount: 50 }];

    expect(splitCalculator.applyPreset(splits, 100, 100)).toEqual([]);
  });

  it("assigns valid equal percentages if participants are selected before entering an amount", () => {
    const splits = ["a", "b", "c"].map((memberId) => ({
      memberId,
      percentage: 0,
      amount: 0,
    }));

    const result = splitCalculator.redistributeSplits(splits, 0, true);

    expect(result.map((split) => split.percentage)).toEqual([25, 25, 25]);
    expect(result.every((split) => split.amount === 0)).toBe(true);
  });

  it("preserves cents and the creator remainder for six participants", () => {
    const splits = ["a", "b", "c", "d", "e"].map((memberId) => ({
      memberId,
      percentage: 0,
      amount: 0,
    }));

    const result = splitCalculator.redistributeSplits(splits, 100, true);

    expect(result.reduce((sum, split) => sum + split.percentage, 0)).toBe(83.34);
    expect(result.reduce((sum, split) => sum + split.amount, 0)).toBe(83.34);
    expect(result.map((split) => split.percentage)).toEqual([16.66, 16.66, 16.66, 16.66, 16.7]);
  });
});
