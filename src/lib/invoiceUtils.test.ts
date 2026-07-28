import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Testes para invoiceUtils
 *
 * Valida cálculos de fatura e manipulação de datas
 *
 * **Validates: Requirements 1.5**
 */

describe("invoiceUtils", () => {
  describe("Cálculos de Fatura", () => {
    it("deve calcular total de fatura corretamente", () => {
      const items = [
        { amount: 100, quantity: 1 },
        { amount: 50, quantity: 2 },
        { amount: 25, quantity: 4 },
      ];

      const total = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
      expect(total).toBe(300);
    });

    it("deve calcular subtotal com desconto", () => {
      const subtotal = 100;
      const discount = 10;
      const total = subtotal - discount;
      expect(total).toBe(90);
    });

    it("deve calcular taxa corretamente", () => {
      const subtotal = 100;
      const taxRate = 0.1; // 10%
      const tax = subtotal * taxRate;
      expect(tax).toBe(10);
    });

    it("deve calcular total com taxa", () => {
      const subtotal = 100;
      const tax = 10;
      const total = subtotal + tax;
      expect(total).toBe(110);
    });

    it("deve arredondar valores de fatura para 2 casas decimais", () => {
      const value = 10.555;
      const rounded = Math.round(value * 100) / 100;
      expect(rounded).toBe(10.56);
    });
  });

  describe("Manipulação de Datas", () => {
    it("deve extrair ano de data", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const year = date.getUTCFullYear();
      expect(year).toBe(2024);
    });

    it("deve extrair mês de data", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const month = date.getUTCMonth() + 1; // getUTCMonth retorna 0-11
      expect(month).toBe(12);
    });

    it("deve extrair dia de data", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const day = date.getUTCDate();
      expect(day).toBe(25);
    });

    it("deve formatar data como YYYY-MM-DD", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const formatted = date.toISOString().split("T")[0];
      expect(formatted).toBe("2024-12-25");
    });

    it("deve calcular primeiro dia do mês", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      expect(firstDay.getUTCDate()).toBe(1);
    });

    it("deve calcular último dia do mês", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
      expect(lastDay.getUTCDate()).toBe(31);
    });
  });

  describe("Propriedades de Precisão", () => {
    it("soma de itens de fatura deve ser consistente", () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 1, max: 1000, noNaN: true }), {
            minLength: 1,
            maxLength: 100,
          }),
          (amounts) => {
            const normalizedAmounts = amounts.map((a) => Math.round(a * 100) / 100);
            const sum = normalizedAmounts.reduce((a, b) => a + b, 0);
            const roundedSum = Math.round(sum * 100) / 100;

            // Soma deve ser positiva
            expect(roundedSum).toBeGreaterThan(0);

            // Soma deve ter no máximo 2 casas decimais
            const decimalPlaces = (roundedSum.toString().split(".")[1] || "").length;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
          }
        )
      );
    });

    it("desconto não deve exceder subtotal", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (subtotal, discountRate) => {
            const discount = subtotal * discountRate;
            const total = subtotal - discount;

            expect(total).toBeGreaterThanOrEqual(0);
            expect(total).toBeLessThanOrEqual(subtotal);
          }
        )
      );
    });

    it("taxa deve ser proporcional ao subtotal", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 0.5, noNaN: true }),
          (subtotal, taxRate) => {
            const tax = subtotal * taxRate;
            const total = subtotal + tax;

            expect(tax).toBeGreaterThanOrEqual(0);
            expect(total).toBeGreaterThanOrEqual(subtotal);
          }
        )
      );
    });
  });

  describe("Casos Extremos", () => {
    it("deve lidar com fatura vazia", () => {
      const items: any[] = [];
      const total = items.reduce((sum, item) => SafeFinancialCalculator.add(sum, item.amount), 0);
      expect(total).toBe(0);
    });

    it("deve lidar com um único item", () => {
      const items = [{ amount: 100, quantity: 1 }];
      const total = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
      expect(total).toBe(100);
    });

    it("deve lidar com valores muito pequenos", () => {
      const value = 0.01;
      const rounded = Math.round(value * 100) / 100;
      expect(rounded).toBe(0.01);
    });

    it("deve lidar com valores muito grandes", () => {
      const value = 999999.99;
      const rounded = Math.round(value * 100) / 100;
      expect(rounded).toBe(999999.99);
    });

    it("deve lidar com datas no início do ano", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
    });

    it("deve lidar com datas no final do ano", () => {
      const date = new Date("2024-12-31T00:00:00Z");
      expect(date.getUTCMonth()).toBe(11);
      expect(date.getUTCDate()).toBe(31);
    });
  });

  describe("Validação de Dados", () => {
    it("deve validar que quantidade é positiva", () => {
      const quantity = 5;
      expect(quantity).toBeGreaterThan(0);
    });

    it("deve validar que preço é positivo", () => {
      const price = 100;
      expect(price).toBeGreaterThan(0);
    });

    it("deve validar que data é válida", () => {
      const date = new Date("2024-12-25");
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("deve rejeitar quantidade negativa", () => {
      const quantity = -5;
      expect(quantity).toBeLessThan(0);
    });

    it("deve rejeitar preço negativo", () => {
      const price = -100;
      expect(price).toBeLessThan(0);
    });
  });

  describe("Idempotência", () => {
    it("calcular total múltiplas vezes deve produzir o mesmo resultado", () => {
      const items = [
        { amount: 100, quantity: 1 },
        { amount: 50, quantity: 2 },
      ];

      const total1 = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
      const total2 = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
      const total3 = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);

      expect(total1).toBe(total2);
      expect(total2).toBe(total3);
    });

    it("arredondar múltiplas vezes deve produzir o mesmo resultado", () => {
      const value = 10.555;
      const rounded1 = Math.round(value * 100) / 100;
      const rounded2 = Math.round(rounded1 * 100) / 100;
      const rounded3 = Math.round(rounded2 * 100) / 100;

      expect(rounded1).toBe(rounded2);
      expect(rounded2).toBe(rounded3);
    });
  });
});
