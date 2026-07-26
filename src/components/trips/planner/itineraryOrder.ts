export interface OrderableItineraryItem {
  id: string;
  date: string;
  order_index: number;
  created_at: string;
}

const compareItineraryItems = (
  left: OrderableItineraryItem,
  right: OrderableItineraryItem
): number => {
  const dateComparison = left.date.localeCompare(right.date);
  if (dateComparison !== 0) return dateComparison;

  const orderComparison = left.order_index - right.order_index;
  if (orderComparison !== 0) return orderComparison;

  const createdComparison = left.created_at.localeCompare(right.created_at);
  if (createdComparison !== 0) return createdComparison;

  return left.id.localeCompare(right.id);
};

export function sortItinerary<T extends OrderableItineraryItem>(items: readonly T[]): T[] {
  return [...items].sort(compareItineraryItems);
}

export function groupItineraryByDay<T extends OrderableItineraryItem>(
  items: readonly T[]
): Record<string, T[]> {
  return sortItinerary(items).reduce<Record<string, T[]>>((grouped, item) => {
    (grouped[item.date] ??= []).push(item);
    return grouped;
  }, {});
}

export function normalizeItineraryOrder<T extends OrderableItineraryItem>(
  items: readonly T[]
): T[] {
  return Object.values(groupItineraryByDay(items)).flatMap((dayItems) =>
    dayItems.map((item, order_index) => ({ ...item, order_index }))
  );
}

export function moveItineraryItem<T extends OrderableItineraryItem>(
  items: readonly T[],
  itemId: string,
  targetDate: string,
  targetIndex: number
): T[] {
  const normalized = normalizeItineraryOrder(items);
  const movingItem = normalized.find((item) => item.id === itemId);
  if (!movingItem) return normalized;

  const remaining = normalized.filter((item) => item.id !== itemId);
  const targetDayItems = remaining.filter((item) => item.date === targetDate);
  const insertAt = Math.max(0, Math.min(targetIndex, targetDayItems.length));
  targetDayItems.splice(insertAt, 0, { ...movingItem, date: targetDate });

  const unaffectedItems = remaining.filter(
    (item) => item.date !== movingItem.date && item.date !== targetDate
  );
  const sourceDayItems =
    movingItem.date === targetDate ? [] : remaining.filter((item) => item.date === movingItem.date);

  return sortItinerary([
    ...unaffectedItems,
    ...sourceDayItems.map((item, order_index) => ({ ...item, order_index })),
    ...targetDayItems.map((item, order_index) => ({ ...item, order_index })),
  ]);
}
