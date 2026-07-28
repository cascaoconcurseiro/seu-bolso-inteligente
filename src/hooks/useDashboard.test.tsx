import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "./useDashboard";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/contexts/MonthContext", () => ({
  useMonth: () => ({
    currentDate: new Date(2026, 6, 1),
    startDay: 1,
  }),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useDashboardData", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("propaga a falha da RPC em vez de apresentar totais zerados como sucesso", async () => {
    const rpcError = { message: "network unavailable", code: "503" };
    rpcMock.mockResolvedValue({ data: null, error: rpcError });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(rpcError);
  });
});
