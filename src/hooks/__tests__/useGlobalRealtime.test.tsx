import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

type Status = "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED" | "TIMED_OUT";

// Simula o cliente Realtime: `.channel(nome)` devolve o MESMO canal enquanto ele não for
// removido, e `.on()` em um canal já inscrito lança — exatamente o erro visto em produção.
const registry = new Map<string, FakeChannel>();
const created: string[] = [];

class FakeChannel {
  subscribed = false;
  callback: ((status: Status) => void) | null = null;
  constructor(public name: string) {}
  on() {
    if (this.subscribed) {
      throw new Error(
        `cannot add \`postgres_changes\` callbacks for realtime:${this.name} after \`subscribe()\`.`
      );
    }
    return this;
  }
  subscribe(cb: (status: Status) => void) {
    this.subscribed = true;
    this.callback = cb;
    return this;
  }
}

const removeChannel = vi.fn((ch: FakeChannel) => {
  registry.delete(ch.name);
  return Promise.resolve("ok");
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (name: string) => {
      const existing = registry.get(name);
      if (existing) return existing;
      const ch = new FakeChannel(name);
      registry.set(name, ch);
      created.push(name);
      return ch;
    },
    removeChannel: (ch: FakeChannel) => removeChannel(ch),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/utils/queryInvalidation", () => ({ invalidateTableQueries: vi.fn() }));
vi.mock("@/utils/logger", () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import { useGlobalRealtime } from "../useGlobalRealtime";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("useGlobalRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    registry.clear();
    created.length = 0;
    removeChannel.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("reconecta um canal que fechou sem reaproveitar o canal antigo", () => {
    expect(() => renderHook(() => useGlobalRealtime(), { wrapper })).not.toThrow();
    const first = [...registry.values()].find((c) => c.name.includes("-transactions-"));
    expect(first).toBeDefined();

    first!.callback!("CLOSED");
    expect(removeChannel).toHaveBeenCalledWith(first);

    // A reconexão não pode lançar "cannot add postgres_changes callbacks after subscribe()"
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    const reconnected = created.filter((n) => n.includes("-transactions-"));
    expect(reconnected).toHaveLength(2);
    expect(new Set(reconnected).size).toBe(2);
  });

  it("remove todos os canais ao desmontar", () => {
    const { unmount } = renderHook(() => useGlobalRealtime(), { wrapper });
    const total = registry.size;
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(total);
  });
});
