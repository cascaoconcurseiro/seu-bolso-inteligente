import { describe, it, expect } from 'vitest';
import { SafeFinancialCalculator } from '@/services/SafeFinancialCalculator';

/**
 * Testes para cálculos de finanças compartilhadas
 *
 * Exercita as funções reais de split do SafeFinancialCalculator
 * (distributeSplits / validateSplits), que retornam Decimal.
 *
 * **Validates: Requirements 1.5**
 */

describe('useSharedFinances - Shared Finances Calculations', () => {
  describe('Cálculo de Splits', () => {
    it('deve calcular splits corretamente quando dividindo entre múltiplos membros', () => {
      const total = 100;
      const splits = [{ percentage: 50 }, { percentage: 50 }];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);

      expect(result).toHaveLength(2);
      expect(result[0].amount.toNumber()).toBe(50);
      expect(result[1].amount.toNumber()).toBe(50);
      expect(result[0].amount.plus(result[1].amount).toNumber()).toBe(100);
    });

    it('deve validar que soma de splits não excede total + 1 centavo', () => {
      const total = 100;
      const splits = [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.33 }];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(true);
    });

    it('deve rejeitar splits que excedem total', () => {
      const total = 100;
      const splits = [{ amount: 60 }, { amount: 50 }];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(false);
    });

    it('deve distribuir splits com ajuste na última parcela para precisão', () => {
      const total = 100;
      const splits = [{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);
      const sum = result.reduce(
        (acc, r) => SafeFinancialCalculator.add(acc, r.amount),
        SafeFinancialCalculator.ZERO
      );

      expect(sum.toNumber()).toBe(100);
    });

    it('deve distribuir percentuais que não somam 100% sem ajustar a última parcela', () => {
      const total = 100;
      const splits = [{ percentage: 30 }, { percentage: 30 }];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);

      expect(result[0].amount.toNumber()).toBe(30);
      expect(result[1].amount.toNumber()).toBe(30);
    });
  });

  describe('Propriedades de Correção', () => {
    it('Invariante: Soma de splits <= total + 1 centavo', () => {
      const total = 100;
      const splits = [{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);
      const sum = result.reduce(
        (acc, r) => SafeFinancialCalculator.add(acc, r.amount),
        SafeFinancialCalculator.ZERO
      );

      expect(sum.toNumber()).toBeLessThanOrEqual(total + 0.01);
    });

    it('Idempotência: distribuir os mesmos splits produz o mesmo resultado', () => {
      const total = 150.5;
      const splits = [{ percentage: 40 }, { percentage: 35 }, { percentage: 25 }];

      const result1 = SafeFinancialCalculator.distributeSplits(total, splits);
      const result2 = SafeFinancialCalculator.distributeSplits(total, splits);

      expect(result1).toHaveLength(result2.length);
      result1.forEach((r, i) => {
        expect(r.amount.equals(result2[i].amount)).toBe(true);
      });
    });
  });

  describe('Validação de Splits', () => {
    it('deve aceitar splits que somam exatamente o total', () => {
      const total = 100;
      const splits = [{ amount: 50 }, { amount: 50 }];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(true);
    });

    it('deve aceitar splits com margem de 1 centavo', () => {
      const total = 100;
      const splits = [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.33 }];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(true);
    });

    it('deve rejeitar splits que excedem total + 1 centavo', () => {
      const total = 100;
      const splits = [{ amount: 50.01 }, { amount: 50.01 }];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(false);
    });
  });
});
