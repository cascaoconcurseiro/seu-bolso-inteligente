/**
 * Testes para validatePayerId / validateMemberId
 *
 * Exercita as funções reais de src/hooks/transactions/helpers.ts com o
 * cliente Supabase mockado — substitui o antigo useTransactions.test.ts,
 * que apenas fazia asserções sobre os próprios mocks.
 *
 * **Validates: Requirements 1.3**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePayerId, validateMemberId } from './helpers';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

type MockResult = { data: unknown; error: unknown };

/**
 * Configura o mock do supabase.from para responder às duas consultas feitas
 * pelas funções: family_members (via .or().maybeSingle()) e profiles
 * (via .eq().maybeSingle()).
 */
function mockSupabaseTables(familyResult: MockResult, profileResult: MockResult) {
  vi.mocked(supabase.from).mockImplementation(
    (table: string) =>
      ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(familyResult),
          }),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue(table === 'profiles' ? profileResult : familyResult),
          }),
        }),
      }) as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validatePayerId', () => {
  it('retorna true sem consultar o banco quando payer_id é null', async () => {
    await expect(validatePayerId(null)).resolves.toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('retorna true sem consultar o banco quando payer_id é undefined', async () => {
    await expect(validatePayerId(undefined)).resolves.toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('retorna true quando o payer existe em family_members', async () => {
    mockSupabaseTables({ data: { id: 'member-123' }, error: null }, { data: null, error: null });

    await expect(validatePayerId('member-123')).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('family_members');
  });

  it('retorna true quando o payer não está na família mas existe em profiles', async () => {
    mockSupabaseTables({ data: null, error: null }, { data: { id: 'user-456' }, error: null });

    await expect(validatePayerId('user-456')).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('family_members');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('lança erro descritivo quando o payer não existe em nenhuma tabela', async () => {
    mockSupabaseTables({ data: null, error: null }, { data: null, error: null });

    await expect(validatePayerId('inexistente')).rejects.toThrow(
      'O pagador selecionado é inválido ou não foi encontrado.'
    );
  });

  it('lança erro de validação quando a consulta a family_members falha', async () => {
    mockSupabaseTables(
      { data: null, error: { message: 'connection refused' } },
      { data: null, error: null }
    );

    await expect(validatePayerId('member-123')).rejects.toThrow(
      'Erro ao validar pagador. Tente novamente.'
    );
  });

  it('lança erro de validação quando a consulta a profiles falha', async () => {
    mockSupabaseTables(
      { data: null, error: null },
      { data: null, error: { message: 'timeout' } }
    );

    await expect(validatePayerId('user-456')).rejects.toThrow(
      'Erro ao validar pagador. Tente novamente.'
    );
  });
});

describe('validateMemberId', () => {
  it('retorna true sem consultar o banco quando member_id é null', async () => {
    await expect(validateMemberId(null)).resolves.toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('retorna true quando o membro existe em family_members', async () => {
    mockSupabaseTables({ data: { id: 'member-789' }, error: null }, { data: null, error: null });

    await expect(validateMemberId('member-789')).resolves.toBe(true);
  });

  it('retorna true quando o membro não está na família mas existe em profiles', async () => {
    mockSupabaseTables({ data: null, error: null }, { data: { id: 'user-999' }, error: null });

    await expect(validateMemberId('user-999')).resolves.toBe(true);
  });

  it('lança erro descritivo quando o membro não existe em nenhuma tabela', async () => {
    mockSupabaseTables({ data: null, error: null }, { data: null, error: null });

    await expect(validateMemberId('inexistente')).rejects.toThrow(
      'O membro selecionado é inválido ou não foi encontrado.'
    );
  });

  it('lança erro de validação quando a consulta a family_members falha', async () => {
    mockSupabaseTables(
      { data: null, error: { message: 'connection refused' } },
      { data: null, error: null }
    );

    await expect(validateMemberId('member-789')).rejects.toThrow(
      'Erro ao validar membro. Tente novamente.'
    );
  });
});
