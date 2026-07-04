/**
 * Testes para validação de Member ID
 * TASK 2.3: Validar Member_ID Antes de Criar Splits
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock do supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock do logger
vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Função de validação (copiada do hook para teste)
async function validateMemberId(memberId: string | null | undefined): Promise<boolean> {
  if (!memberId) {
    return true;
  }

  try {
    const { data: memberExists, error: memberCheckError } = await supabase
      .from("family_members")
      .select("id")
      .eq("id", memberId)
      .maybeSingle();

    if (memberCheckError) {
      throw new Error("Erro ao validar membro. Tente novamente.");
    }

    if (!memberExists) {
      throw new Error("O membro selecionado é inválido ou não foi encontrado.");
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("O membro selecionado")) {
      throw error;
    }
    throw new Error("O membro selecionado é inválido ou não foi encontrado.");
  }
}

describe("validateMemberId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar true para member_id válido", async () => {
    const mockMember = { id: "member-123" };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockMember,
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await validateMemberId("member-123");
    expect(result).toBe(true);
  });

  it("deve lançar erro para member_id inválido", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any);

    await expect(validateMemberId("invalid-id")).rejects.toThrow(
      "O membro selecionado é inválido ou não foi encontrado."
    );
  });

  it("deve retornar true para member_id null", async () => {
    const result = await validateMemberId(null);
    expect(result).toBe(true);
  });

  it("deve retornar true para member_id undefined", async () => {
    const result = await validateMemberId(undefined);
    expect(result).toBe(true);
  });

  it("deve lançar erro se houver erro na query", async () => {
    const queryError = new Error("Database error");

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: queryError,
          }),
        }),
      }),
    } as any);

    await expect(validateMemberId("member-123")).rejects.toThrow(
      "O membro selecionado é inválido ou não foi encontrado."
    );
  });

  it("deve validar múltiplos member_ids", async () => {
    const memberIds = ["member-1", "member-2", "member-3"];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "member-id" },
            error: null,
          }),
        }),
      }),
    } as any);

    for (const memberId of memberIds) {
      const result = await validateMemberId(memberId);
      expect(result).toBe(true);
    }
  });
});
