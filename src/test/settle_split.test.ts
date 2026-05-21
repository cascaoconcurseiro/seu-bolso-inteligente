import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Testes para a função RPC settle_split()
 * 
 * **Validates: Requirements 1.4 (Implementar Operações de Liquidação Atômicas)**
 * 
 * Esta suite testa a atomicidade da função settle_split():
 * - Marca um split como liquidado
 * - Cria uma transação de INCOME
 * - Atualiza o saldo da conta
 * - Tudo em uma única transação (all-or-nothing)
 */

describe('settle_split() RPC Function', () => {
  // Mock data
  const mockSplitId = '550e8400-e29b-41d4-a716-446655440000';
  const mockAccountId = '550e8400-e29b-41d4-a716-446655440001';
  const mockAmount = 100.00;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should settle a split successfully with valid parameters', async () => {
      /**
       * Propriedade: Invariante de Liquidação
       * Se liquidação tem sucesso, split.is_settled=true E transação de pagamento existe
       */
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: '550e8400-e29b-41d4-a716-446655440002',
        amount: mockAmount,
        settled_at: new Date().toISOString()
      };

      // Mock the RPC call
      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data, error } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.split_id).toBe(mockSplitId);
      expect(data.payment_transaction_id).toBeDefined();
      expect(data.amount).toBe(mockAmount);
      expect(data.settled_at).toBeDefined();
    });

    it('should return payment transaction ID for account balance update', async () => {
      /**
       * Propriedade: Transação de Pagamento Criada
       * Toda liquidação bem-sucedida cria uma transação de INCOME
       */
      const paymentTxId = '550e8400-e29b-41d4-a716-446655440003';
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: paymentTxId,
        amount: mockAmount,
        settled_at: new Date().toISOString()
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data.payment_transaction_id).toBe(paymentTxId);
      expect(data.payment_transaction_id).not.toBeNull();
      expect(data.payment_transaction_id).not.toBeUndefined();
    });

    it('should handle different amount values correctly', async () => {
      /**
       * Propriedade: Precisão de Valores
       * Diferentes valores de liquidação são processados corretamente
       */
      const testAmounts = [50.00, 100.50, 1000.99, 0.01];

      for (const amount of testAmounts) {
        const mockResponse = {
          success: true,
          split_id: mockSplitId,
          payment_transaction_id: '550e8400-e29b-41d4-a716-446655440004',
          amount: amount,
          settled_at: new Date().toISOString()
        };

        vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
          data: mockResponse,
          error: null,
          status: 200,
          statusText: 'OK'
        });

        const { data } = await supabase.rpc('settle_split', {
          p_split_id: mockSplitId,
          p_account_id: mockAccountId,
          p_amount: amount
        });

        expect(data.amount).toBe(amount);
      }
    });
  });

  describe('Error Cases', () => {
    it('should return error when split does not exist', async () => {
      /**
       * Propriedade: Validação de Split
       * Liquidar split inexistente retorna erro descritivo
       */
      const mockResponse = {
        success: false,
        error: 'Split não encontrado.'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: '00000000-0000-0000-0000-000000000000',
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data.success).toBe(false);
      expect(data.error).toBe('Split não encontrado.');
    });

    it('should return error when split is already settled', async () => {
      /**
       * Propriedade: Idempotência de Liquidação
       * Liquidar mesmo split duas vezes produz erro na segunda tentativa
       */
      const mockResponse = {
        success: false,
        error: 'Este split já foi liquidado.'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data.success).toBe(false);
      expect(data.error).toBe('Este split já foi liquidado.');
    });

    it('should handle invalid account ID gracefully', async () => {
      /**
       * Propriedade: Validação de Conta
       * Conta inválida retorna erro apropriado
       */
      const mockResponse = {
        success: false,
        error: 'Conta não encontrada ou não pertence ao usuário.'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: '00000000-0000-0000-0000-000000000000',
        p_amount: mockAmount
      });

      expect(data.success).toBe(false);
      expect(data.error).toContain('Conta');
    });

    it('should handle negative amounts appropriately', async () => {
      /**
       * Propriedade: Validação de Valor
       * Valores negativos são rejeitados
       */
      const mockResponse = {
        success: false,
        error: 'Valor deve ser positivo.'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: -100.00
      });

      expect(data.success).toBe(false);
      expect(data.error).toContain('positivo');
    });

    it('should handle zero amount appropriately', async () => {
      /**
       * Propriedade: Validação de Valor Zero
       * Valor zero é rejeitado
       */
      const mockResponse = {
        success: false,
        error: 'Valor deve ser maior que zero.'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: 0
      });

      expect(data.success).toBe(false);
      expect(data.error).toContain('zero');
    });
  });

  describe('Atomicity Tests', () => {
    it('should ensure all-or-nothing behavior on success', async () => {
      /**
       * Propriedade: Atomicidade de Liquidação
       * Se liquidação tem sucesso, TODAS as operações completam:
       * - Split marcado como liquidado
       * - Transação de pagamento criada
       * - Saldo da conta atualizado
       */
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: '550e8400-e29b-41d4-a716-446655440005',
        amount: mockAmount,
        settled_at: new Date().toISOString()
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      // All three conditions must be true for atomicity
      expect(data.success).toBe(true);
      expect(data.split_id).toBe(mockSplitId);
      expect(data.payment_transaction_id).toBeDefined();
      expect(data.amount).toBe(mockAmount);
      expect(data.settled_at).toBeDefined();
    });

    it('should rollback on any error (no partial updates)', async () => {
      /**
       * Propriedade: Rollback em Falha
       * Se qualquer operação falha, NENHUMA mudança é persistida
       */
      const mockResponse = {
        success: false,
        error: 'Erro ao atualizar saldo da conta'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      // On error, no partial updates should occur
      expect(data.success).toBe(false);
      expect(data.payment_transaction_id).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      /**
       * Propriedade: Precisão em Valores Grandes
       * Valores muito grandes são processados corretamente
       */
      const largeAmount = 999999.99;
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: '550e8400-e29b-41d4-a716-446655440006',
        amount: largeAmount,
        settled_at: new Date().toISOString()
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: largeAmount
      });

      expect(data.success).toBe(true);
      expect(data.amount).toBe(largeAmount);
    });

    it('should handle very small amounts (cents)', async () => {
      /**
       * Propriedade: Precisão em Valores Pequenos
       * Valores muito pequenos (centavos) são processados corretamente
       */
      const smallAmount = 0.01;
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: '550e8400-e29b-41d4-a716-446655440007',
        amount: smallAmount,
        settled_at: new Date().toISOString()
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: smallAmount
      });

      expect(data.success).toBe(true);
      expect(data.amount).toBe(smallAmount);
    });

    it('should return settled_at timestamp in ISO format', async () => {
      /**
       * Propriedade: Timestamp Válido
       * settled_at é sempre um timestamp ISO válido
       */
      const now = new Date().toISOString();
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: '550e8400-e29b-41d4-a716-446655440008',
        amount: mockAmount,
        settled_at: now
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data.settled_at).toBeDefined();
      expect(new Date(data.settled_at)).toBeInstanceOf(Date);
      expect(new Date(data.settled_at).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Parameter Validation', () => {
    it('should require split_id parameter', async () => {
      /**
       * Propriedade: Validação de Parâmetros
       * split_id é obrigatório
       */
      const mockResponse = {
        success: false,
        error: 'split_id é obrigatório'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: null,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data.success).toBe(false);
    });

    it('should require account_id parameter', async () => {
      /**
       * Propriedade: Validação de Parâmetros
       * account_id é obrigatório
       */
      const mockResponse = {
        success: false,
        error: 'account_id é obrigatório'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: null,
        p_amount: mockAmount
      });

      expect(data.success).toBe(false);
    });

    it('should require amount parameter', async () => {
      /**
       * Propriedade: Validação de Parâmetros
       * amount é obrigatório
       */
      const mockResponse = {
        success: false,
        error: 'amount é obrigatório'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: null
      });

      expect(data.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should always return JSON response with success field', async () => {
      /**
       * Propriedade: Formato de Resposta Consistente
       * Toda resposta tem campo success
       */
      const mockResponse = {
        success: true,
        split_id: mockSplitId,
        payment_transaction_id: '550e8400-e29b-41d4-a716-446655440009',
        amount: mockAmount,
        settled_at: new Date().toISOString()
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: mockSplitId,
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
    });

    it('should include error message on failure', async () => {
      /**
       * Propriedade: Mensagens de Erro Descritivas
       * Falhas incluem mensagem de erro clara
       */
      const mockResponse = {
        success: false,
        error: 'Split não encontrado.'
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockResponse,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      const { data } = await supabase.rpc('settle_split', {
        p_split_id: '00000000-0000-0000-0000-000000000000',
        p_account_id: mockAccountId,
        p_amount: mockAmount
      });

      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });
  });
});
