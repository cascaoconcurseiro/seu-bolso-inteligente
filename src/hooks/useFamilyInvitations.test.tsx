import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAcceptInvitation } from "./useFamilyInvitations";

const rpcMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn() } }));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAcceptInvitation", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it("trata uma resposta de negócio sem sucesso como falha", async () => {
    rpcMock.mockResolvedValue({ data: { success: false, error: "Convite não encontrado" }, error: null });
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    result.current.mutate("invitation-1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toMatchObject({ message: "Convite não encontrado" });
    expect(toastErrorMock).toHaveBeenCalledWith("Erro ao aceitar: Convite não encontrado");
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
