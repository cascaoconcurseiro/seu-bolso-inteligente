# Correção Aplicada: Split do Wesley Marcado como Pago

**Data**: 31/12/2024 13:31 UTC  
**Método**: Supabase Power (MCP)

## Problema Identificado

A Fran pagou a fatura do Wesley (R$ 50,00), mas o split não foi marcado como pago no banco de dados.

### Dados Encontrados

**Transação Original:**
- ID: `8b752657-60cd-4654-8783-a6fc2d84d52f`
- Descrição: "teste compartilhado"
- Valor: R$ 100,00
- Data: 31/12/2025
- Criador: Wesley (user_id: `56ccd60b-641f-4265-bc17-7b8705a2f8c9`)

**Split Problemático:**
- ID: `46db4140-5bda-429d-887f-0412198be2cf`
- Membro: Fran (member_id: `5c4a4fb5-ccc9-440f-912e-9e81731aa7ab`)
- User ID: `9545d0c1-94be-4b69-b110-f939bce072ee`
- Valor: R$ 50,00
- Status ANTES: `is_settled = false`
- settled_at ANTES: `NULL`
- settled_transaction_id ANTES: `NULL`

**Transação de Acerto:**
- ID: `fc3060a3-8388-4ee8-a2b6-2b929b16a7bf`
- Descrição: "Pagamento Acerto - Wesley"
- Valor: R$ 50,00
- Data: 31/12/2025
- Tipo: EXPENSE
- Domain: SHARED

## Correção Aplicada

Executado SQL via Supabase MCP:

```sql
UPDATE transaction_splits 
SET 
  is_settled = TRUE,
  settled_at = NOW(),
  settled_transaction_id = 'fc3060a3-8388-4ee8-a2b6-2b929b16a7bf'
WHERE id = '46db4140-5bda-429d-887f-0412198be2cf'
RETURNING id, is_settled, settled_at, settled_transaction_id;
```

### Resultado

**Split Corrigido:**
- ID: `46db4140-5bda-429d-887f-0412198be2cf`
- Status DEPOIS: `is_settled = true` ✅
- settled_at DEPOIS: `2025-12-31 13:31:40.622045+00` ✅
- settled_transaction_id DEPOIS: `fc3060a3-8388-4ee8-a2b6-2b929b16a7bf` ✅

## Verificação

Executado SQL de verificação:

```sql
SELECT 
  t.id as transaction_id,
  t.description,
  t.amount,
  t.date,
  ts.id as split_id,
  fm.name as member_name,
  ts.amount as split_amount,
  ts.is_settled,
  ts.settled_at,
  ts.settled_transaction_id
FROM transactions t
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE t.description LIKE '%teste compartilhado%'
ORDER BY t.created_at DESC;
```

**Resultado da Verificação:**
- ✅ Split marcado como `is_settled = true`
- ✅ `settled_at` preenchido com timestamp
- ✅ `settled_transaction_id` vinculado à transação de acerto

## Impacto na UI

Após a correção, o item deve:
1. ✅ Desaparecer da aba "Regular" (não está mais pendente)
2. ✅ Aparecer na aba "Histórico" (está marcado como pago)
3. ✅ Mostrar o ícone de "pago" (CheckCircle2)

## Observações

### Problema de Duplicidade de Membros

Durante a investigação, foi identificado que há membros duplicados:
- **Fran**: 2 registros com o mesmo `linked_user_id`
  - ID: `5c4a4fb5-ccc9-440f-912e-9e81731aa7ab`
  - ID: `011cf81d-9708-4143-b8b9-d282d0012f2d`
- **Wesley**: 2 registros com o mesmo `linked_user_id`
  - ID: `7ba0b663-7ecc-41e9-a840-4cb729f0dac1`
  - ID: `90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44`

**Recomendação**: Limpar membros duplicados para evitar problemas futuros.

### Correção de Código Aplicada

Além da correção manual no banco, o código foi corrigido em `src/pages/SharedExpenses.tsx`:
- ✅ Adicionados logs detalhados
- ✅ Corrigida lógica de update para DEBIT (agora atualiza o split)
- ✅ Adicionada validação pré-update
- ✅ Melhoradas mensagens de erro

## Próximos Passos

1. ✅ Correção manual aplicada no banco de dados
2. ✅ Código corrigido para prevenir o problema no futuro
3. ⏳ Testar novamente o fluxo de pagamento
4. ⏳ Limpar membros duplicados
5. ⏳ Verificar se há outros splits com o mesmo problema

## Comandos para Verificar Outros Splits Problemáticos

```sql
-- Buscar splits não marcados como pagos mas com transação de acerto
SELECT 
  ts.id as split_id,
  t.description,
  fm.name as member_name,
  ts.amount,
  ts.is_settled,
  ts.settled_transaction_id
FROM transaction_splits ts
JOIN transactions t ON t.id = ts.transaction_id
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.is_settled = false
  AND EXISTS (
    SELECT 1 FROM transactions acerto
    WHERE acerto.description LIKE '%Acerto%'
      AND acerto.related_member_id = ts.member_id
      AND acerto.date >= t.date
  )
ORDER BY t.date DESC;
```

## Conclusão

✅ **Problema resolvido com sucesso!**

O split foi marcado como pago manualmente no banco de dados e o código foi corrigido para prevenir o problema no futuro. A Fran agora deve ver o item no histórico e não mais na lista de pendentes.
