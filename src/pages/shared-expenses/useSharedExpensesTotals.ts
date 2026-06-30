import { useMemo } from "react";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";

interface UseSharedExpensesTotalsProps {
  members: any[];
  invoices: Record<string, InvoiceItem[]>;
  currentDate: Date;
}

export function useSharedExpensesTotals({
  members,
  invoices,
  currentDate,
}: UseSharedExpensesTotalsProps) {
  const { totalsByCurrency, travelTotalsByCurrency } = useMemo(() => {
    const totalsByCurrency: Record<string, any> = {};
    const travelTotalsByCurrency: Record<string, any> = {};

    members.forEach((m) => {
      const allItems = invoices[m.id] || [];

      let scopeFilteredItems = allItems;
      if (m.sharing_scope !== "all") {
        scopeFilteredItems = allItems.filter((item) => {
          switch (m.sharing_scope) {
            case "trips_only":
              return !!item.tripId;
            case "date_range": {
              if (!m.scope_start_date && !m.scope_end_date) return true;
              if (!item.date) return false;
              const itemDate = new Date(item.date);
              const startDate = m.scope_start_date ? new Date(m.scope_start_date) : null;
              const endDate = m.scope_end_date ? new Date(m.scope_end_date) : null;
              if (startDate && itemDate < startDate) return false;
              if (endDate && itemDate > endDate) return false;
              return true;
            }
            case "specific_trip":
              return item.tripId === m.scope_trip_id;
            default:
              return true;
          }
        });
      }

      scopeFilteredItems.forEach((item) => {
        const cur = item.currency || "BRL";

        if (item.tripId) {
          if (!travelTotalsByCurrency[cur]) {
            travelTotalsByCurrency[cur] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
          }

          if (item.isPaid) {
            travelTotalsByCurrency[cur].settled += item.amount;
          } else if (item.type === "CREDIT") {
            travelTotalsByCurrency[cur].owedToMe += item.amount;
          } else {
            travelTotalsByCurrency[cur].iOwe += item.amount;
          }
        } else {
          if (!item.date) return;
          const [year, month] = item.date.split("-").map(Number);
          const itemDateObj = new Date(year, month - 1, 1);
          const currentViewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

          if (item.isPaid) {
            const isCurrentMonth =
              year === currentDate.getFullYear() && month - 1 === currentDate.getMonth();
            if (isCurrentMonth) {
              if (!totalsByCurrency[cur]) {
                totalsByCurrency[cur] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
              }
              totalsByCurrency[cur].settled += item.amount;
            }
          } else {
            if (itemDateObj <= currentViewDate) {
              if (!totalsByCurrency[cur]) {
                totalsByCurrency[cur] = { owedToMe: 0, iOwe: 0, balance: 0, settled: 0 };
              }
              if (item.type === "CREDIT") {
                totalsByCurrency[cur].owedToMe += item.amount;
              } else {
                totalsByCurrency[cur].iOwe += item.amount;
              }
            }
          }
        }
      });
    });

    Object.values(totalsByCurrency).forEach((t) => (t.balance = t.owedToMe - t.iOwe));
    Object.values(travelTotalsByCurrency).forEach((t) => (t.balance = t.owedToMe - t.iOwe));

    return { totalsByCurrency, travelTotalsByCurrency };
  }, [members, invoices, currentDate]);

  return {
    totalsByCurrency,
    travelTotalsByCurrency,
  };
}
