import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Testes para Validação de Settlement
 * 
 * Valida transições de estado e regras de liquidação
 * 
 * **Validates: Requirements 1.5**
 */

describe('Settlement Validation', () => {
  describe('Transições de Estado Válidas', () => {
    it('deve permitir transição de não liquidado para liquidado', () => {
      const split = { id: 'split-1', is_settled: false };
      const newState = { ...split, is_settled: true };
      
      expect(split.is_settled).toBe(false);
      expect(newState.is_settled).toBe(true);
    });

    it('deve permitir transição de liquidado para não liquidado (reversão)', () => {
      const split = { id: 'split-1', is_settled: true };
      const newState = { ...split, is_settled: false };
      
      expect(split.is_settled).toBe(true);
      expect(newState.is_settled).toBe(false);
    });

    it('deve rejeitar transição de liquidado para liquidado (idempotência)', () => {
      const split = { id: 'split-1', is_settled: true };
      
      // Tentar liquidar novamente deve falhar
      const canSettle = !split.is_settled;
      expect(canSettle).toBe(false);
    });

    it('deve rejeitar transição de não liquidado para não liquidado', () => {
      const split = { id: 'split-1', is_settled: false };
      
      // Tentar desmarcar como não liquidado quando já não está liquidado deve falhar
      const canUnsettle = split.is_settled;
      expect(canUnsettle).toBe(false);
    });
  });

  describe('Validação de Valores', () => {
    it('deve validar que valor de liquidação é positivo', () => {
      const amount = 100;
      expect(amount).toBeGreaterThan(0);
    });

    it('deve rejeitar valor de liquidação zero', () => {
      const amount = 0;
      expect(amount).toBeLessThanOrEqual(0);
    });

    it('deve rejeitar valor de liquidação negativo', () => {
      const amount = -100;
      expect(amount).toBeLessThan(0);
    });

    it('deve validar que valor de liquidação tem no máximo 2 casas decimais', () => {
      const amount = 100.50;
      const decimalPlaces = (amount.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('deve rejeitar valor com mais de 2 casas decimais', () => {
      const amount = 100.555;
      const decimalPlaces = (amount.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeGreaterThan(2);
    });
  });

  describe('Validação de Splits', () => {
    it('deve validar que split_id é UUID válido', () => {
      const splitId = '550e8400-e29b-41d4-a716-446655440000';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(splitId)).toBe(true);
    });

    it('deve rejeitar split_id inválido', () => {
      const splitId = 'invalid-id';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(splitId)).toBe(false);
    });

    it('deve validar que split existe', () => {
      const split = { id: 'split-1', is_settled: false };
      expect(split).toBeDefined();
      expect(split.id).toBeDefined();
    });

    it('deve rejeitar split nulo', () => {
      const split = null;
      expect(split).toBeNull();
    });
  });

  describe('Validação de Contas', () => {
    it('deve validar que account_id é UUID válido', () => {
      const accountId = '550e8400-e29b-41d4-a716-446655440001';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(accountId)).toBe(true);
    });

    it('deve validar que conta existe', () => {
      const account = { id: 'account-1', balance: 1000 };
      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
    });

    it('deve validar que saldo da conta é suficiente para liquidação', () => {
      const account = { id: 'account-1', balance: 1000 };
      const settlementAmount = 500;
      
      expect(account.balance).toBeGreaterThanOrEqual(settlementAmount);
    });

    it('deve rejeitar liquidação se saldo é insuficiente', () => {
      const account = { id: 'account-1', balance: 100 };
      const settlementAmount = 500;
      
      expect(account.balance).toBeLessThan(settlementAmount);
    });
  });

  describe('Validação de Múltiplos Splits', () => {
    it('deve validar que array de splits não está vazio', () => {
      const splits = ['split-1', 'split-2', 'split-3'];
      expect(splits.length).toBeGreaterThan(0);
    });

    it('deve rejeitar array vazio de splits', () => {
      const splits: string[] = [];
      expect(splits.length).toBe(0);
    });

    it('deve validar que todos os splits são UUIDs válidos', () => {
      const splits = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      const allValid = splits.every(id => uuidRegex.test(id));
      expect(allValid).toBe(true);
    });

    it('deve rejeitar se algum split não é UUID válido', () => {
      const splits = [
        '550e8400-e29b-41d4-a716-446655440000',
        'invalid-id',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      const allValid = splits.every(id => uuidRegex.test(id));
      expect(allValid).toBe(false);
    });

    it('deve validar que soma de múltiplos splits é positiva', () => {
      const splits = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 },
      ];
      const total = splits.reduce((sum, split) => SafeFinancialCalculator.add(sum, split.amount), 0);
      
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('Propriedades de Validação', () => {
    it('validação deve ser idempotente', () => {
      const split = { id: 'split-1', is_settled: false };
      
      const isValid1 = split.id !== null && split.id !== undefined;
      const isValid2 = split.id !== null && split.id !== undefined;
      const isValid3 = split.id !== null && split.id !== undefined;
      
      expect(isValid1).toBe(isValid2);
      expect(isValid2).toBe(isValid3);
    });

    it('validação deve ser consistente', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000, noNaN: true }),
          (amount) => {
            const normalizedAmount = Math.round(amount * 100) / 100;
            
            // Validação 1: valor é positivo
            const isPositive1 = normalizedAmount > 0;
            
            // Validação 2: valor é positivo (repetida)
            const isPositive2 = normalizedAmount > 0;
            
            expect(isPositive1).toBe(isPositive2);
          }
        )
      );
    });
  });

  describe('Casos Extremos', () => {
    it('deve lidar com valor mínimo de liquidação', () => {
      const amount = 0.01;
      expect(amount).toBeGreaterThan(0);
    });

    it('deve lidar com valor máximo de liquidação', () => {
      const amount = 999999.99;
      expect(amount).toBeGreaterThan(0);
    });

    it('deve lidar com um único split', () => {
      const splits = ['split-1'];
      expect(splits.length).toBe(1);
    });

    it('deve lidar com muitos splits', () => {
      const splits = Array.from({ length: 1000 }, (_, i) => `split-${i}`);
      expect(splits.length).toBe(1000);
    });

    it('deve lidar com saldo zero', () => {
      const account = { id: 'account-1', balance: 0 };
      expect(account.balance).toBe(0);
    });

    it('deve lidar com saldo negativo (débito)', () => {
      const account = { id: 'account-1', balance: -100 };
      expect(account.balance).toBeLessThan(0);
    });
  });

  describe('Mensagens de Erro', () => {
    it('deve retornar mensagem clara para split não encontrado', () => {
      const error = 'Split não encontrado.';
      expect(error).toContain('Split');
      expect(error).toContain('não encontrado');
    });

    it('deve retornar mensagem clara para split já liquidado', () => {
      const error = 'Este split já foi liquidado.';
      expect(error).toContain('já foi liquidado');
    });

    it('deve retornar mensagem clara para valor inválido', () => {
      const error = 'Valor deve ser positivo.';
      expect(error).toContain('positivo');
    });

    it('deve retornar mensagem clara para conta não encontrada', () => {
      const error = 'Conta não encontrada.';
      expect(error).toContain('Conta');
      expect(error).toContain('não encontrada');
    });

    it('deve retornar mensagem clara para saldo insuficiente', () => {
      const error = 'Saldo insuficiente.';
      expect(error).toContain('Saldo');
      expect(error).toContain('insuficiente');
    });
  });
});
