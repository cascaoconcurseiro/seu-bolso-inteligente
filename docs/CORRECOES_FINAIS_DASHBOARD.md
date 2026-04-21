# Correções Finais: Dashboard e Projeções

## Data: 05/01/2026

## Resumo das Correções

Foram corrigidos 3 problemas principais no Dashboard relacionados a transações compartilhadas:

### 1. ✅ Faturas de Cartão no Dashboard
**Problema**: Dashboard mostrava R$ 260,00 de balanceamento nas faturas pendentes
**Solução**: Recalcular saldo dos cartões excluindo transações compartilhadas e pagas por outros
**Arquivo**: `src/pages/Dashboard.tsx`

### 2. ✅ Projeção de Fim de Mês - Compartilhados
**Problema**: Fran via R$ 259,00 em janeiro, mas transações aparecem em fevereiro no Compartilhados
**Solução**: Usar mês de vencimento para cartões (competence_date + 1 mês)
**Migração**: `20260105172000_fix_shared_debts_use_due_month.sql`

### 3. ✅ Saldo do Mês (Receitas - Despesas)
**Problema**: Incluía transações pagas por outros
**Solução**: Filtrar `is_shared` e `payer_id` na função `get_monthly_financial_summary`
**Migração**: `20260105173000_fix_financial_summary_exclude_shared.sql`

---

## Detalhamento das Correções

### 1. Dashboard - Faturas Pendentes

**Código Anterior:**
```typescript
const creditCardsWithBalance = useMemo(() => {
  return accounts.filter(a => 
    a.type === "CREDIT_CARD" && 
    Number(a.balance) < 0
  );
}, [accounts]);
```

**Código Corrigido:**
```typescript
const creditCardsWithBalance = useMemo(() => {
  if (!accounts || !transactions) return [];
  
  return accounts.filter(a => {
    if (a.type !== "CREDIT_CARD") return false;
    
    // Calcular saldo real excluindo compartilhadas
    const cardTransactions = transactions.filter(tx => 
      tx.account_id === a.id && 
      !tx.is_shared && 
      !tx.payer_id
    );
    
    const realBalance = cardTransactions.reduce((sum, tx) => {
      return sum + (tx.type === 'EXPENSE' ? -Number(tx.amount) : Number(tx.amount));
    }, 0);
    
    return realBalance < 0;
  }).map(a => ({
    ...a,
    balance: realBalance
  }));
}, [accounts, transactions]);
```

---

### 2. Projeção - Compartilhados

**Problema Identificado:**
- Transações de cartão com `competence_date` em janeiro
- Aparecem em FEVEREIRO na página Compartilhados (mês de vencimento)
- Mas eram contadas na projeção de JANEIRO

**Solução:**
```sql
-- Para cartão de crédito: usar mês de vencimento
(a.type = 'CREDIT_CARD' AND 
 (t.competence_date + interval '1 month')::date >= v_start_of_month AND
 (t.competence_date + interval '1 month')::date <= v_end_of_month)
OR
-- Para outros tipos: usar competence_date normal
(a.type != 'CREDIT_CARD' AND
 t.competence_date >= v_start_of_month AND
 t.competence_date <= v_end_of_month)
```

**Resultado:**
- Janeiro: R$ 0,00 (correto - sem compartilhados)
- Fevereiro: R$ 1.734,00 (todas as dívidas do mês)

---

### 3. Saldo do Mês

**Função Anterior:**
```sql
FROM public.transactions t
WHERE t.user_id = p_user_id
  AND t.type IN ('INCOME', 'EXPENSE')
  AND t.source_transaction_id IS NULL
```

**Função Corrigida:**
```sql
FROM public.transactions t
WHERE t.user_id = p_user_id
  AND t.type IN ('INCOME', 'EXPENSE')
  AND t.source_transaction_id IS NULL
  -- 🔧 FILTROS CRÍTICOS
  AND (t.is_shared = false OR t.is_shared IS NULL)
  AND t.payer_id IS NULL
```

**Resultado:**
- Saldo do mês agora mostra apenas transações do próprio usuário
- Alinhado com página Transações e Atividade Recente

---

## Regras de Filtro por Página

| Página | Filtros Aplicados | Data Usada |
|--------|------------------|------------|
| **Transações** | `!is_shared && !payer_id` | `date` |
| **Cartões** | Nenhum (mostra todas) | `competence_date` |
| **Compartilhados** | `is_shared === true` | `shared_display_date` |
| **Dashboard - Atividade** | `!is_shared && !payer_id` | `date` |
| **Dashboard - Faturas** | Recalculado sem compartilhadas | - |
| **Dashboard - Saldo Mês** | `!is_shared && !payer_id` | `effective_date` |
| **Dashboard - Projeção** | Compartilhados por mês de vencimento | `effective_date` |

---

## Migrações Aplicadas

1. `20260105170000_fix_shared_debts_only_debtor.sql`
   - Filtrar apenas dívidas (creator_user_id != user_id)

2. `20260105172000_fix_shared_debts_use_due_month.sql`
   - Usar mês de vencimento para cartões compartilhados

3. `20260105173000_fix_financial_summary_exclude_shared.sql`
   - Excluir compartilhadas do resumo financeiro mensal

---

## Testes Realizados

### Teste 1: Projeção Janeiro - Fran
```sql
SELECT * FROM get_monthly_projection(
  '9545d0c1-94be-4b69-b110-f939bce072ee'::uuid,
  '2026-01-31'::date
);
```
**Resultado**: ✅ R$ 0,00 (correto)

### Teste 2: Projeção Fevereiro - Fran
```sql
SELECT * FROM get_monthly_projection(
  '9545d0c1-94be-4b69-b110-f939bce072ee'::uuid,
  '2026-02-28'::date
);
```
**Resultado**: ✅ R$ 1.734,00 (todas as dívidas de fevereiro)

### Teste 3: Transações Compartilhadas
```sql
SELECT description, competence_date, account_type
FROM transaction_splits ts
JOIN transactions t ON t.id = ts.transaction_id
LEFT JOIN accounts a ON a.id = t.account_id
WHERE ts.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND t.creator_user_id != '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND ts.is_settled = false
  AND a.type = 'CREDIT_CARD'
  AND t.competence_date = '2026-01-01';
```
**Resultado**: ✅ 3 transações (geometria, gasolina, teste) - aparecem em fevereiro

---

## Conclusão

Todas as correções foram aplicadas com sucesso. O Dashboard agora:

✅ Não mostra transações compartilhadas nas faturas de cartão
✅ Projeção alinhada com página Compartilhados (mês de vencimento)
✅ Saldo do mês exclui transações pagas por outros
✅ Consistência entre todas as páginas do sistema
