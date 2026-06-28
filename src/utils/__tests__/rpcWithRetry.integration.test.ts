/**
 * Testes de Integração para rpcWithRetry
 * Valida comportamento com falhas simuladas e timing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { rpcWithRetry } from "../rpcWithRetry";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// TODO: reescrever mocks para refletir API atual (rpc() retorna builder com .abortSignal())
describe.skip("rpcWithRetry - Integração", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve fazer retry com backoff exponencial", async () => {
    const mockData = { success: true };
    const error = new Error("Temporary failure");
    const startTime = Date.now();

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: mockData, error: null } as any);

    const result = await rpcWithRetry(
      "test_function",
      {},
      {
        maxRetries: 3,
        baseDelayMs: 100,
      }
    );

    const duration = Date.now() - startTime;

    expect(result).toEqual(mockData);
    // Deve ter esperado pelo menos 100ms (primeira falha) + 200ms (segunda falha) = 300ms
    // Permitindo margem para jitter e overhead
    expect(duration).toBeGreaterThanOrEqual(250);
  });

  it("deve simular falha de rede e recuperar", async () => {
    const mockData = { id: "123", status: "success" };
    const networkError = new Error("Network request failed");

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error: networkError } as any)
      .mockResolvedValueOnce({ data: mockData, error: null } as any);

    const result = await rpcWithRetry(
      "settle_split",
      {
        p_split_id: "split-123",
      },
      {
        maxRetries: 2,
        baseDelayMs: 50,
      }
    );

    expect(result).toEqual(mockData);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it("deve falhar rapidamente em erro de validação", async () => {
    const validationError = { status: 400, message: "Invalid input" };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: validationError,
    } as any);

    const startTime = Date.now();

    await expect(
      rpcWithRetry(
        "test_function",
        {},
        {
          maxRetries: 3,
          baseDelayMs: 100,
        }
      )
    ).rejects.toThrow();

    const duration = Date.now() - startTime;

    // Deve falhar rapidamente sem fazer retries
    expect(duration).toBeLessThan(500);
    expect(supabase.rpc).toHaveBeenCalledOnce();
  });

  it("deve lidar com múltiplas falhas antes de sucesso", async () => {
    const mockData = { result: "success" };
    const error = new Error("Service temporarily unavailable");

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: mockData, error: null } as any);

    const result = await rpcWithRetry(
      "get_financial_summary",
      {
        p_user_id: "user-123",
      },
      {
        maxRetries: 4,
        baseDelayMs: 50,
      }
    );

    expect(result).toEqual(mockData);
    expect(supabase.rpc).toHaveBeenCalledTimes(4);
  });

  it("deve respeitar maxRetries e falhar após limite", async () => {
    const error = new Error("Persistent error");

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
    } as any);

    await expect(
      rpcWithRetry(
        "test_function",
        {},
        {
          maxRetries: 2,
          baseDelayMs: 50,
        }
      )
    ).rejects.toThrow("Persistent error");

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it("deve passar parâmetros corretos para RPC", async () => {
    const mockData = { success: true };
    const params = {
      p_split_id: "split-123",
      p_amount: 100,
      p_account_id: "account-456",
    };

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockData,
      error: null,
    } as any);

    await rpcWithRetry("settle_split", params);

    expect(supabase.rpc).toHaveBeenCalledWith("settle_split", params);
  });

  it("deve lidar com timeout e fazer retry", async () => {
    const mockData = { success: true };

    // Primeira chamada: timeout
    // Segunda chamada: sucesso
    let callCount = 0;
    vi.mocked(supabase.rpc).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout após 30000ms")), 100)
        );
      }
      return Promise.resolve({ data: mockData, error: null } as any);
    });

    const result = await rpcWithRetry(
      "test_function",
      {},
      {
        maxRetries: 2,
        baseDelayMs: 50,
        timeoutMs: 30000,
      }
    );

    expect(result).toEqual(mockData);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });
});
