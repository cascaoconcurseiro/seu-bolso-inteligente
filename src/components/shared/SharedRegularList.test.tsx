import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FamilyMember } from "@/hooks/useFamily";
import type { InvoiceItem } from "@/utils/sharedFinanceCalculations";
import { SharedRegularList } from "./SharedRegularList";

vi.mock("@/components/shared/SharedExpenseCard", () => ({
  SharedExpenseCard: ({
    member,
    currency,
    netAmount,
    onSettle,
  }: {
    member: { id: string };
    currency: string;
    netAmount: number;
    onSettle: (...args: unknown[]) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSettle(
          member.id,
          netAmount < 0 ? "PAY" : "RECEIVE",
          Math.abs(netAmount),
          undefined,
          currency
        )
      }
    >
      {currency} {netAmount}
    </button>
  ),
}));

describe("SharedRegularList currency grouping", () => {
  it("shows a separate balance and settle scope for each currency", () => {
    const member = {
      id: "member-1",
      name: "Fran",
      linked_user_id: "fran-user",
    } as FamilyMember;
    const invoiceItems = [
      { id: "brl-item", currency: "BRL" },
      { id: "usd-item", currency: "USD" },
    ] as InvoiceItem[];
    const onSettle = vi.fn();
    const getTotals = (items: InvoiceItem[]) => {
      const currency = items[0]?.currency || "BRL";
      return {
        [currency]: {
          credits: 0,
          debits: Math.abs(currency === "USD" ? -12 : 20),
          net: currency === "USD" ? -12 : 20,
        },
      };
    };

    render(
      <SharedRegularList
        members={[member]}
        user={{ id: "current-user" } as never}
        activeTab="REGULAR"
        getFilteredInvoice={() => invoiceItems}
        getTotals={getTotals}
        formatCurrency={(amount, currency = "BRL") => `${currency} ${amount}`}
        onSettle={onSettle}
        onUndo={vi.fn()}
        onDelete={vi.fn()}
        onAnticipate={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "BRL 20" })).toBeVisible();
    expect(screen.getByRole("button", { name: "USD -12" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "USD -12" }));
    expect(onSettle).toHaveBeenCalledWith("member-1", "PAY", 12, undefined, "USD");
  });
});
