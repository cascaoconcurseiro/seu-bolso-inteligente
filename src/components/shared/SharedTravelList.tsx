/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { SharedTripCard } from "@/components/shared/SharedTripCard";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import type { FamilyMember } from "@/hooks/useFamily";
import type { TripWithPersonalBudget as Trip } from "@/hooks/useTrips";

interface SharedTravelListProps {
  trips: Trip[];
  members: FamilyMember[];
  user: any;
  getFilteredInvoice: (memberId: string) => InvoiceItem[];
  getTotals: (items: InvoiceItem[]) => Record<string, any>;
  formatCurrency: (val: number, cur?: string) => string;
  onSettle: (
    id: string,
    type: "PAY" | "RECEIVE",
    amt: number,
    specificItem: InvoiceItem | undefined,
    tripId: string
  ) => void;
  onUndo: (item: InvoiceItem) => void;
  onDelete: (item: InvoiceItem) => void;
  onDeleteSeries: (item: InvoiceItem) => void;
  onAnticipate: (item: InvoiceItem) => void;
}

export function SharedTravelList({
  trips,
  members,
  user,
  getFilteredInvoice,
  getTotals,
  formatCurrency,
  onSettle,
  onUndo,
  onDelete,
  onDeleteSeries,
  onAnticipate,
}: SharedTravelListProps) {
  const filteredTrips = trips.filter((t) =>
    members.some((m) => getFilteredInvoice(m.id).some((i) => i.tripId === t.id))
  );

  return (
    <>
      {filteredTrips.map((t) => (
        <SharedTripCard
          key={t.id}
          trip={t}
          members={members}
          getFilteredInvoice={getFilteredInvoice}
          getTotals={getTotals}
          formatCurrency={formatCurrency}
          user={user}
          onSettle={(id, type, amt, specificItem) => onSettle(id, type, amt, specificItem, t.id)}
          onUndo={onUndo}
          onDelete={onDelete}
          onDeleteSeries={onDeleteSeries}
          onAnticipate={onAnticipate}
        />
      ))}
    </>
  );
}
