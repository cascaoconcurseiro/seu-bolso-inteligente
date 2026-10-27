import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SharedSettleDialog } from "./SharedSettleDialog";

describe("SharedSettleDialog currency scope", () => {
  it("blocks mixed-currency confirmation and offers to keep only one currency", () => {
    const onSelectAll = vi.fn();
    const pendingMemberItems = [
      { id: "brl-item", currency: "BRL", type: "DEBIT", amount: 20, description: "Conta BRL" },
      { id: "usd-item", currency: "USD", type: "DEBIT", amount: 10, description: "Conta USD" },
    ];

    render(
      <SharedSettleDialog
        isOpen
        onOpenChange={vi.fn()}
        selectedMember="member-1"
        members={[{ id: "member-1", name: "Fran" }]}
        pendingMemberItems={pendingMemberItems}
        selectedItems={["brl-item", "usd-item"]}
        onToggleItem={vi.fn()}
        onSelectAll={onSelectAll}
        settleType="PAY"
        settleAmount="30,00"
        settleDate="2026-10-25"
        setSettleDate={vi.fn()}
        settleAccountId="account-1"
        setSettleAccountId={vi.fn()}
        accounts={[]}
        trips={[]}
        profile={null}
        user={null}
        onSettle={vi.fn()}
        isSettling={false}
        settlingMode="ALL"
      />
    );

    expect(screen.getByText(/valores em moedas diferentes não podem ser somados/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar somente BRL" }));
    expect(onSelectAll).toHaveBeenCalledWith("BRL");
  });

  it("blocks confirmation when the selected account belongs to another currency", () => {
    render(
      <SharedSettleDialog
        isOpen
        onOpenChange={vi.fn()}
        selectedMember="member-1"
        members={[{ id: "member-1", name: "Fran" }]}
        pendingMemberItems={[
          { id: "usd-item", currency: "USD", type: "DEBIT", amount: 10, description: "Conta USD" },
        ]}
        selectedItems={["usd-item"]}
        onToggleItem={vi.fn()}
        onSelectAll={vi.fn()}
        settleType="PAY"
        settleAmount="10,00"
        settleDate="2026-10-25"
        setSettleDate={vi.fn()}
        settleAccountId="brl-account"
        setSettleAccountId={vi.fn()}
        accounts={[
          { id: "brl-account", type: "CHECKING", is_international: false, currency: "BRL" },
        ]}
        trips={[]}
        profile={null}
        user={null}
        onSettle={vi.fn()}
        isSettling={false}
        settlingMode="ALL"
      />
    );

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });
});
