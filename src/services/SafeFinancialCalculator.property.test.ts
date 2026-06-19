import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SafeFinancialCalculator } from './SafeFinancialCalculator';

/**
 * Property-Based Tests para SafeFinancialCalculator
 * 
 * Usa fast-check para testar propriedades invariantes com entradas aleatórias
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
            expect(Math.abs(result - a)).toBeLessThan(0.01);
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
            expect(Math.abs(result - a)).toBeLessThan(0.01);
          }
        )
      );
    });
  });

  describe('Propriedade: Invariante de Soma de Splits', () => {
    it('safeSum(splits) <= total + 1 centavo', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 10000 }).map(x => x / 100), {
            minLength: 1,
            maxLength: 20,
          }),
          (amounts) => {
            const sum = SafeFinancialCalculator.safeSum(amounts);
            const total = amounts.reduce((a, b) => a + b, 0);
            expect(sum).toBeLessThanOrEqual(total + 0.01);
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
            expect(result1).toBe(result2);
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
            expect(Math.abs(result1 - result2)).toBeLessThan(0.01);
          }
        )
      );
    });
  });

  describe('Propriedade: Identidade Aditiva', () => {
    it('add(a, 0) === a', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (a) => {
            const result = SafeFinancialCalculator.add(a, 0);
            expect(Math.abs(result - a)).toBeLessThan(0.01);
          }
        )
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

            operations.forEach(result => {
              const decimalPlaces = (result.toString().split('.')[1] || '').length;
              expect(decimalPlaces).toBeLessThanOrEqual(2);
            });
          }
        )
      );
    });
  });

  describe('Propriedade: Idempotência de Arredondamento', () => {
    it('round(round(a)) === round(a)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (a) => {
            const result1 = SafeFinancialCalculator.round(a);
            const result2 = SafeFinancialCalculator.round(result1);
            expect(result1).toBe(result2);
          }
        )
      );
    });
  });
});
