# Correção de Moeda Internacional - 31/12/2024

## Problema Identificado

Ao criar contas internacionais (USD, EUR, etc.), a transação de saldo inicial estava sendo criada em **BRL** ao invés da moeda da conta.

### Exemplo do Problema:
- Conta: Wise - Conta Corrente (USD)
- Saldo: $ 1.000,00 ✅ (correto)
- Transação "Saldo inicial": **+R$ 1.000,00** ❌ (errado - deveria ser $ 1.000,00)
- Dashboard: Mostrava R$ 1.000,00 no saldo BRL ❌ (errado - não deveria incluir moeda estrangeira)

---

## Causa Raiz

1. **Hook `useAccounts.ts`** não estava passando a moeda da conta ao criar a transação de saldo inicial
2. Transação era criada com `currency: 'BRL'` (padrão) mesmo para contas internacionais
3. Isso causava dois problemas:
   - Transação exibida com símbolo errado (R$ ao invés de $)
   - Dashboard incluía o valor no total BRL (incorreto)

---

## Correções Aplicadas

### 1. Hook `useAccounts.ts` (Linha 82)
**Correção principal**: Passar a moeda da conta ao criar transação de saldo inicial

```typescript
// ANTES
const { error: txError } = await supabase.from('transactions').insert({
  // ... outros campos
  currency: 'BRL', // ❌ Sempre BRL
});

// DEPOIS
const { error: txError } = await supabase.from('transactions').insert({
  // ... outros campos
  currency: input.currency || 'BRL', // ✅ Usa moeda da conta
});
```

### 2. Correção de Dados Existentes
Corrigida transação de saldo inicial existente no banco:
- ID: `35d2782b-b930-4b41-9366-9af2aa91ec7c`
- Conta: Wise - Conta Corrente (USD)
- Alterado: `currency: 'BRL'` → `currency: 'USD'`

### 3. Verificação do Dashboard
A função `get_monthly_financial_summary` já estava correta:
- Filtra apenas transações BRL: `WHERE (currency = 'BRL' OR currency IS NULL)`
- Exclui contas internacionais do saldo: `WHERE (is_international = false OR is_international IS NULL)`
- Portanto, o Dashboard **não inclui** moedas estrangeiras nos totais BRL ✅

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
Wise - Conta Corrente (USD)
Saldo: $ 1.000,00

Transações:
+R$ 1.000,00  Saldo inicial  ← ERRADO

Dashboard:
Saldo atual (BRL): R$ 1.000,00  ← ERRADO (incluía USD)
```

### Depois ✅
```
Wise - Conta Corrente (USD)
Saldo: $ 1.000,00

Transações:
+$ 1.000,00  Saldo inicial  ← CORRETO

Dashboard:
Saldo atual (BRL): R$ 0,00  ← CORRETO (exclui USD)
USD: $ 1.000,00  ← Mostrado separadamente
```

---

## Arquivos Alterados

1. ✅ `src/hooks/useAccounts.ts` - Passar currency ao criar transação de saldo inicial
2. ✅ Banco de dados - Corrigida transação existente de USD para BRL

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

### Dashboard - Separação de Moedas
O Dashboard agora funciona corretamente:
- **Saldo atual (BRL)**: Mostra apenas contas em BRL (exclui internacionais)
- **Entradas/Saídas**: Considera apenas transações em BRL
- **Saldos Estrangeiros**: Mostrados separadamente com ícone de globo (🌐)

### Função do Banco de Dados
A função `get_monthly_financial_summary` já estava preparada:
```sql
-- Receitas/Despesas: apenas BRL
WHERE (currency = 'BRL' OR currency IS NULL)

-- Saldo: exclui contas internacionais
WHERE (is_international = false OR is_international IS NULL)
```

### Próximas Contas Internacionais
Ao criar novas contas internacionais, o saldo inicial será automaticamente criado na moeda correta.

---

**Data**: 31/12/2024  
**Desenvolvedor**: Kiro AI  
**Versão**: 1.0  
**Status**: ✅ Aplicado, testado e commitado (commit 0d333cc)
