import { describe, expect, it } from "vitest";
import {
  groupItineraryByDay,
  moveItineraryItem,
  normalizeItineraryOrder,
  sortItinerary,
  type OrderableItineraryItem,
} from "./itineraryOrder";

const item = (
  id: string,
  date: string,
  order_index: number,
  created_at = "2026-07-01T12:00:00.000Z"
): OrderableItineraryItem => ({ id, date, order_index, created_at });

describe("itineraryOrder", () => {
  it("ordena por data, order_index e created_at", () => {
    const result = sortItinerary([
      item("late", "2026-08-02", 0),
      item("second", "2026-08-01", 1),
      item("first-newer", "2026-08-01", 0, "2026-07-02T12:00:00.000Z"),
      item("first-older", "2026-08-01", 0, "2026-07-01T12:00:00.000Z"),
    ]);

    expect(result.map(({ id }) => id)).toEqual(["first-older", "first-newer", "second", "late"]);
  });

  it("normaliza índices duplicados por dia sem mutar a entrada", () => {
    const input = [
      item("b", "2026-08-01", 4, "2026-07-02T12:00:00.000Z"),
      item("a", "2026-08-01", 4, "2026-07-01T12:00:00.000Z"),
      item("c", "2026-08-02", 9),
    ];

    const result = normalizeItineraryOrder(input);

    expect(result).not.toBe(input);
    expect(result.map(({ id, date, order_index }) => ({ id, date, order_index }))).toEqual([
      { id: "a", date: "2026-08-01", order_index: 0 },
      { id: "b", date: "2026-08-01", order_index: 1 },
      { id: "c", date: "2026-08-02", order_index: 0 },
    ]);
    expect(input[0].order_index).toBe(4);
  });

  it("move uma parada dentro do mesmo dia e renumera o dia", () => {
    const input = [
      item("a", "2026-08-01", 0),
      item("b", "2026-08-01", 1),
      item("c", "2026-08-01", 2),
    ];

    const result = moveItineraryItem(input, "c", "2026-08-01", 0);

    expect(result.map(({ id, order_index }) => ({ id, order_index }))).toEqual([
      { id: "c", order_index: 0 },
      { id: "a", order_index: 1 },
      { id: "b", order_index: 2 },
    ]);
  });

  it("move uma parada entre dias e renumera origem e destino", () => {
    const input = [
      item("a", "2026-08-01", 0),
      item("b", "2026-08-01", 1),
      item("c", "2026-08-02", 0),
    ];

    const result = moveItineraryItem(input, "b", "2026-08-02", 1);
    const grouped = groupItineraryByDay(result);

    expect(grouped["2026-08-01"].map(({ id, order_index }) => ({ id, order_index }))).toEqual([
      { id: "a", order_index: 0 },
    ]);
    expect(grouped["2026-08-02"].map(({ id, order_index }) => ({ id, order_index }))).toEqual([
      { id: "c", order_index: 0 },
      { id: "b", order_index: 1 },
    ]);
  });

  it("mantém a ordem quando o item não existe", () => {
    const input = [item("a", "2026-08-01", 0)];

    expect(moveItineraryItem(input, "missing", "2026-08-02", 0)).toEqual(input);
  });
});
