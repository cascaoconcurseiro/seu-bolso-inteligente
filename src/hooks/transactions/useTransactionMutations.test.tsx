import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateTransaction } from "./useTransactionMutations";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/utils/queryInvalidation", () => ({
  invalidateFinancialQueries: vi.fn(),
  invalidateSharedQueries: vi.fn(),
  invalidateTripQueries: vi.fn(),
}));

vi.mock("@/components/ui/ActionFeedback", () => ({
  showActionFeedback: vi.fn(),
}));

vi.mock("@/utils/toastMessages", () => ({
  transactionToasts: {
    created: vi.fn(),
    deleted: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/notificationGenerator", () => ({
  generateAllNotifications: vi.fn(),
}));

vi.mock("@/services/notificationService", () => ({
  createNotification: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUpdateTransaction", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("envia transação e divisões em uma única RPC atômica", async () => {
    const updatedTransaction = {
      id: "11111111-1111-4111-8111-111111111111",
      amount: 100,
      description: "Mercado",
    };
    rpcMock.mockResolvedValue({ data: updatedTransaction, error: null });

    const { result } = renderHook(() => useUpdateTransaction(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: updatedTransaction.id,
        amount: 100,
        description: "Mercado",
        transaction_splits: [
          {
            member_id: "22222222-2222-4222-8222-222222222222",
            percentage: 100,
            amount: 100,
          },
        ],
      } as never);
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("update_transaction_with_splits_v1", {
      p_transaction_id: updatedTransaction.id,
      p_transaction: {
        amount: 100,
        description: "Mercado",
      },
      p_splits: [
        {
          member_id: "22222222-2222-4222-8222-222222222222",
          percentage: 100,
          amount: 100,
        },
      ],
    });
  });
});
