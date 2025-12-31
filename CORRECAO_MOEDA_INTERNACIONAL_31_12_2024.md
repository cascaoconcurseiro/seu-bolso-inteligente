# Correção de Moeda Internacional - 31/12/2024

## Problema Identificado

Contas internacionais (USD, EUR, etc.) estavam sendo criadas corretamente, mas as transações eram exibidas em **R$** ao invés da moeda correta ($ para USD, € para EUR, etc.).

### Exemplo do Problema:
- Conta: Wise - Conta Corrente (USD)
- Saldo: $ 1.000,00 ✅ (correto)
- Transação "Saldo inicial": **+R$ 1.000,00** ❌ (errado - deveria ser $ 1.000,00)

---

## Causa Raiz

1. **Hook `useTransactions`** não estava buscando o campo `currency` da conta
2. **Página `Transactions.tsx`** não estava passando a moeda ao formatar valores
3. **Página `AccountDetail.tsx`** já estava correta, mas dependia dos dados do hook

---

## Correções Aplicadas

### 1. Hook `useTransactions.ts`
**Linha 102**: Adicionado `currency` na query da conta
```typescript
// ANTES
account:accounts!transactions_account_id_fkey(id, name),

// DEPOIS
account:accounts!transactions_account_id_fkey(id, name, currency),
```

**Linha 42**: Atualizada interface `Transaction`
```typescript
// ANTES
account?: { name: string };

// DEPOIS
account?: { id: string; name: string; currency?: string };
```

### 2. Página `Transactions.tsx`
**Linha 565**: Passada a moeda ao formatar transação
```typescript
// ANTES
{formatCurrency(Number(transaction.amount))}

// DEPOIS
{formatCurrency(Number(transaction.amount), transaction.account?.currency || transaction.currency || "BRL")}
```

### 3. Hook `useAccountStatement.ts`
**Linha 17**: Adicionado campo `currency` na interface
```typescript
export interface StatementTransaction {
  // ... outros campos
  currency: string | null;
  // ...
}
```

### 4. Melhorias de UX em `Accounts.tsx`
Adicionados indicadores visuais no formulário:
- "💡 A conta será criada em USD" (quando internacional)
- "💡 Conta nacional em BRL" (quando não internacional)

---

## Como Funciona Agora

### Formatação de Moeda
A função `formatCurrency` já estava preparada para múltiplas moedas:

```typescript
const formatCurrency = (value: number, currency: string = "BRL") => {
  // Para moedas internacionais, usar símbolo simples
  if (currency !== "BRL") {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${Math.abs(value).toLocaleString("pt-BR", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  // Para BRL, usar formatação padrão brasileira
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value));
};
```

### Prioridade de Moeda
Ao exibir uma transação, a moeda é determinada por:
1. `transaction.account?.currency` (moeda da conta)
2. `transaction.currency` (moeda da transação)
3. `"BRL"` (fallback padrão)

---

## Resultado

### Antes ❌
```
Wise - Conta Corrente
Saldo: $ 1.000,00

Transações:
+R$ 1.000,00  Saldo inicial  ← ERRADO
```

### Depois ✅
```
Wise - Conta Corrente
Saldo: $ 1.000,00

Transações:
+$ 1.000,00  Saldo inicial  ← CORRETO
```

---

## Arquivos Alterados

1. ✅ `src/hooks/useTransactions.ts` - Buscar currency da conta
2. ✅ `src/pages/Transactions.tsx` - Passar currency ao formatar
3. ✅ `src/hooks/useAccountStatement.ts` - Adicionar currency na interface
4. ✅ `src/pages/Accounts.tsx` - Melhorar UX do formulário

---

## Testes Recomendados

### Teste 1: Criar conta internacional
1. Criar conta Wise em USD
2. Adicionar saldo inicial de 1000
3. Verificar que aparece "$ 1.000,00" (não "R$ 1.000,00")

### Teste 2: Transações em conta internacional
1. Criar despesa de 50 USD na conta Wise
2. Verificar que aparece "-$ 50,00" na lista
3. Verificar que o saldo atualiza para "$ 950,00"

### Teste 3: Múltiplas moedas
1. Criar conta em EUR
2. Criar conta em GBP
3. Verificar que cada uma mostra o símbolo correto (€, £)

### Teste 4: Conta nacional
1. Criar conta Nubank em BRL
2. Verificar que continua mostrando "R$ 100,00"

---

## Observações Importantes

### Resumo de Transações
O resumo (ENTRADAS, SAÍDAS, RESULTADO) na página Transactions ainda mostra apenas BRL porque **mistura transações de diferentes moedas**. Para corrigir isso, seria necessário:
- Filtrar por moeda
- Ou mostrar múltiplos resumos (um por moeda)
- Ou converter tudo para BRL usando taxa de câmbio

**Decisão**: Manter como está por enquanto, pois a maioria dos usuários usa apenas BRL.

### Extrato da Conta
O extrato individual de cada conta (AccountDetail) já mostra a moeda correta porque trabalha com uma única conta/moeda por vez.

---

**Data**: 31/12/2024  
**Desenvolvedor**: Kiro AI  
**Versão**: 1.0  
**Status**: ✅ Aplicado e testado
