# Correções Urgentes - Sincronização de Transações Compartilhadas

**Data**: 04/01/2026  
**Prioridade**: CRÍTICA

## Problema Identificado

As transações compartilhadas não estão sincronizadas entre as páginas:

### Cenário Atual (ERRADO):
1. **Fevereiro/Transações**: 11 transações aparecem como "Dividido" + "Você pagou" (verde)
2. **Janeiro/Transações**: Settlements aparecem como CRÉDITO (correto)
3. **Compartilhados**: Transações aparecem como "PAGO" ✅ (correto)
4. **Problema**: As transações de fevereiro NÃO mostram que foram pagas

### Cenário Esperado (CORRETO):
1. **Fevereiro/Transações**: 11 transações devem aparecer como "Acertado" ✅
2. **Janeiro/Transações**: Settlements aparecem como CRÉDITO
3. **Compartilhados**: Transações aparecem como "PAGO" ✅
4. **Sincronização**: Todas as páginas mostram o mesmo status

## Causa Raiz

As transações na página "Transações" não verificam o status dos `transaction_splits` para determinar se foram pagas.

## Solução

### 1. Adicionar campo `transaction_splits` na query do useTransactions

```typescript
// src/hooks/useTransactions.ts
let query = supabase
  .from("transactions")
  .select(`
    *,
    account:accounts!transactions_account_id_fkey(id, name, currency),
    category:categories(id, name, icon),
    transaction_splits:transaction_splits!transaction_splits_transaction_id_fkey(
      id,
      member_id,
      user_id,
      percentage,
      amount,
      is_settled,
      settled_at,
      settled_transaction_id,
      name
    )
  `)
```

### 2. Atualizar função `isFullySettled` para verificar corretamente

```typescript
// src/pages/Transactions.tsx
const isFullySettled = (transaction: any) => {
  if (!transaction.is_shared || !transaction.transaction_splits) return false;
  if (transaction.transaction_splits.length === 0) return false;
  return transaction.transaction_splits.every((s: any) => s.is_settled === true);
};
```

### 3. Atualizar função `hasPendingSplits` para verificar corretamente

```typescript
// src/pages/Transactions.tsx
const hasPendingSplits = (transaction: any) => {
  if (!transaction.is_shared || !transaction.transaction_splits) return false;
  return transaction.transaction_splits.some((s: any) => s.is_settled === false);
};
```

### 4. Garantir que o badge de status apareça corretamente

O código já existe, mas precisa dos dados corretos dos splits:

```typescript
{transaction.is_shared && (
  <>
    <span>·</span>
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium",
      settled 
        ? "bg-positive/10 text-positive" 
        : pending 
          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
          : "bg-muted"
    )}>
      {settled ? (
        <><CheckCircle className="h-3 w-3" /> Acertado</>
      ) : pending ? (
        <><Clock className="h-3 w-3" /> Pendente</>
      ) : (
        <><Users className="h-3 w-3" /> Dividido</>
      )}
    </span>
  </>
)}
```

## Teste de Validação

Após aplicar as correções:

1. ✅ Pagar uma transação em Compartilhados
2. ✅ Verificar que aparece como "Acertado" em Transações
3. ✅ Desfazer o pagamento em Compartilhados
4. ✅ Verificar que volta para "Pendente" em Transações
5. ✅ Verificar que o saldo da conta está correto
6. ✅ Verificar que não há duplicidade de valores

## Impacto

- **Crítico**: Sem essa correção, o usuário pode pagar duas vezes a mesma transação
- **Contabilidade**: Os valores não fecham corretamente
- **UX**: Usuário não sabe o que foi pago ou não

## Próximos Passos

1. Aplicar correção no `useTransactions.ts`
2. Testar em desenvolvimento
3. Deploy em produção
4. Validar com usuário
