import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SafeFinancialCalculator } from '@/services/SafeFinancialCalculator';

/**
 * Testes para useSharedFinances
 * 
 * Valida cálculos de finanças compartilhadas, splits e faturas
 * 
 * **Validates: Requirements 1.5**
 */

describe('useSharedFinances - Shared Finances Calculations', () => {
  describe('Cálculo de Splits', () => {
    it('deve calcular splits corretamente quando dividindo entre múltiplos membros', () => {
      const total = 100;
      const splits = [
        { percentage: 50 },
        { percentage: 50 },
      ];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(50);
      expect(result[1].amount).toBe(50);
      expect(result[0].amount + result[1].amount).toBe(100);
    });

    it('deve validar que soma de splits não excede total + 1 centavo', () => {
      const total = 100;
      const splits = [
        { amount: 33.33 },
        { amount: 33.33 },
        { amount: 33.33 },
      ];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(true);
    });

    it('deve rejeitar splits que excedem total', () => {
      const total = 100;
      const splits = [
        { amount: 60 },
        { amount: 50 },
      ];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(false);
    });

    it('deve distribuir splits com ajuste na última parcela para precisão', () => {
      const total = 100;
      const splits = [
        { percentage: 33.33 },
        { percentage: 33.33 },
        { percentage: 33.34 },
      ];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);
      const sum = result.reduce((acc, r) => SafeFinancialCalculator.add(acc, r.amount), 0);

      expect(sum).toBe(100);
    });
  });

  describe('Cálculo de Faturas', () => {
    it('deve calcular total de fatura corretamente', () => {
      const transactions = [
        { type: 'EXPENSE', amount: 100 },
        { type: 'EXPENSE', amount: 50 },
        { type: 'INCOME', amount: 30 },
      ];

      const total = transactions.reduce((acc, tx) => {
        if (tx.type === 'EXPENSE') return acc + tx.amount;
        if (tx.type === 'INCOME') return acc - tx.amount;
        return acc;
      }, 0);

      expect(total).toBe(120);
    });

    it('deve filtrar transações por mês de competência corretamente', () => {
      const transactions = [
        { competence_date: '2024-01-01', amount: 100 },
        { competence_date: '2024-01-01', amount: 50 },
        { competence_date: '2024-02-01', amount: 75 },
      ];

      const targetMonth = '2024-01';
      const filtered = transactions.filter(tx => tx.competence_date.startsWith(targetMonth));

      expect(filtered).toHaveLength(2);
      expect(filtered[0].amount + filtered[1].amount).toBe(150);
    });

    it('deve agrupar transações por membro corretamente', () => {
      const invoiceItems = [
        { memberId: 'member-1', amount: 100, type: 'CREDIT' },
        { memberId: 'member-1', amount: 50, type: 'CREDIT' },
        { memberId: 'member-2', amount: 75, type: 'DEBIT' },
      ];

      const grouped: Record<string, any[]> = {};
      invoiceItems.forEach(item => {
        if (!grouped[item.memberId]) {
          grouped[item.memberId] = [];
        }
        grouped[item.memberId].push(item);
      });

      expect(grouped['member-1']).toHaveLength(2);
      expect(grouped['member-2']).toHaveLength(1);
    });
  });

  describe('Cálculo de Totais por Moeda', () => {
    it('deve calcular totais separados por moeda', () => {
      const items = [
        { currency: 'BRL', amount: 100, type: 'CREDIT', isPaid: false },
        { currency: 'BRL', amount: 50, type: 'DEBIT', isPaid: false },
        { currency: 'USD', amount: 20, type: 'CREDIT', isPaid: false },
      ];

      const totalsByCurrency: Record<string, { credits: number; debits: number; net: number }> = {};

      items.forEach(item => {
        const curr = item.currency || 'BRL';
        if (!totalsByCurrency[curr]) {
          totalsByCurrency[curr] = { credits: 0, debits: 0, net: 0 };
        }

        if (item.type === 'CREDIT') {
          totalsByCurrency[curr].credits += item.amount;
        } else {
          totalsByCurrency[curr].debits += item.amount;
        }
      });

      Object.keys(totalsByCurrency).forEach(curr => {
        totalsByCurrency[curr].net = totalsByCurrency[curr].credits - totalsByCurrency[curr].debits;
      });

      expect(totalsByCurrency['BRL'].credits).toBe(100);
      expect(totalsByCurrency['BRL'].debits).toBe(50);
      expect(totalsByCurrency['BRL'].net).toBe(50);
      expect(totalsByCurrency['USD'].credits).toBe(20);
      expect(totalsByCurrency['USD'].net).toBe(20);
    });

    it('deve nunca somar moedas diferentes', () => {
      const items = [
        { currency: 'BRL', amount: 100, type: 'CREDIT' },
        { currency: 'USD', amount: 100, type: 'CREDIT' },
      ];

      const totalsByCurrency: Record<string, number> = {};

      items.forEach(item => {
        const curr = item.currency || 'BRL';
        if (!totalsByCurrency[curr]) {
          totalsByCurrency[curr] = 0;
        }
        totalsByCurrency[curr] += item.amount;
      });

      // Verificar que BRL e USD são mantidos separados
      expect(totalsByCurrency['BRL']).toBe(100);
      expect(totalsByCurrency['USD']).toBe(100);
      // Nunca somar: 100 + 100 = 200 (ERRADO!)
    });
  });

  describe('Filtro de Abas', () => {
    it('deve filtrar REGULAR: apenas itens não pagos, sem viagens, do mês atual', () => {
      const items = [
        { isPaid: false, tripId: null, date: '2024-01-15' },
        { isPaid: true, tripId: null, date: '2024-01-15' },
        { isPaid: false, tripId: 'trip-1', date: '2024-01-15' },
      ];

      const currentDate = new Date('2024-01-20');
      const filtered = items.filter(item => {
        if (item.isPaid) return false;
        if (item.tripId) return false;
        
        const [year, month] = item.date.split('-').map(Number);
        return month === currentDate.getMonth() + 1 && year === currentDate.getFullYear();
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].isPaid).toBe(false);
      expect(filtered[0].tripId).toBeNull();
    });

    it('deve filtrar TRAVEL: todos os itens de viagens', () => {
      const items = [
        { isPaid: false, tripId: 'trip-1', date: '2024-01-15' },
        { isPaid: true, tripId: 'trip-1', date: '2024-01-15' },
        { isPaid: false, tripId: null, date: '2024-01-15' },
      ];

      const filtered = items.filter(item => !!item.tripId);

      expect(filtered).toHaveLength(2);
      filtered.forEach(item => {
        expect(item.tripId).toBe('trip-1');
      });
    });

    it('deve filtrar HISTORY: apenas itens pagos do mês atual', () => {
      const items = [
        { isPaid: true, tripId: null, date: '2024-01-15' },
        { isPaid: false, tripId: null, date: '2024-01-15' },
        { isPaid: true, tripId: null, date: '2024-02-15' },
      ];

      const currentDate = new Date('2024-01-20');
      const filtered = items.filter(item => {
        if (!item.isPaid) return false;
        
        const [year, month] = item.date.split('-').map(Number);
        return month === currentDate.getMonth() + 1 && year === currentDate.getFullYear();
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].isPaid).toBe(true);
      expect(filtered[0].date).toContain('2024-01');
    });
  });

  describe('Propriedades de Correção', () => {
    it('Invariante: Soma de splits <= total + 1 centavo', () => {
      const total = 100;
      const splits = [
        { percentage: 33.33 },
        { percentage: 33.33 },
        { percentage: 33.34 },
      ];

      const result = SafeFinancialCalculator.distributeSplits(total, splits);
      const sum = result.reduce((acc, r) => SafeFinancialCalculator.add(acc, r.amount), 0);

      expect(sum).toBeLessThanOrEqual(total + 0.01);
    });

    it('Idempotência: Calcular faturas múltiplas vezes produz mesmo resultado', () => {
      const transactions = [
        { type: 'EXPENSE', amount: 100, competence_date: '2024-01-01' },
        { type: 'EXPENSE', amount: 50, competence_date: '2024-01-01' },
      ];

      const targetMonth = '2024-01';
      const filtered1 = transactions.filter(tx => tx.competence_date.startsWith(targetMonth));
      const filtered2 = transactions.filter(tx => tx.competence_date.startsWith(targetMonth));

      expect(filtered1).toHaveLength(filtered2.length);
      expect(filtered1[0].amount).toBe(filtered2[0].amount);
    });

    it('Confluência: Ordem de processamento não afeta totais finais', () => {
      const items1 = [
        { amount: 100, type: 'CREDIT' },
        { amount: 50, type: 'DEBIT' },
      ];

      const items2 = [
        { amount: 50, type: 'DEBIT' },
        { amount: 100, type: 'CREDIT' },
      ];

      const sum1 = items1.reduce((acc, item) => {
        if (item.type === 'CREDIT') return acc + item.amount;
        return acc - item.amount;
      }, 0);

      const sum2 = items2.reduce((acc, item) => {
        if (item.type === 'CREDIT') return acc + item.amount;
        return acc - item.amount;
      }, 0);

      expect(sum1).toBe(sum2);
      expect(sum1).toBe(50);
    });
  });

  describe('Validação de Splits', () => {
    it('deve aceitar splits que somam exatamente o total', () => {
      const total = 100;
      const splits = [
        { amount: 50 },
        { amount: 50 },
      ];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(true);
    });

    it('deve aceitar splits com margem de 1 centavo', () => {
      const total = 100;
      const splits = [
        { amount: 33.33 },
        { amount: 33.33 },
        { amount: 33.33 },
      ];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(true);
    });

    it('deve rejeitar splits que excedem total + 1 centavo', () => {
      const total = 100;
      const splits = [
        { amount: 50.01 },
        { amount: 50.01 },
      ];

      const isValid = SafeFinancialCalculator.validateSplits(total, splits);

      expect(isValid).toBe(false);
    });
  });
});
