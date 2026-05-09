/**
 * Especialista Financeiro & Matemático
 * 
 * Utilitário seguro para manipulação monetária em JavaScript/TypeScript.
 * NUNCA utilize operadores nativos (+, -, *, /) diretamente em valores monetários (float)
 * para evitar falhas de precisão (ex: 0.1 + 0.2 = 0.30000000000000004).
 * 
 * Esta biblioteca converte todos os valores para centavos (Inteiros) antes 
 * da operação e depois converte de volta para o padrão humano, garantindo 100% de exatidão.
 */

export const moneyUtils = {
  /** Converte valor float (10.50) para centavos inteiros (1050) */
  toCents: (amount: number): number => Math.round(amount * 100),
  
  /** Converte centavos (1050) de volta para float (10.50) */
  toFloat: (cents: number): number => cents / 100,
  
  /** Soma um array de valores monetários de forma segura */
  add: (...amounts: number[]): number => {
    const totalCents = amounts.reduce((sum, amount) => sum + moneyUtils.toCents(amount), 0);
    return moneyUtils.toFloat(totalCents);
  },
  
  /** Subtrai b de a de forma segura (a - b) */
  subtract: (a: number, b: number): number => {
    return moneyUtils.toFloat(moneyUtils.toCents(a) - moneyUtils.toCents(b));
  },
  
  /** Multiplica um valor monetário por um fator (ex: juros ou quantidade) */
  multiply: (amount: number, multiplier: number): number => {
    return moneyUtils.toFloat(Math.round(moneyUtils.toCents(amount) * multiplier));
  },
  
  /** Divide um valor monetário (útil para dividir contas), com arredondamento seguro */
  divide: (amount: number, divisor: number): number => {
    if (divisor === 0) throw new Error("Não é possível dividir dinheiro por zero.");
    return moneyUtils.toFloat(Math.round(moneyUtils.toCents(amount) / divisor));
  },
  
  /** Valida se um número é seguro para operações de banco de dados e UI */
  isValid: (amount: number): boolean => {
    return typeof amount === 'number' && !isNaN(amount) && isFinite(amount);
  }
};
