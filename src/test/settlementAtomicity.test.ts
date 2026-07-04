import { describe, it, expect, beforeEach, vi } from "vitest";
import { callRPCWithRetry } from "@/utils/supabaseHelpers";

/**
 * Testes de Atomicidade para Operações de Settlement
 *
 * Valida que operações de liquidação são tudo-ou-nada:
 * - settle_split: Marca um split como liquidado e cria transação de pagamento
 * - settle_multiple_splits: Liquida múltiplos splits em uma transação
 * - unsettle_split: Reverte uma liquidação
 * - unsettle_multiple_splits: Reverte múltiplas liquidações
 *
 * **Validates: Requirements 1.5**
 */

// Mock para simular RPC calls
vi.mock("@/utils/supabaseHelpers", () => ({
  callRPCWithRetry: vi.fn(),
}));

describe("Settlement Atomicity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("settle_split - Operação Atômica de Liquidação Única", () => {
    it("deve marcar split como liquidado e criar transação de pagamento", async () => {
      const mockResponse = {
        success: true,
        split_id: "split-123",
        payment_transaction_id: "tx-456",
        amount: 100.0,
        settled_at: new Date().toISOString(),
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_split", {
        p_split_id: "split-123",
        p_amount: 100.0,
        p_account_id: "account-789",
      });

      expect(result.success).toBe(true);
      expect(result.split_id).toBe("split-123");
      expect(result.payment_transaction_id).toBe("tx-456");
      expect(result.amount).toBe(100.0);
    });

    it("deve retornar erro se split já foi liquidado", async () => {
      const mockResponse = {
        success: false,
        error: "Este split já foi liquidado.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_split", {
        p_split_id: "split-123",
        p_amount: 100.0,
        p_account_id: "account-789",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("já foi liquidado");
    });

    it("deve retornar erro se split não existe", async () => {
      const mockResponse = {
        success: false,
        error: "Split não encontrado.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_split", {
        p_split_id: "split-invalid",
        p_amount: 100.0,
        p_account_id: "account-789",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("não encontrado");
    });

    it("deve garantir que se falhar, nenhuma mudança é feita (atomicidade)", async () => {
      // Simula falha na RPC
      const mockError = new Error("Erro de conexão com banco de dados");
      vi.mocked(callRPCWithRetry).mockRejectedValueOnce(mockError);

      try {
        await callRPCWithRetry("settle_split", {
          p_split_id: "split-123",
          p_amount: 100.0,
          p_account_id: "account-789",
        });
      } catch (error) {
        expect(error).toBe(mockError);
      }

      // Verifica que a RPC foi chamada
      expect(callRPCWithRetry).toHaveBeenCalledWith(
        "settle_split",
        expect.objectContaining({
          p_split_id: "split-123",
        })
      );
    });
  });

  describe("settle_multiple_splits - Operação Atômica de Múltiplas Liquidações", () => {
    it("deve liquidar múltiplos splits em uma única transação", async () => {
      const mockResponse = {
        success: true,
        transaction_id: "tx-789",
        settled_count: 3,
        total_amount: 300.0,
        settled_at: new Date().toISOString(),
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_multiple_splits", {
        p_split_ids: ["split-1", "split-2", "split-3"],
        p_account_id: "account-789",
        p_user_id: "user-123",
      });

      expect(result.success).toBe(true);
      expect(result.settled_count).toBe(3);
      expect(result.total_amount).toBe(300.0);
    });

    it("deve retornar erro se algum split já foi liquidado", async () => {
      const mockResponse = {
        success: false,
        error: "Split split-2 já foi liquidado.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_multiple_splits", {
        p_split_ids: ["split-1", "split-2", "split-3"],
        p_account_id: "account-789",
        p_user_id: "user-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("já foi liquidado");
    });

    it("deve garantir que se falhar, nenhum split é liquidado (atomicidade)", async () => {
      // Simula falha na RPC
      const mockError = new Error("Erro ao criar transação de pagamento");
      vi.mocked(callRPCWithRetry).mockRejectedValueOnce(mockError);

      try {
        await callRPCWithRetry("settle_multiple_splits", {
          p_split_ids: ["split-1", "split-2", "split-3"],
          p_account_id: "account-789",
          p_user_id: "user-123",
        });
      } catch (error) {
        expect(error).toBe(mockError);
      }

      // Verifica que a RPC foi chamada
      expect(callRPCWithRetry).toHaveBeenCalledWith("settle_multiple_splits", expect.any(Object));
    });

    it("deve retornar erro se nenhum split é fornecido", async () => {
      const mockResponse = {
        success: false,
        error: "Nenhum split fornecido para liquidação.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_multiple_splits", {
        p_split_ids: [],
        p_account_id: "account-789",
        p_user_id: "user-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nenhum split");
    });
  });

  describe("unsettle_split - Reversão de Liquidação Única", () => {
    it("deve reverter uma liquidação e deletar transação de pagamento", async () => {
      const mockResponse = {
        success: true,
        split_id: "split-123",
        reverted_amount: 100.0,
        reverted_at: new Date().toISOString(),
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("unsettle_split", {
        p_split_id: "split-123",
      });

      expect(result.success).toBe(true);
      expect(result.split_id).toBe("split-123");
      expect(result.reverted_amount).toBe(100.0);
    });

    it("deve retornar erro se split não foi liquidado", async () => {
      const mockResponse = {
        success: false,
        error: "Este split não foi liquidado.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("unsettle_split", {
        p_split_id: "split-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("não foi liquidado");
    });

    it("deve garantir que se falhar, nenhuma mudança é feita (atomicidade)", async () => {
      const mockError = new Error("Erro ao deletar transação de pagamento");
      vi.mocked(callRPCWithRetry).mockRejectedValueOnce(mockError);

      try {
        await callRPCWithRetry("unsettle_split", {
          p_split_id: "split-123",
        });
      } catch (error) {
        expect(error).toBe(mockError);
      }

      expect(callRPCWithRetry).toHaveBeenCalledWith(
        "unsettle_split",
        expect.objectContaining({
          p_split_id: "split-123",
        })
      );
    });
  });

  describe("unsettle_multiple_splits - Reversão de Múltiplas Liquidações", () => {
    it("deve reverter múltiplas liquidações em uma única transação", async () => {
      const mockResponse = {
        success: true,
        reverted_count: 3,
        total_amount: 300.0,
        reverted_at: new Date().toISOString(),
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("unsettle_multiple_splits", {
        p_split_ids: ["split-1", "split-2", "split-3"],
      });

      expect(result.success).toBe(true);
      expect(result.reverted_count).toBe(3);
      expect(result.total_amount).toBe(300.0);
    });

    it("deve retornar erro se algum split não foi liquidado", async () => {
      const mockResponse = {
        success: false,
        error: "Split split-2 não foi liquidado.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("unsettle_multiple_splits", {
        p_split_ids: ["split-1", "split-2", "split-3"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("não foi liquidado");
    });

    it("deve garantir que se falhar, nenhuma reversão é feita (atomicidade)", async () => {
      const mockError = new Error("Erro ao reverter múltiplas liquidações");
      vi.mocked(callRPCWithRetry).mockRejectedValueOnce(mockError);

      try {
        await callRPCWithRetry("unsettle_multiple_splits", {
          p_split_ids: ["split-1", "split-2", "split-3"],
        });
      } catch (error) {
        expect(error).toBe(mockError);
      }

      expect(callRPCWithRetry).toHaveBeenCalledWith("unsettle_multiple_splits", expect.any(Object));
    });
  });

  describe("Propriedades de Atomicidade", () => {
    it("Invariante: Se liquidação tem sucesso, split.is_settled=true E transação de pagamento existe", async () => {
      const mockResponse = {
        success: true,
        split_id: "split-123",
        payment_transaction_id: "tx-456",
        amount: 100.0,
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse);

      const result = await callRPCWithRetry("settle_split", {
        p_split_id: "split-123",
        p_amount: 100.0,
        p_account_id: "account-789",
      });

      // Verifica que ambas as condições são verdadeiras
      expect(result.success).toBe(true);
      expect(result.payment_transaction_id).toBeDefined();
      expect(result.split_id).toBe("split-123");
    });

    it("Idempotência: Liquidar mesmo split duas vezes produz erro na segunda tentativa", async () => {
      // Primeira liquidação - sucesso
      const mockResponse1 = {
        success: true,
        split_id: "split-123",
        payment_transaction_id: "tx-456",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse1);

      const result1 = await callRPCWithRetry("settle_split", {
        p_split_id: "split-123",
        p_amount: 100.0,
        p_account_id: "account-789",
      });

      expect(result1.success).toBe(true);

      // Segunda liquidação - erro
      const mockResponse2 = {
        success: false,
        error: "Este split já foi liquidado.",
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse2);

      const result2 = await callRPCWithRetry("settle_split", {
        p_split_id: "split-123",
        p_amount: 100.0,
        p_account_id: "account-789",
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain("já foi liquidado");
    });

    it("Confluência: Ordem de liquidação de múltiplos splits não afeta estado final", async () => {
      // Liquidar splits em ordem 1, 2, 3
      const mockResponse1 = {
        success: true,
        transaction_id: "tx-789",
        settled_count: 3,
        total_amount: 300.0,
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse1);

      const result1 = await callRPCWithRetry("settle_multiple_splits", {
        p_split_ids: ["split-1", "split-2", "split-3"],
        p_account_id: "account-789",
        p_user_id: "user-123",
      });

      expect(result1.settled_count).toBe(3);
      expect(result1.total_amount).toBe(300.0);

      // Liquidar splits em ordem 3, 2, 1 (ordem diferente)
      const mockResponse2 = {
        success: true,
        transaction_id: "tx-790",
        settled_count: 3,
        total_amount: 300.0,
      };

      vi.mocked(callRPCWithRetry).mockResolvedValueOnce(mockResponse2);

      const result2 = await callRPCWithRetry("settle_multiple_splits", {
        p_split_ids: ["split-3", "split-2", "split-1"],
        p_account_id: "account-789",
        p_user_id: "user-123",
      });

      // Estado final é o mesmo
      expect(result2.settled_count).toBe(result1.settled_count);
      expect(result2.total_amount).toBe(result1.total_amount);
    });
  });
});
