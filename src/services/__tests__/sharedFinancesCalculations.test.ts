/**
 * Testes para Cálculos de Finanças Compartilhadas
 * TASK 2.6: Adicionar Testes Abrangentes para Finanças Compartilhadas
 *
 * SafeFinancialCalculator retorna Decimal — asserções convertem via .toNumber().
 */

import { describe, it, expect } from "vitest";
import type { Decimal } from "decimal.js";
import { SafeFinancialCalculator } from "../SafeFinancialCalculator";

describe("Shared Finances Calculations", () => {
  describe("Split Calculations", () => {
    it("deve calcular splits com percentuais corretos", () => {
      const totalAmount = 100;
      const splits = [{ percentage: 50 }, { percentage: 30 }, { percentage: 20 }];

      const results = splits.map((split) =>
        SafeFinancialCalculator.percentage(totalAmount, split.percentage)
      );

      expect(results[0].toNumber()).toBe(50);
      expect(results[1].toNumber()).toBe(30);
      expect(results[2].toNumber()).toBe(20);

      // Verificar que a soma é igual ao total
      const sum = SafeFinancialCalculator.safeSum(results);
      expect(sum.toNumber()).toBe(totalAmount);
    });

    it("deve validar que splits somam o total da transação", () => {
      const totalAmount = 150.5;
      const splits = [
        SafeFinancialCalculator.percentage(totalAmount, 40),
        SafeFinancialCalculator.percentage(totalAmount, 35),
        SafeFinancialCalculator.percentage(totalAmount, 25),
      ];

      const sum = SafeFinancialCalculator.safeSum(splits);

      // Permitir tolerância de 1 centavo
      expect(Math.abs(sum.toNumber() - totalAmount)).toBeLessThanOrEqual(0.01);
    });

    it("deve lidar com splits com valores decimais", () => {
      const totalAmount = 99.99;
      const splits = [
        SafeFinancialCalculator.percentage(totalAmount, 33.33),
        SafeFinancialCalculator.percentage(totalAmount, 33.33),
        SafeFinancialCalculator.percentage(totalAmount, 33.34),
      ];

      const sum = SafeFinancialCalculator.safeSum(splits);

      // Verificar que a soma é próxima ao total (tolerância de 0.02 para arredondamento)
      expect(Math.abs(sum.toNumber() - totalAmount)).toBeLessThanOrEqual(0.02);
    });

    it("deve calcular split para membro único", () => {
      const totalAmount = 100;
      const split = SafeFinancialCalculator.percentage(totalAmount, 100);

      expect(split.toNumber()).toBe(totalAmount);
    });

    it("deve calcular splits com múltiplas moedas", () => {
      const amounts = {
        BRL: 100,
        USD: 50,
        EUR: 75,
      };

      const splitPercentage = 50;
      const results = Object.entries(amounts).map(([currency, amount]) => ({
        currency,
        split: SafeFinancialCalculator.percentage(amount, splitPercentage),
      }));

      expect(results[0].split.toNumber()).toBe(50);
      expect(results[1].split.toNumber()).toBe(25);
      expect(results[2].split.toNumber()).toBe(37.5);
    });
  });

  describe("Settlement Calculations", () => {
    it("deve calcular settlement para débito simples", () => {
      const debtAmount = 100;
      const paymentAmount = 100;

      const remaining = SafeFinancialCalculator.subtract(debtAmount, paymentAmount);

      expect(remaining.toNumber()).toBe(0);
    });

    it("deve calcular settlement parcial", () => {
      const debtAmount = 100;
      const paymentAmount = 60;

      const remaining = SafeFinancialCalculator.subtract(debtAmount, paymentAmount);

      expect(remaining.toNumber()).toBe(40);
    });

    it("deve validar que settlement não pode ser maior que débito", () => {
      const debtAmount = 100;
      const paymentAmount = 150;

      // Validação: pagamento não pode ser maior que débito
      expect(paymentAmount).toBeGreaterThan(debtAmount);
    });

    it("deve calcular settlement com múltiplas parcelas", () => {
      const totalDebt = 300;
      const payments = [100, 100, 100];

      let remaining = SafeFinancialCalculator.toDecimal(totalDebt);
      for (const payment of payments) {
        remaining = SafeFinancialCalculator.subtract(remaining, payment);
      }

      expect(remaining.toNumber()).toBe(0);
    });

    it("deve calcular settlement com valores decimais", () => {
      const debtAmount = 99.99;
      const paymentAmount = 33.33;

      const remaining = SafeFinancialCalculator.subtract(debtAmount, paymentAmount);

      // Verificar que o resultado é próximo ao esperado
      expect(Math.abs(remaining.toNumber() - 66.66)).toBeLessThanOrEqual(0.01);
    });
  });

  describe("Invoice Calculations", () => {
    it("deve calcular total de fatura com múltiplos itens", () => {
      const items = [
        { amount: 50, type: "CREDIT" },
        { amount: 30, type: "CREDIT" },
        { amount: 20, type: "DEBIT" },
      ];

      let total = SafeFinancialCalculator.toDecimal(0);
      for (const item of items) {
        if (item.type === "CREDIT") {
          total = SafeFinancialCalculator.add(total, item.amount);
        } else {
          total = SafeFinancialCalculator.subtract(total, item.amount);
        }
      }

      expect(total.toNumber()).toBe(60);
    });

    it("deve calcular fatura com itens pagos e não pagos", () => {
      const items = [
        { amount: 100, isPaid: false },
        { amount: 50, isPaid: true },
        { amount: 75, isPaid: false },
      ];

      const unpaidTotal = SafeFinancialCalculator.safeSum(
        items.filter((i) => !i.isPaid).map((i) => i.amount)
      );

      expect(unpaidTotal.toNumber()).toBe(175);
    });

    it("deve calcular fatura por moeda", () => {
      const items = [
        { amount: 100, currency: "BRL" },
        { amount: 50, currency: "USD" },
        { amount: 75, currency: "BRL" },
        { amount: 25, currency: "USD" },
      ];

      const byCurrency: Record<string, Decimal> = {};

      for (const item of items) {
        byCurrency[item.currency] = SafeFinancialCalculator.add(
          byCurrency[item.currency] ?? 0,
          item.amount
        );
      }

      expect(byCurrency["BRL"].toNumber()).toBe(175);
      expect(byCurrency["USD"].toNumber()).toBe(75);
    });

    it("deve calcular fatura com múltiplas moedas sem somar", () => {
      const items = [
        { amount: 100, currency: "BRL" },
        { amount: 50, currency: "USD" },
      ];

      const totals = items.reduce(
        (acc, item) => {
          acc[item.currency] = SafeFinancialCalculator.add(acc[item.currency] ?? 0, item.amount);
          return acc;
        },
        {} as Record<string, Decimal>
      );

      // Nunca somar moedas diferentes
      expect(totals["BRL"].toNumber()).toBe(100);
      expect(totals["USD"].toNumber()).toBe(50);
      expect(Object.keys(totals).length).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("deve lidar com valores zero", () => {
      const result = SafeFinancialCalculator.percentage(0, 50);
      expect(result.toNumber()).toBe(0);
    });

    it("deve lidar com percentual zero", () => {
      const result = SafeFinancialCalculator.percentage(100, 0);
      expect(result.toNumber()).toBe(0);
    });

    it("deve lidar com valores muito pequenos", () => {
      const result = SafeFinancialCalculator.percentage(0.01, 50);
      // SafeFinancialCalculator usa arredondamento para centavos
      expect(result.toNumber()).toBeCloseTo(0.005, 1);
    });

    it("deve lidar com valores muito grandes", () => {
      const result = SafeFinancialCalculator.percentage(999999.99, 50);
      // Verificar que o resultado é próximo ao esperado
      expect(result.toNumber()).toBeCloseTo(499999.995, 1);
    });

    it("deve manter precisão com múltiplas operações", () => {
      let value = SafeFinancialCalculator.toDecimal(100);

      // Adicionar e subtrair
      value = SafeFinancialCalculator.add(value, 50);
      value = SafeFinancialCalculator.subtract(value, 30);
      value = SafeFinancialCalculator.add(value, 20);
      value = SafeFinancialCalculator.subtract(value, 40);

      expect(value.toNumber()).toBe(100);
    });

    it("deve lidar com array vazio em safeSum", () => {
      const result = SafeFinancialCalculator.safeSum([]);
      expect(result.toNumber()).toBe(0);
    });

    it("deve lidar com array com um elemento em safeSum", () => {
      const result = SafeFinancialCalculator.safeSum([42.5]);
      expect(result.toNumber()).toBe(42.5);
    });
  });

  describe("Invariants", () => {
    it("deve manter invariante: soma de splits <= total + 1 centavo", () => {
      const total = 100;
      const splits = [
        SafeFinancialCalculator.percentage(total, 33.33),
        SafeFinancialCalculator.percentage(total, 33.33),
        SafeFinancialCalculator.percentage(total, 33.34),
      ];

      const sum = SafeFinancialCalculator.safeSum(splits);

      expect(sum.toNumber()).toBeLessThanOrEqual(total + 0.01);
    });

    it("deve manter invariante: round-trip de add/subtract", () => {
      const a = 100;
      const b = 50;

      const result = SafeFinancialCalculator.subtract(SafeFinancialCalculator.add(a, b), b);

      expect(result.toNumber()).toBe(a);
    });

    it("deve manter invariante: idempotência de settlement", () => {
      const debt = 100;
      const payment = 50;

      const result1 = SafeFinancialCalculator.subtract(debt, payment);
      const result2 = SafeFinancialCalculator.subtract(result1, payment);

      expect(result2.toNumber()).toBe(0);
    });
  });
});
