/**
 * Testes para Schemas de Validação com Zod
 * TASK 2.4: Implementar Validação com Zod
 */

import { describe, it, expect } from 'vitest';
import {
  TransactionSchema,
  SplitSchema,
  SplitsSchema,
  AccountSchema,
  SettlementSchema,
  InstallmentSchema,
  validateData,
  validateDataOrThrow,
} from '../validation';

describe('Validation Schemas', () => {
  describe('TransactionSchema', () => {
    it('deve validar transação válida', () => {
      const validTransaction = {
        amount: 100.50,
        description: 'Compra no supermercado',
        date: '2024-01-15',
        type: 'EXPENSE',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        currency: 'BRL',
      };

      const result = TransactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar transação com valor zero', () => {
      const invalidTransaction = {
        amount: 0,
        description: 'Compra',
        date: '2024-01-15',
        type: 'EXPENSE',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar transação com descrição vazia', () => {
      const invalidTransaction = {
        amount: 100,
        description: '   ',
        date: '2024-01-15',
        type: 'EXPENSE',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar transação com data inválida', () => {
      const invalidTransaction = {
        amount: 100,
        description: 'Compra',
        date: '15-01-2024',
        type: 'EXPENSE',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar transação com tipo inválido', () => {
      const invalidTransaction = {
        amount: 100,
        description: 'Compra',
        date: '2024-01-15',
        type: 'INVALID',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('SplitSchema', () => {
    it('deve validar split válido', () => {
      const validSplit = {
        member_id: '550e8400-e29b-41d4-a716-446655440000',
        percentage: 50,
      };

      const result = SplitSchema.safeParse(validSplit);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar split com percentual > 100', () => {
      const invalidSplit = {
        member_id: '550e8400-e29b-41d4-a716-446655440000',
        percentage: 150,
      };

      const result = SplitSchema.safeParse(invalidSplit);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar split com percentual zero', () => {
      const invalidSplit = {
        member_id: '550e8400-e29b-41d4-a716-446655440000',
        percentage: 0,
      };

      const result = SplitSchema.safeParse(invalidSplit);
      expect(result.success).toBe(false);
    });
  });

  describe('SplitsSchema', () => {
    it('deve validar múltiplos splits com soma <= 100%', () => {
      const validSplits = [
        { member_id: '550e8400-e29b-41d4-a716-446655440000', percentage: 50 },
        { member_id: '550e8400-e29b-41d4-a716-446655440001', percentage: 50 },
      ];

      const result = SplitsSchema.safeParse(validSplits);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar splits com soma > 100%', () => {
      const invalidSplits = [
        { member_id: '550e8400-e29b-41d4-a716-446655440000', percentage: 60 },
        { member_id: '550e8400-e29b-41d4-a716-446655440001', percentage: 50 },
      ];

      const result = SplitsSchema.safeParse(invalidSplits);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar array vazio', () => {
      const invalidSplits: any[] = [];

      const result = SplitsSchema.safeParse(invalidSplits);
      expect(result.success).toBe(false);
    });
  });

  describe('AccountSchema', () => {
    it('deve validar conta válida', () => {
      const validAccount = {
        name: 'Conta Corrente',
        type: 'CHECKING',
        balance: 1000,
        currency: 'BRL',
      };

      const result = AccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar conta com nome vazio', () => {
      const invalidAccount = {
        name: '   ',
        type: 'CHECKING',
      };

      const result = AccountSchema.safeParse(invalidAccount);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar conta com tipo inválido', () => {
      const invalidAccount = {
        name: 'Conta',
        type: 'INVALID_TYPE',
      };

      const result = AccountSchema.safeParse(invalidAccount);
      expect(result.success).toBe(false);
    });

    it('deve validar conta de cartão de crédito com closing_day e due_day', () => {
      const validCreditCard = {
        name: 'Cartão Crédito',
        type: 'CREDIT_CARD',
        closing_day: 10,
        due_day: 20,
        credit_limit: 5000,
      };

      const result = AccountSchema.safeParse(validCreditCard);
      expect(result.success).toBe(true);
    });
  });

  describe('SettlementSchema', () => {
    it('deve validar settlement válido', () => {
      const validSettlement = {
        member_id: '550e8400-e29b-41d4-a716-446655440000',
        account_id: '550e8400-e29b-41d4-a716-446655440001',
        amount: 100.50,
        date: '2024-01-15',
        type: 'PAY',
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar settlement com valor zero', () => {
      const invalidSettlement = {
        member_id: '550e8400-e29b-41d4-a716-446655440000',
        account_id: '550e8400-e29b-41d4-a716-446655440001',
        amount: 0,
        date: '2024-01-15',
        type: 'PAY',
      };

      const result = SettlementSchema.safeParse(invalidSettlement);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar settlement com tipo inválido', () => {
      const invalidSettlement = {
        member_id: '550e8400-e29b-41d4-a716-446655440000',
        account_id: '550e8400-e29b-41d4-a716-446655440001',
        amount: 100,
        date: '2024-01-15',
        type: 'INVALID',
      };

      const result = SettlementSchema.safeParse(invalidSettlement);
      expect(result.success).toBe(false);
    });
  });

  describe('InstallmentSchema', () => {
    it('deve validar parcelamento válido', () => {
      const validInstallment = {
        total_installments: 12,
        start_date: '2024-01-15',
        frequency: 'MONTHLY',
      };

      const result = InstallmentSchema.safeParse(validInstallment);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar parcelamento com 1 parcela', () => {
      const invalidInstallment = {
        total_installments: 1,
        start_date: '2024-01-15',
        frequency: 'MONTHLY',
      };

      const result = InstallmentSchema.safeParse(invalidInstallment);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar parcelamento com > 360 parcelas', () => {
      const invalidInstallment = {
        total_installments: 361,
        start_date: '2024-01-15',
        frequency: 'MONTHLY',
      };

      const result = InstallmentSchema.safeParse(invalidInstallment);
      expect(result.success).toBe(false);
    });
  });

  describe('validateData helper', () => {
    it('deve retornar sucesso com dados válidos', () => {
      const validTransaction = {
        amount: 100,
        description: 'Compra',
        date: '2024-01-15',
        type: 'EXPENSE',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = validateData(TransactionSchema, validTransaction);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('deve retornar erros com dados inválidos', () => {
      const invalidTransaction = {
        amount: 0,
        description: '',
        date: 'invalid',
        type: 'INVALID',
        account_id: 'invalid-uuid',
      };

      const result = validateData(TransactionSchema, invalidTransaction);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Object.keys(result.errors!).length).toBeGreaterThan(0);
    });
  });

  describe('validateDataOrThrow helper', () => {
    it('deve retornar dados válidos', () => {
      const validTransaction = {
        amount: 100,
        description: 'Compra',
        date: '2024-01-15',
        type: 'EXPENSE',
        account_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = validateDataOrThrow(TransactionSchema, validTransaction);
      expect(result).toBeDefined();
      expect(result.amount).toBe(100);
    });

    it('deve lançar erro com dados inválidos', () => {
      const invalidTransaction = {
        amount: 0,
        description: '',
      };

      expect(() => validateDataOrThrow(TransactionSchema, invalidTransaction)).toThrow();
    });
  });
});
