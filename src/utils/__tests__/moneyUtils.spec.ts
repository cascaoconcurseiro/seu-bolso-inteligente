import { describe, it, expect } from 'vitest';
import { moneyUtils } from '../money';

describe('moneyUtils', () => {
  describe('format', () => {
    it('deve formatar números para a moeda correta (BRL padrão)', () => {
      // Como o Intl.NumberFormat pode adicionar espaços não separáveis (\u00A0), limpamos antes de comparar
      const formatted = moneyUtils.format(1500.5).replace(/\s/g, ' ');
      // Pode ser "R$ 1.500,50" dependendo do Node/Intl
      expect(formatted).toContain('1.500,50');
      expect(formatted).toContain('R$');
    });

    it('deve formatar dólares corretamente', () => {
      const formatted = moneyUtils.format(1500.5, 'USD').replace(/\s/g, ' ');
      // Dependendo do ambiente, pt-BR formata USD como "US$ 1.500,50"
      expect(formatted).toContain('1.500,50');
      expect(formatted).toContain('US$');
    });
  });

  describe('parse', () => {
    it('deve extrair números de uma string formatada em Real (BRL)', () => {
      expect(moneyUtils.parse('R$ 1.500,50')).toBe(1500.50);
      expect(moneyUtils.parse('1.234.567,89')).toBe(1234567.89);
      expect(moneyUtils.parse('0,50')).toBe(0.5);
    });

    it('deve lidar com valores inválidos retornando 0', () => {
      expect(moneyUtils.parse('abc')).toBe(0);
      expect(moneyUtils.parse('')).toBe(0);
      expect(moneyUtils.parse(null as any)).toBe(0);
    });
  });

  describe('splitSafely', () => {
    it('deve dividir 100 reais em 3 partes e a soma dar exatamente 100', () => {
      const total = 100;
      const parts = moneyUtils.splitSafely(total, 3);
      
      expect(parts.length).toBe(3);
      // O utilitário coloca a diferença de arredondamento na última parcela
      expect(parts[0]).toBe(33.33);
      expect(parts[1]).toBe(33.33);
      expect(parts[2]).toBe(33.34);
      
      const sum = parts.reduce((acc, val) => acc + val, 0);
      expect(sum).toBe(100.00); // Nenhum centavo perdido!
    });

    it('deve dividir 1 real em 3 partes corretamente', () => {
      const parts = moneyUtils.splitSafely(1, 3);
      expect(parts[0]).toBe(0.33);
      expect(parts[1]).toBe(0.33);
      expect(parts[2]).toBe(0.34);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(1.00);
    });
  });

  describe('round', () => {
    it('deve arredondar com precisão para evitar floats infinitos', () => {
      expect(moneyUtils.round(0.1 + 0.2)).toBe(0.3);
      expect(moneyUtils.round(10.555)).toBe(10.56);
      expect(moneyUtils.round(10.554)).toBe(10.55);
    });
  });
});
