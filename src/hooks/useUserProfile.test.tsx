import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateUserProfile, useUserProfile } from "./useUserProfile";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mocks.rpc(...args),
    from: (...args: unknown[]) => mocks.from(...args),
    auth: { updateUser: vi.fn() },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "user@example.com",
      user_metadata: { full_name: "Test User" },
    },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const safeProfile = {
  id: "user-1",
  email: "user@example.com",
  full_name: "Test User",
  avatar_url: null,
  require_pin_on_open: true,
  has_pin: true,
};

describe("useUserProfile with private profile columns restricted", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.insert.mockReset();
    mocks.update.mockReset();
    mocks.eq.mockReset();
    mocks.from.mockReturnValue({
      insert: mocks.insert,
      update: mocks.update,
    });
  });

  it("loads the current user through the safe RPC and exposes only has_pin", async () => {
    mocks.rpc.mockResolvedValue({ data: safeProfile, error: null });
    const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.has_pin).toBe(true));

    expect(mocks.rpc).toHaveBeenCalledWith("get_my_profile_v2");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(result.current.data).not.toHaveProperty("app_pin_hash");
  });

  it("creates a missing profile without requesting a private-column RETURNING row", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: safeProfile, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.id).toBe("user-1"));

    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.insert).toHaveBeenCalledWith({
      id: "user-1",
      email: "user@example.com",
      full_name: "Test User",
    });
  });

  it("updates profile settings without selecting private columns in the response", async () => {
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: safeProfile, error: null });
    const { result } = renderHook(() => useUpdateUserProfile(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ monthly_budget: 500 });
    });

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ monthly_budget: 500 }));
    expect(mocks.eq).toHaveBeenCalledWith("id", "user-1");
    expect(mocks.rpc).toHaveBeenCalledWith("get_my_profile_v2");
  });
});
