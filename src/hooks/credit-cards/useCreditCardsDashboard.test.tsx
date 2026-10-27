import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreditCardsDashboard } from "./useCreditCardsDashboard";
import { supabase } from "@/integrations/supabase/client";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createTransaction: vi.fn(),
  refetchAccounts: vi.fn(),
  refetchTransactions: vi.fn(),
  invalidateQueries: vi.fn(),
  setSearchParams: vi.fn(),
  toastError: vi.fn(),
  searchParams: { get: vi.fn(() => null) },
  emptyData: [] as never[],
  invoiceData: { total: 120, transactions: [] as never[] },
  accounts: [
    {
      id: "card-1",
      name: "Cartão teste",
      type: "CREDIT_CARD",
      currency: "BRL",
      closing_day: 5,
      due_day: 15,
      bank_id: null,
      credit_limit: 1000,
      balance: 500,
    },
    {
      id: "source-1",
      name: "Conta teste",
      type: "CHECKING",
      currency: "BRL",
      balance: 1000,
    },
  ],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: vi.fn() },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mocks.searchParams, mocks.setSearchParams],
}));
vi.mock("@/contexts/MonthContext", () => ({
  useMonth: () => ({ currentDate: new Date("2026-10-01T12:00:00Z"), startDay: 1 }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "test@example.com" } }),
}));
vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: mocks.accounts,
    refetch: mocks.refetchAccounts,
    isLoading: false,
  }),
  useCreateAccount: () => ({}),
  useUpdateAccount: () => ({}),
  useDeleteAccount: () => ({}),
  useArchiveAccount: () => ({}),
  useArchivedAccounts: () => ({ data: [] }),
  useUnarchiveAccount: () => ({}),
  useCreditCardInvoice: () => ({ data: mocks.invoiceData, isFetching: false }),
  useAccountDependencies: () => ({ data: { can_delete: false } }),
  useCreditCardClosingOverride: () => ({ data: null }),
}));
vi.mock("@/hooks/transactions/useDependentTransactions", () => ({
  useDependentTransactions: () => ({ data: mocks.emptyData }),
}));
vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({ data: mocks.emptyData, refetch: mocks.refetchTransactions }),
  useCreateTransaction: () => ({ mutateAsync: mocks.createTransaction }),
  useDeleteTransaction: () => ({}),
  useBulkCreateTransactions: () => ({}),
}));
vi.mock("@/components/ui/ActionFeedback", () => ({ showActionFeedback: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

describe("useCreditCardsDashboard invoice payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: [{ id: "payment" }, { id: "reversal" }, { id: "carryover" }],
      error: null,
    });
  });

  it("submits partial payments through one atomic RPC with no sequential transaction writes", async () => {
    const { result } = renderHook(() => useCreditCardsDashboard());

    act(() => {
      result.current.setSelectedCard({
        id: "card-1",
        name: "Cartão teste",
        bank_id: null,
        credit_limit: 1000,
        balance: 500,
        closing_day: 5,
        due_day: 15,
        currency: "BRL",
      });
    });

    let success = false;
    await act(async () => {
      success = await result.current.handlePayInvoice("source-1", 90);
    });

    expect(success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "pay_credit_card_invoice_atomic",
      expect.objectContaining({
        p_card_account_id: "card-1",
        p_source_account_id: "source-1",
        p_invoice_total: 120,
        p_amount: 90,
        p_idempotency_key: expect.any(String),
      })
    );
    expect(mocks.createTransaction).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["credit-card-invoice", "card-1"],
    });
  });

  it("keeps RPC failures from falling back to separate writes", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: new Error("network failure") })
      .mockResolvedValueOnce({
        data: [{ id: "payment" }, { id: "reversal" }, { id: "carryover" }],
        error: null,
      });
    const { result } = renderHook(() => useCreditCardsDashboard());

    act(() => {
      result.current.setSelectedCard({
        id: "card-1",
        name: "Cartão teste",
        bank_id: null,
        credit_limit: 1000,
        balance: 500,
        closing_day: 5,
        due_day: 15,
        currency: "BRL",
      });
    });

    let success = true;
    await act(async () => {
      success = await result.current.handlePayInvoice("source-1", 90);
    });

    expect(success).toBe(false);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.createTransaction).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Erro ao processar pagamento: network failure");

    await act(async () => {
      success = await result.current.handlePayInvoice("source-1", 90);
    });

    expect(success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc.mock.calls[0][1].p_idempotency_key).toBe(
      supabase.rpc.mock.calls[1][1].p_idempotency_key
    );
    expect(mocks.createTransaction).not.toHaveBeenCalled();
  });
});
