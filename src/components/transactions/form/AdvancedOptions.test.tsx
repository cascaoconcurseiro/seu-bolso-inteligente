import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvancedOptions } from "./AdvancedOptions";

const { setShowSplitModal } = vi.hoisted(() => ({
  setShowSplitModal: vi.fn(),
}));

vi.mock("@/store/useTransactionStore", () => ({
  useTransactionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isInstallment: false,
      setIsInstallment: vi.fn(),
      totalInstallments: 1,
      setTotalInstallments: vi.fn(),
      isRefund: false,
      setIsRefund: vi.fn(),
      isRecurring: false,
      setIsRecurring: vi.fn(),
      frequency: "monthly",
      setFrequency: vi.fn(),
      recurrenceDay: 1,
      setRecurrenceDay: vi.fn(),
      enableNotification: false,
      setEnableNotification: vi.fn(),
      notificationDate: "",
      setNotificationDate: vi.fn(),
      tripId: "",
      setTripId: vi.fn(),
      setShowSplitModal,
    }),
}));

describe("AdvancedOptions transaction splitting", () => {
  beforeEach(() => setShowSplitModal.mockClear());

  it("opens the regular member picker and never shows quick split", () => {
    render(
      <AdvancedOptions
        isExpense
        isCreditCard={false}
        currencySymbol="R$"
        numericAmount={100}
        trips={[]}
        hasSharing={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Mais opções/ }));
    fireEvent.click(screen.getByRole("button", { name: "Dividir" }));

    expect(setShowSplitModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("Divisão Rápida")).not.toBeInTheDocument();
  });
});
