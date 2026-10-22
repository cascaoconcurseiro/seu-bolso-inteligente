import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFamily, useFamilyMembers } from "./useFamily";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
  in: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: unknown[]) => mocks.from(...args) },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner-1" } }),
}));

function createWrapper(initialFamily?: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (initialFamily) client.setQueryData(["family", "owner-1"], initialFamily);
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useFamily", () => {
  beforeEach(() => {
    mocks.from.mockReset().mockReturnValue({
      select: mocks.select.mockReset().mockReturnThis(),
      eq: mocks.eq.mockReset().mockReturnThis(),
      maybeSingle: mocks.maybeSingle.mockReset(),
      order: mocks.order.mockReset(),
      in: mocks.in.mockReset(),
    });
  });

  it("loads the family without making its visibility depend on profile access", async () => {
    const family = { id: "family-1", owner_id: "owner-1" };
    mocks.maybeSingle.mockResolvedValue({ data: family, error: null });

    const { result } = renderHook(() => useFamily(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(family));
    expect(mocks.select).toHaveBeenCalledWith("*");
  });

  it("surfaces owner-family query errors instead of treating them as no family", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for table families" },
    });

    const { result } = renderHook(() => useFamily(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.data).toBeUndefined();
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("retries a transient family network failure once", async () => {
    const family = { id: "family-1", owner_id: "owner-1" };
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { message: "Failed to fetch" } })
      .mockResolvedValueOnce({ data: family, error: null });

    const { result } = renderHook(() => useFamily(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(family), { timeout: 5000 });
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("keeps member rows when the optional profile enrichment query fails", async () => {
    const family = { id: "family-1", owner_id: "owner-1" };
    const fran = {
      id: "member-fran",
      family_id: "family-1",
      linked_user_id: "fran-1",
      name: "Fran",
      role: "editor",
      status: "active",
      member_type: "family",
    };

    mocks.from.mockImplementation((table: string) => {
      const result =
        table === "family_members"
          ? { data: [fran], error: null }
          : { data: null, error: { message: "profile query unavailable" } };
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        in: vi.fn(() => builder),
        then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return builder;
    });

    const { result } = renderHook(() => useFamilyMembers(), {
      wrapper: createWrapper(family),
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );
    expect(result.current.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "member-fran", name: "Fran" })])
    );
  });
});
