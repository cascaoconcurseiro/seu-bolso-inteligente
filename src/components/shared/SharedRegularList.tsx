import { SharedExpenseCard } from "@/components/shared/SharedExpenseCard";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import { Database } from "@/types/database";

type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"] & {
  linked_user_id?: string | null;
  sharing_scope?: string | null;
  scope_start_date?: string | null;
  scope_end_date?: string | null;
  scope_trip_id?: string | null;
};

interface SharedRegularListProps {
  members: FamilyMember[];
  user: any;
  activeTab: "REGULAR" | "HISTORY";
  getFilteredInvoice: (memberId: string) => InvoiceItem[];
  getTotals: (items: InvoiceItem[]) => Record<string, any>;
  formatCurrency: (val: number, cur?: string) => string;
  onSettle: (id: string, type: "PAY" | "RECEIVE", amt: number, specificItem?: InvoiceItem) => void;
  onUndo: (item: InvoiceItem) => void;
  onDelete: (item: InvoiceItem) => void;
  onConfirmReceipt: (item: InvoiceItem) => void;
  onRejectSettlement: (item: InvoiceItem) => void;
  onAnticipate: (item: InvoiceItem) => void;
}

export function SharedRegularList({
  members,
  user,
  activeTab,
  getFilteredInvoice,
  getTotals,
  formatCurrency,
  onSettle,
  onUndo,
  onDelete,
  onConfirmReceipt,
  onRejectSettlement,
  onAnticipate,
}: SharedRegularListProps) {
  const filteredMembers = members.filter((m) => m.linked_user_id !== user?.id);

  return (
    <>
      {filteredMembers.map((m) => {
        const items = getFilteredInvoice(m.id);
        if (items.length === 0) return null;

        return (
          <SharedExpenseCard
            key={m.id}
            member={m}
            items={items}
            netAmount={getTotals(items)["BRL"]?.net || 0}
            currency="BRL"
            isHistory={activeTab === "HISTORY"}
            currentUserId={user?.id}
            formatCurrency={formatCurrency}
            onSettle={onSettle}
            onUndo={onUndo}
            onDelete={onDelete}
            onConfirmReceipt={onConfirmReceipt}
            onRejectSettlement={onRejectSettlement}
            onAnticipate={onAnticipate}
          />
        );
      })}
    </>
  );
}
