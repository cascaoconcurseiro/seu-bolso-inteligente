# 🔧 Correção: Query source_transaction.user_id

**Data:** 27/12/2024  
**Status:** ✅ APLICADO

## 🚨 Problema

Console mostrava erros repetidos:
```
Payer user_id not found for mirror transaction: 2854dfbc-09e8-4348-84c3-7f7ad96ecf25
Payer user_id not found for mirror transaction: 9eaf51bd-174c-45c9-bafd-a6afdf339014
Payer user_id not found for mirror transaction: 76d97c47-47e7-40d1-a4c1-85638eaf6440
```

Isso impedia que a Fran visse as transações compartilhadas que o Wesley criou.

## 🔍 Causa Raiz

A query nested do Supabase em `useSharedFinances.ts` não estava retornando o `user_id` da transação fonte:

```typescript
// ❌ NÃO FUNCIONAVA
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    source_transaction:source_transaction_id (
      user_id
    )
  `)
```

Apesar dos dados estarem corretos no banco (verificado via SQL direto), a query nested não retornava o campo `source_transaction.user_id`.

## ✅ Solução Aplicada

Substituir por **duas queries separadas** e mapear manualmente:

```typescript
// ✅ FUNCIONA
// 1. Buscar mirror transactions
const { data: mirrors, error: mirrorsError } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_shared', true)
  .not('source_transaction_id', 'is', null);

// 2. Buscar source transactions
const sourceIds = mirrors.map(m => m.source_transaction_id).filter(Boolean);
const { data: sources, error: sourcesError } = await supabase
  .from('transactions')
  .select('id, user_id')
  .in('id', sourceIds);

// 3. Mapear user_id de volta
const sourcesMap = new Map(sources?.map(s => [s.id, s.user_id]) || []);
return mirrors.map(mirror => ({
  ...mirror,
  source_transaction: {
    user_id: sourcesMap.get(mirror.source_transaction_id)
  }
}));
```

## 📊 Verificação

### Antes da Correção
- ❌ Fran via apenas 1 transação (a que ela criou)
- ❌ Console cheio de erros
- ❌ Não mostrava débitos com Wesley

### Depois da Correção
- ✅ Fran vê 4 transações compartilhadas
- ✅ 1 CREDIT: Wesley deve R$ 33 a ela
- ✅ 3 DEBITS: Ela deve R$ 114 ao Wesley
- ✅ Saldo líquido: -R$ 81 (ela deve)

## 📁 Arquivos Modificados

- `src/hooks/useSharedFinances.ts` - Query de mirror transactions corrigida

## 🎯 Resultado

Agora a Fran consegue ver todas as transações compartilhadas corretamente, tanto as que ela criou quanto as que o Wesley criou.

---

**Commit:** `de3e9b1` - fix: corrigir query de source_transaction.user_id em useSharedFinances
