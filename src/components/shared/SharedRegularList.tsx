import { SharedExpenseCard } from "@/components/shared/SharedExpenseCard";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import type { User } from "@supabase/supabase-js";
import type { FamilyMember } from "@/hooks/useFamily";

type CurrencyTotals = { credits: number; debits: number; net: number };

interface SharedRegularListProps {
  members: FamilyMember[];
  user: Pick<User, "id"> | null;
  activeTab: "REGULAR" | "HISTORY";
  getFilteredInvoice: (memberId: string) => InvoiceItem[];
  getTotals: (items: InvoiceItem[]) => Record<string, CurrencyTotals>;
  formatCurrency: (val: number, cur?: string) => string;
  onSettle: (
    id: string,
    type: "PAY" | "RECEIVE",
    amt: number,
    specificItem?: InvoiceItem,
    currency?: string
  ) => void;
  onUndo: (item: InvoiceItem) => void;
  onDelete: (item: InvoiceItem) => void;
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
  onAnticipate,
}: SharedRegularListProps) {
  const filteredMembers = members.filter((m) => m.linked_user_id !== user?.id);

  return (
    <>
      {filteredMembers.map((m) => {
        const items = getFilteredInvoice(m.id);
        if (items.length === 0) return null;

        const itemsByCurrency = new Map<string, InvoiceItem[]>();
        items.forEach((item) => {
          const currency = item.currency || "BRL";
          itemsByCurrency.set(currency, [...(itemsByCurrency.get(currency) || []), item]);
        });

        return [...itemsByCurrency.entries()].map(([currency, currencyItems]) => (
          <SharedExpenseCard
            key={`${m.id}-${currency}`}
            member={m}
            items={currencyItems}
            netAmount={getTotals(currencyItems)[currency]?.net || 0}
            currency={currency}
            isHistory={activeTab === "HISTORY"}
            currentUserId={user?.id}
            formatCurrency={formatCurrency}
            onSettle={onSettle}
            onUndo={onUndo}
            onDelete={onDelete}
            onAnticipate={onAnticipate}
          />
        ));
      })}
    </>
  );
}
