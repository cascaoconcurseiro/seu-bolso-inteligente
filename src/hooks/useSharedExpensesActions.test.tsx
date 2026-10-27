import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSharedExpensesActions } from "./useSharedExpensesActions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/components/ui/ActionFeedback", () => ({ showActionFeedback: vi.fn() }));
vi.mock("@/services/notificationService", () => ({
  createNotification: vi.fn(),
  createSettlementRejectedNotification: vi.fn(),
}));

describe("useSharedExpensesActions settlement failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats a business rejection as failure and rolls back optimistic state", async () => {
    const businessError = "Selecione itens de uma única moeda por acerto.";
    mocks.rpc.mockResolvedValue({ data: { success: false, error: businessError }, error: null });

    const previousState = [{ id: "transaction-1", transaction_splits: [{ id: "split-1" }] }];
    const queryClient = {
      getQueryData: vi.fn(() => previousState),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const setShowSettleDialog = vi.fn();
    const setSelectedItems = vi.fn();
    const invoiceItems = [
      {
        id: "item-1",
        originalTxId: "transaction-1",
        splitId: "split-1",
        description: "Despesa compartilhada",
        date: "2026-10-01",
        amount: 25,
        type: "DEBIT" as const,
        isPaid: false,
        memberId: "member-1",
        currency: "BRL",
        isSettled: false,
        settledByDebtor: false,
        settledByCreditor: false,
        canEdit: false,
        canDelete: false,
        canAnticipate: false,
        originalDate: "2026-10-01",
      },
    ];
    const props = {
      selectedMember: "member-1",
      settleAccountId: "account-1",
      settleType: "PAY" as const,
      settleAmount: "25.00",
      selectedItems: ["item-1"],
      settleDate: "2026-10-25",
      members: [{ id: "member-1", name: "Fran", linked_user_id: "other-user" }],
      getFilteredInvoice: () => invoiceItems,
      createTransaction: {},
      queryClient,
      user: { id: "user-1" },
      invalidateRelated: vi.fn().mockResolvedValue(undefined),
      refetch: vi.fn().mockResolvedValue(undefined),
      undoConfirm: { isOpen: false, item: null },
      setUndoConfirm: vi.fn(),
      deleteConfirm: { isOpen: false, item: null },
      setDeleteConfirm: vi.fn(),
      deleteSeriesConfirm: { isOpen: false, item: null },
      setDeleteSeriesConfirm: vi.fn(),
      setIsUndoingAll: vi.fn(),
      setUndoAllConfirm: vi.fn(),
      setIsSettling: vi.fn(),
      setShowSettleDialog,
      setSelectedMember: vi.fn(),
      setSettleAmount: vi.fn(),
      setSettleAccountId: vi.fn(),
      setSelectedItems,
      formatCurrency: (amount: number, currency: string) => `${currency} ${amount}`,
      accounts: [],
    };

    const { result, rerender } = renderHook(() => useSharedExpensesActions(props));

    await act(async () => {
      await result.current.handleSettle();
    });

    expect(supabase.rpc).toHaveBeenCalledWith("request_settlement_v2", {
      p_split_ids: ["split-1"],
      p_account_id: "account-1",
      p_is_payment: true,
      p_amount: 25,
    });
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(
      ["shared-transactions-consolidated"],
      previousState
    );
    expect(setShowSettleDialog.mock.calls).toEqual([[false], [true]]);
    expect(setSelectedItems).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(businessError);
    expect(toast.success).not.toHaveBeenCalled();

    mocks.rpc.mockClear();
    vi.mocked(toast.error).mockClear();
    props.selectedItems = [];
    rerender();
    await act(async () => {
      await result.current.handleSettle();
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Selecione pelo menos um item para acertar");

    mocks.rpc.mockClear();
    vi.mocked(toast.error).mockClear();
    invoiceItems.push({ ...invoiceItems[0], id: "item-2", splitId: "split-2", currency: "USD" });
    props.selectedItems = ["item-1", "item-2"];
    rerender();
    await act(async () => {
      await result.current.handleSettle();
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Selecione itens de uma única moeda por acerto.");

    mocks.rpc.mockResolvedValue({ data: null, error: null });
    vi.mocked(toast.error).mockClear();
    props.selectedItems = ["item-1"];
    rerender();
    await act(async () => {
      await result.current.handleSettle();
    });
    expect(toast.error).toHaveBeenCalledWith("O servidor não confirmou o acerto.");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
