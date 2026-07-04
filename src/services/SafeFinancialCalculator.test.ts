import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SafeFinancialCalculator } from './SafeFinancialCalculator';

/**
 * Property-Based Tests para SafeFinancialCalculator
 *
 * Usa fast-check para testar propriedades invariantes com entradas aleatórias.
 * Os métodos do calculador retornam Decimal — as asserções convertem via
 * .toNumber() ou comparam com .equals() para evitar comparação de identidade.
 *
 * **Validates: Requirements 1.5**
 */

describe('SafeFinancialCalculator - Property-Based Tests', () => {
  describe('Propriedade: Round-Trip (Inverso de Operações)', () => {
    it('add(a, b) - b === a (subtração é inverso de adição)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (a, b) => {
            const sum = SafeFinancialCalculator.add(a, b);
            const result = SafeFinancialCalculator.subtract(sum, b);
            expect(Math.abs(result.toNumber() - a)).toBeLessThan(0.01);
          }
        )
      );
    });

    it('multiply(a, b) / b === a (divisão é inverso de multiplicação)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 10000, noNaN: true }),
          fc.double({ min: 1, max: 100, noNaN: true }),
          (a, b) => {
            const product = SafeFinancialCalculator.multiply(a, b);
            const result = SafeFinancialCalculator.divide(product, b);
            expect(Math.abs(result.toNumber() - a)).toBeLessThan(0.02);
          }
        )
      );
    });
  });

  describe('Propriedade: Invariante de Soma de Splits', () => {
    it('safeSum(splits) <= total + 1 centavo', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 1000000 }).map((x) => x / 100), {
            minLength: 1,
            maxLength: 20,
          }),
          (amounts) => {
            const sum = SafeFinancialCalculator.safeSum(amounts);
            const total = amounts.reduce((a, b) => a + b, 0);
            expect(sum.toNumber()).toBeLessThanOrEqual(total + 0.01);
          }
        )
      );
    });
  });

  describe('Propriedade: Comutatividade de Adição', () => {
    it('add(a, b) === add(b, a)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (a, b) => {
            const result1 = SafeFinancialCalculator.add(a, b);
            const result2 = SafeFinancialCalculator.add(b, a);
            expect(result1.equals(result2)).toBe(true);
          }
        )
      );
    });
  });

  describe('Propriedade: Associatividade de Adição', () => {
    it('add(add(a, b), c) === add(a, add(b, c))', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (a, b, c) => {
            const result1 = SafeFinancialCalculator.add(
              SafeFinancialCalculator.add(a, b),
              c
            );
            const result2 = SafeFinancialCalculator.add(
              a,
              SafeFinancialCalculator.add(b, c)
            );
            expect(Math.abs(result1.minus(result2).toNumber())).toBeLessThan(0.01);
          }
        )
      );
    });
  });

  describe('Propriedade: Identidade Aditiva', () => {
    it('add(a, 0) === a', () => {
      fc.assert(
        fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), (a) => {
          const result = SafeFinancialCalculator.add(a, 0);
          expect(Math.abs(result.toNumber() - a)).toBeLessThan(0.01);
        })
      );
    });
  });

  describe('Propriedade: Precisão de Duas Casas Decimais', () => {
    it('Todos os resultados devem ter no máximo 2 casas decimais', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (a, b) => {
            const operations = [
              SafeFinancialCalculator.add(a, b),
              SafeFinancialCalculator.subtract(a, b),
              SafeFinancialCalculator.multiply(a, b),
            ];

            operations.forEach((result) => {
              expect(result.decimalPlaces()).toBeLessThanOrEqual(2);
            });
          }
        )
      );
    });
  });

  describe('Propriedade: Idempotência de Arredondamento', () => {
    it('round(round(a)) === round(a)', () => {
      fc.assert(
        fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), (a) => {
          const result1 = SafeFinancialCalculator.round(a);
          const result2 = SafeFinancialCalculator.round(result1);
          expect(result1.equals(result2)).toBe(true);
        })
      );
    });
  });

  describe('Unit Tests - Casos Específicos', () => {
    it('deve adicionar corretamente valores simples', () => {
      expect(SafeFinancialCalculator.add(10.5, 20.3).toNumber()).toBe(30.8);
      expect(SafeFinancialCalculator.add(0.1, 0.2).toNumber()).toBe(0.3);
    });

    it('deve subtrair corretamente valores simples', () => {
      expect(SafeFinancialCalculator.subtract(30.8, 20.3).toNumber()).toBe(10.5);
      expect(SafeFinancialCalculator.subtract(1, 0.3).toNumber()).toBe(0.7);
    });

    it('deve multiplicar corretamente valores simples', () => {
      expect(SafeFinancialCalculator.multiply(10, 2).toNumber()).toBe(20);
      expect(SafeFinancialCalculator.multiply(10.5, 2).toNumber()).toBe(21);
    });

    it('deve dividir corretamente valores simples', () => {
      expect(SafeFinancialCalculator.divide(20, 2).toNumber()).toBe(10);
      expect(SafeFinancialCalculator.divide(10.5, 2).toNumber()).toBe(5.25);
    });

    it('deve arredondar corretamente para 2 casas decimais', () => {
      expect(SafeFinancialCalculator.round(10.555).toNumber()).toBe(10.56);
      expect(SafeFinancialCalculator.round(10.544).toNumber()).toBe(10.54);
      expect(SafeFinancialCalculator.round(10.5).toNumber()).toBe(10.5);
    });

    it('deve somar array de valores corretamente', () => {
      expect(SafeFinancialCalculator.safeSum([10.5, 20.3, 15.2]).toNumber()).toBe(46);
      expect(SafeFinancialCalculator.safeSum([0.1, 0.2, 0.3]).toNumber()).toBe(0.6);
    });

    it('deve converter para safe number corretamente', () => {
      expect(SafeFinancialCalculator.toSafeNumber(10.5)).toBe(1050);
      expect(SafeFinancialCalculator.toSafeNumber('10.50')).toBe(1050);
      expect(SafeFinancialCalculator.toSafeNumber(0.01)).toBe(1);
    });

    it('deve converter de safe number corretamente', () => {
      expect(SafeFinancialCalculator.fromSafeNumber(1050).toNumber()).toBe(10.5);
      expect(SafeFinancialCalculator.fromSafeNumber(1).toNumber()).toBe(0.01);
      expect(SafeFinancialCalculator.fromSafeNumber(0).toNumber()).toBe(0);
    });

    it('deve lidar com valores negativos', () => {
      expect(SafeFinancialCalculator.add(-10, 5).toNumber()).toBe(-5);
      expect(SafeFinancialCalculator.subtract(-10, 5).toNumber()).toBe(-15);
      expect(SafeFinancialCalculator.multiply(-10, 2).toNumber()).toBe(-20);
    });

    it('deve lidar com zero', () => {
      expect(SafeFinancialCalculator.add(0, 0).toNumber()).toBe(0);
      expect(SafeFinancialCalculator.subtract(0, 0).toNumber()).toBe(0);
      expect(SafeFinancialCalculator.multiply(0, 100).toNumber()).toBe(0);
      expect(SafeFinancialCalculator.safeSum([]).toNumber()).toBe(0);
    });
  });
});
