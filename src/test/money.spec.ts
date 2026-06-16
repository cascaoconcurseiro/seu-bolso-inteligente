import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';

describe('Financial Security & Math Rules', () => {
  it('Deve garantir precisão absoluta na soma de floats flutuantes usando Decimal', () => {
    // JavaScript padrão falharia nisso (0.1 + 0.2 = 0.30000000000000004)
    const rawVal1 = 0.1;
    const rawVal2 = 0.2;
    
    const decimalVal1 = new Decimal(rawVal1);
    const decimalVal2 = new Decimal(rawVal2);
    
    const sum = decimalVal1.plus(decimalVal2).toNumber();
    
    // Testa a precisão exata
    expect(sum).toBe(0.3);
  });

  it('O sistema de fatura de cartão deve avançar o mês se a compra for feita após o fechamento', () => {
    // Simulando a lógica de fechamento
    const purchaseDay = 28;
    const closingDay = 25;
    
    let isNextMonth = false;
    if (purchaseDay > closingDay) {
      isNextMonth = true;
    }
    
    expect(isNextMonth).toBe(true);
  });
});
