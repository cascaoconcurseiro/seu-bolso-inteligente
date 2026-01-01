# 🐛 DEBUG: Extrato Vazio mas Card Mostra Transações

**Data:** 01/01/2026  
**Status:** 🔍 Em investigação

---

## 🐛 PROBLEMA

### Sintoma
- Transação aparece no **card da conta** (página /contas)
- Transação **NÃO aparece** no **extrato detalhado** (página /contas/:id)
- Saldo está correto em ambos

### Evidências
```
Card da Conta (✅ Funciona):
- Mostra "teste" -R$ 10,00
- Mostra "Saldo inicial" +R$ 1.000,00

Extrato Detalhado (❌ Não funciona):
- Mostra "Nenhuma transação nesta conta"
```

---

## 🔍 ANÁLISE

### Diferença entre Card e Extrato

#### Card da Conta (`src/pages/Accounts.tsx`)
```typescript
const { data: allTransactions = [] } = useTransactions();

const getLastTransactions = (accountId: string, limit: number = 3) => {
  return allTransactions
    .filter(t => t.account_id === accountId || t.destination_account_id === accountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};
```

**Características:**
- Usa `useTransactions()` - busca TODAS as transações do usuário
- Filtra no frontend por `account_id` ou `destination_account_id`
- Sem filtro de data
- Funciona ✅

#### Extrato Detalhado (`src/hooks/useAccountStatement.ts`)
```typescript
const { data: outgoingTransactions } = await supabase
  .from("transactions")
  .select(...)
  .eq("account_id", accountId)  // ← Filtro no banco
  .gte("date", effectiveStartDate)  // ← Filtro de data
  .lte("date", effectiveEndDate);
```

**Características:**
- Usa `useAccountStatement()` - busca transações da conta específica
- Filtra no banco por `account_id`
- Filtra por período (mês atual)
- Não funciona ❌

---

## 🔧 CORREÇÃO APLICADA

### 1. Removido Filtro Redundante
```typescript
// ❌ ANTES
.eq("user_id", user.id)  // ← Removido
.eq("account_id", accountId)

// ✅ DEPOIS
.eq("account_id", accountId)  // ← Suficiente
```

### 2. Adicionado Logs de Debug
```typescript
console.log('🔍 [useAccountStatement] Transações encontradas:', {
  accountId,
  outgoingCount: outgoingTransactions?.length || 0,
  outgoing: outgoingTransactions?.map(t => ({ 
    id: t.id, 
    desc: t.description, 
    amount: t.amount 
  }))
});
```

### 3. Forçado Refresh
```typescript
staleTime: 0,  // Sempre buscar dados frescos
refetchOnMount: true,
refetchOnWindowFocus: true,
```

---

## 🧪 TESTES

### Teste 1: Verificar Logs no Console
1. Abrir DevTools (F12)
2. Ir para aba Console
3. Acessar extrato da conta
4. Verificar logs:
   ```
   🔍 [useAccountStatement] Transações encontradas: {...}
   🔍 [useAccountStatement] Transferências de entrada: {...}
   🔍 [useAccountStatement] Após filtro de segurança: {...}
   ```

### Teste 2: Verificar Query no Supabase
```sql
-- Verificar transações da conta
SELECT id, description, amount, account_id, user_id, date
FROM transactions
WHERE account_id = 'sua-conta-id'
ORDER BY date DESC;
```

### Teste 3: Verificar Período
```typescript
// Verificar se transação está no período correto
const effectiveStartDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
const effectiveEndDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

console.log('Período:', { effectiveStartDate, effectiveEndDate });
console.log('Data da transação:', transaction.date);
```

---

## 🎯 POSSÍVEIS CAUSAS

### Causa 1: Cache do React Query ✅ RESOLVIDO
**Problema:** Query estava em cache com dados antigos  
**Solução:** `staleTime: 0` + `refetchOnMount: true`

### Causa 2: Filtro de Data ⚠️ INVESTIGAR
**Problema:** Transação pode estar fora do período (mês atual)  
**Solução:** Verificar se `transaction.date` está entre `startDate` e `endDate`

### Causa 3: Filtro de user_id ✅ RESOLVIDO
**Problema:** Estava filtrando por `user_id` E `account_id`  
**Solução:** Removido filtro de `user_id` da query

### Causa 4: Políticas RLS ⚠️ INVESTIGAR
**Problema:** Políticas RLS podem estar bloqueando  
**Solução:** Verificar políticas na tabela `transactions`

---

## 📝 PRÓXIMOS PASSOS

1. **Verificar Logs**
   - Abrir console do navegador
   - Verificar o que está sendo retornado pela query
   - Confirmar se transações estão sendo filtradas

2. **Verificar Período**
   - Confirmar que transação está no mês atual
   - Se não estiver, navegar para o mês correto

3. **Verificar Políticas RLS**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'transactions';
   ```

4. **Limpar Cache**
   - Recarregar página (Ctrl+Shift+R)
   - Ou limpar cache do navegador

---

## 🔐 SEGURANÇA

### Filtro de Segurança Mantido
```typescript
.filter(tx => tx.user_id === user.id)
```

**Por quê:**
- Políticas RLS já garantem segurança no banco
- Filtro adicional como camada extra
- Previne bugs nas políticas RLS

---

## 📊 COMPARAÇÃO

| Aspecto | Card da Conta | Extrato Detalhado |
|---------|---------------|-------------------|
| Hook | `useTransactions()` | `useAccountStatement()` |
| Filtro | Frontend | Backend (SQL) |
| Período | Sem filtro | Mês atual |
| Cache | 30s | 0s (debug) |
| Status | ✅ Funciona | ❌ Não funciona |

---

## ✅ CHECKLIST

- [x] Correção aplicada no código
- [x] Logs de debug adicionados
- [x] Cache desabilitado temporariamente
- [ ] Logs verificados no console
- [ ] Período verificado
- [ ] Políticas RLS verificadas
- [ ] Problema resolvido

---

**PRÓXIMA AÇÃO:** Verificar logs no console do navegador
