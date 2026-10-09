import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FamilyBalancePanel } from "./FamilyBalancePanel";

const rpcWithRetryMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/contexts/PrivacyContext", () => ({
  usePrivacy: () => ({ isPrivate: false }),
}));

vi.mock("@/contexts/MonthContext", () => ({
  useMonth: () => ({ currentDate: new Date(2026, 9, 15) }),
}));

vi.mock("@/hooks/useFamily", () => ({
  useFamilyMembers: () => ({
    data: [
      { id: "member-fran", name: "Fran", linked_user_id: "fran-user" },
      { id: "member-jhonatan", name: "Jhonatan Rizzon", linked_user_id: "jhonatan-user" },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/utils/rpcWithRetry", () => ({
  rpcWithRetry: (...args: unknown[]) => rpcWithRetryMock(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("FamilyBalancePanel", () => {
  beforeEach(() => {
    rpcWithRetryMock.mockReset();
  });

  it("consulta apenas as dívidas pendentes do mês exibido no dashboard", async () => {
    rpcWithRetryMock.mockResolvedValue([
      {
        member_id: "member-fran",
        currency: "BRL",
        total_credits: 120,
        total_debits: 0,
        net_balance: 120,
      },
    ]);

    render(<FamilyBalancePanel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(rpcWithRetryMock).toHaveBeenCalledWith("get_current_shared_debts_v2", {
        p_start_date: "2026-10-01",
        p_end_date: "2026-10-31",
      });
    });

    await waitFor(() => expect(screen.getByText("Fran")).toBeInTheDocument());
    expect(screen.queryByText("Jhonatan Rizzon")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver tudo/i })).toHaveAttribute(
      "href",
      "/compartilhados?month=2026-10"
    );
  });
});
