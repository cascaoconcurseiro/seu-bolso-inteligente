import { describe, it, expect } from 'vitest';
import { SafeFinancialCalculator } from '../SafeFinancialCalculator';

describe('SafeFinancialCalculator', () => {
  describe('add', () => {
    it('deve somar dois números com precisão e arredondar 2 casas', () => {
      // Exemplo crônico do Javascript: 0.1 + 0.2 = 0.30000000000000004
      expect(SafeFinancialCalculator.add(0.1, 0.2)).toBe(0.3);
      expect(SafeFinancialCalculator.add(10.55, 2.33)).toBe(12.88);
    });

    it('deve lidar com valores null ou undefined como zero', () => {
      expect(SafeFinancialCalculator.add(10, null as any)).toBe(10);
      expect(SafeFinancialCalculator.add(undefined as any, 5)).toBe(5);
    });
  });

  describe('subtract', () => {
    it('deve subtrair dois números com precisão', () => {
      // Exemplo crônico: 0.3 - 0.1 = 0.19999999999999998
      expect(SafeFinancialCalculator.subtract(0.3, 0.1)).toBe(0.2);
    });
  });

  describe('multiply', () => {
    it('deve multiplicar corretamente', () => {
      // 0.1 * 0.2 = 0.020000000000000004
      expect(SafeFinancialCalculator.multiply(0.1, 0.2)).toBe(0.02);
      expect(SafeFinancialCalculator.multiply(10, 0.5)).toBe(5);
    });
  });

  describe('divide', () => {
    it('deve dividir corretamente', () => {
      expect(SafeFinancialCalculator.divide(10, 3)).toBe(3.33);
      expect(SafeFinancialCalculator.divide(10, 2)).toBe(5);
    });

    it('deve lançar erro ao dividir por 0 para evitar Infinity', () => {
      expect(() => SafeFinancialCalculator.divide(10, 0)).toThrow('Division by zero');
    });
  });

  describe('percentage', () => {
    it('deve calcular a porcentagem corretamente', () => {
      expect(SafeFinancialCalculator.percentage(200, 15)).toBe(30); // 15% de 200 = 30
      expect(SafeFinancialCalculator.percentage(100, 50)).toBe(50);
    });
  });

  describe('safeSum', () => {
    it('deve somar um array de números ou strings formatadas', () => {
      expect(SafeFinancialCalculator.safeSum([0.1, 0.2, 0.3])).toBe(0.6);
      expect(SafeFinancialCalculator.safeSum(['10.5', 2.5])).toBe(13);
    });
  });
});
