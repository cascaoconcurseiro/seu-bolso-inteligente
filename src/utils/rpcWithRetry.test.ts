/**
 * Testes para rpcWithRetry
 * Valida retry logic, backoff exponencial, e tratamento de erros
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rpcWithRetry, rpcWithRetryDetailed, batchRpcWithRetry } from './rpcWithRetry';
import { supabase } from '@/integrations/supabase/client';

// Mock do supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock do logger
vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('rpcWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar dados na primeira tentativa bem-sucedida', async () => {
    const mockData = { success: true, id: '123' };
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockData,
      error: null,
    } as any);

    const result = await rpcWithRetry('test_function', { param: 'value' });

    expect(result).toEqual(mockData);
    expect(supabase.rpc).toHaveBeenCalledOnce();
  });

  it('deve fazer retry em caso de erro retriável', async () => {
    const mockData = { success: true };
    const error = new Error('Network error');

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: mockData, error: null } as any);

    const result = await rpcWithRetry('test_function', {}, { maxRetries: 3, baseDelayMs: 10 });

    expect(result).toEqual(mockData);
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
  });

  it('deve lançar erro após esgotar retries', async () => {
    const error = new Error('Persistent error');

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
    } as any);

    await expect(
      rpcWithRetry('test_function', {}, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('Persistent error');

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it('não deve fazer retry em erro de autenticação (401)', async () => {
    const authError = { status: 401, message: 'Unauthorized' };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: authError,
    } as any);

    await expect(
      rpcWithRetry('test_function', {}, { maxRetries: 3, baseDelayMs: 10 })
    ).rejects.toThrow();

    // Deve tentar apenas uma vez (sem retry)
    expect(supabase.rpc).toHaveBeenCalledOnce();
  });

  it('não deve fazer retry em erro de permissão (403)', async () => {
    const permError = { status: 403, message: 'Forbidden' };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: permError,
    } as any);

    await expect(
      rpcWithRetry('test_function', {}, { maxRetries: 3, baseDelayMs: 10 })
    ).rejects.toThrow();

    expect(supabase.rpc).toHaveBeenCalledOnce();
  });

  it('deve chamar callback onRetry em cada tentativa falhada', async () => {
    const onRetry = vi.fn();
    const error = new Error('Test error');

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: { success: true }, error: null } as any);

    await rpcWithRetry('test_function', {}, { maxRetries: 3, baseDelayMs: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));
  });

  it('deve respeitar timeout', async () => {
    vi.mocked(supabase.rpc).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ data: null, error: null }), 100)
        ) as any
    );

    await expect(
      rpcWithRetry('test_function', {}, { maxRetries: 1, baseDelayMs: 10, timeoutMs: 50 })
    ).rejects.toThrow('timeout');
  });
});

describe('rpcWithRetryDetailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar resultado com metadados de sucesso', async () => {
    const mockData = { success: true };
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockData,
      error: null,
    } as any);

    const result = await rpcWithRetryDetailed('test_function', {});

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(1);
  });

  it('deve retornar resultado com metadados de falha', async () => {
    const error = new Error('Test error');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
    } as any);

    const result = await rpcWithRetryDetailed('test_function', {}, { maxRetries: 2, baseDelayMs: 10 });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.attempts).toBe(2);
  });

  it('deve registrar número de tentativas necessárias', async () => {
    const mockData = { success: true };
    const error = new Error('Temporary error');

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: null, error } as any)
      .mockResolvedValueOnce({ data: mockData, error: null } as any);

    const result = await rpcWithRetryDetailed('test_function', {}, { maxRetries: 3, baseDelayMs: 10 });

    expect(result.attempts).toBe(3);
    expect(result.data).toEqual(mockData);
  });
});

describe('batchRpcWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve executar múltiplas chamadas RPC em paralelo', async () => {
    const mockData1 = { id: '1' };
    const mockData2 = { id: '2' };
    const mockData3 = { id: '3' };

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: mockData1, error: null } as any)
      .mockResolvedValueOnce({ data: mockData2, error: null } as any)
      .mockResolvedValueOnce({ data: mockData3, error: null } as any);

    const results = await batchRpcWithRetry(
      [
        { functionName: 'func1', params: { id: '1' } },
        { functionName: 'func2', params: { id: '2' } },
        { functionName: 'func3', params: { id: '3' } },
      ],
      { maxRetries: 1, baseDelayMs: 10 }
    );

    expect(results).toEqual([mockData1, mockData2, mockData3]);
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
  });

  it('deve falhar se qualquer chamada falhar', async () => {
    const error = new Error('One call failed');

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: { id: '1' }, error: null } as any)
      .mockResolvedValueOnce({ data: null, error } as any);

    await expect(
      batchRpcWithRetry(
        [
          { functionName: 'func1' },
          { functionName: 'func2' },
        ],
        { maxRetries: 1, baseDelayMs: 10 }
      )
    ).rejects.toThrow();
  });
});
