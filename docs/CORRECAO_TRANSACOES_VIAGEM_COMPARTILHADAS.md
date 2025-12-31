# Correção: Transações Compartilhadas em Viagens

**Data**: 31/12/2025  
**Status**: ✅ Concluído

## Problema Identificado

Quando uma despesa compartilhada era paga em uma viagem, ela:
- ❌ NÃO aparecia nos gastos da viagem
- ❌ NÃO descontava do orçamento da viagem
- ❌ NÃO era contabilizada no total da viagem

**Causa Raiz**: O hook `useTripTransactions` estava filtrando apenas transações do usuário atual (`user_id = current_user`), excluindo despesas compartilhadas pagas por outros participantes.

## Solução Implementada

### Arquivo Modificado
`src/hooks/useTrips.ts` - Hook `useTripTransactions`

### Mudança Aplicada

**ANTES** (Incorreto):
```typescript
// Buscar apenas transações do usuário atual nesta viagem
const { data, error } = await supabase
  .from("transactions")
  .select(`...`)
  .eq("trip_id", tripId)
  .eq("user_id", user.id) // ❌ Filtrava apenas minhas transações
  .is("source_transaction_id", null)
  .order("date", { ascending: false });
```

**DEPOIS** (Correto):
```typescript
// Buscar TODAS as transações desta viagem
// Inclui transações de todos os participantes (despesas compartilhadas)
const { data, error } = await supabase
  .from("transactions")
  .select(`...`)
  .eq("trip_id", tripId)
  // ✅ Removido filtro .eq("user_id", user.id)
  .is("source_transaction_id", null) // Excluir apenas transações espelho
  .order("date", { ascending: false });
```

## Lógica Corrigida

### Transações que DEVEM aparecer na viagem:
1. ✅ Minhas transações pessoais na viagem
2. ✅ Despesas compartilhadas que EU paguei
3. ✅ Despesas compartilhadas que OUTROS participantes pagaram
4. ✅ Qualquer transação com `trip_id` definido

### Transações que NÃO devem aparecer:
1. ❌ Transações espelho (`source_transaction_id` não nulo)
2. ❌ Transações de outras viagens
3. ❌ Transações sem `trip_id`

## Funções do Banco de Dados (Já Corretas)

As funções RPC já estavam corretas e não precisaram de alteração:

### `calculate_trip_spent(p_trip_id, p_user_id)`
```sql
SELECT COALESCE(SUM(amount), 0) INTO v_spent
FROM public.transactions
WHERE trip_id = p_trip_id
  AND type = 'EXPENSE'
  AND source_transaction_id IS NULL -- Excluir transações espelhadas
  AND (p_user_id IS NULL OR user_id = p_user_id);
```

- Quando `p_user_id` é NULL: soma TODAS as transações da viagem
- Quando `p_user_id` é fornecido: soma apenas transações daquele usuário

### `get_trip_financial_summary(p_trip_id)`
```sql
SELECT 
  t.budget AS total_budget,
  public.calculate_trip_spent(p_trip_id) AS total_spent, -- Sem filtro de usuário
  COALESCE(t.budget, 0) - public.calculate_trip_spent(p_trip_id) AS remaining,
  ...
```

- Usa `calculate_trip_spent` SEM filtro de usuário
- Calcula corretamente o total gasto por TODOS os participantes

## Comportamento Esperado Após Correção

### Cenário 1: Despesa Pessoal
- Usuário A cria despesa de $50 na viagem
- ✅ Aparece na lista de gastos da viagem
- ✅ Desconta do orçamento da viagem
- ✅ Contabilizada no total

### Cenário 2: Despesa Compartilhada (Eu Paguei)
- Usuário A paga $100 e divide com Usuário B
- ✅ Aparece na lista de gastos da viagem
- ✅ Desconta $100 do orçamento da viagem
- ✅ Contabilizada no total
- ✅ Split de $50 para Usuário B registrado

### Cenário 3: Despesa Compartilhada (Outro Pagou)
- Usuário B paga $80 e divide com Usuário A
- ✅ Aparece na lista de gastos da viagem (CORRIGIDO!)
- ✅ Desconta $80 do orçamento da viagem (CORRIGIDO!)
- ✅ Contabilizada no total (CORRIGIDO!)
- ✅ Split de $40 para Usuário A registrado

## Testes Recomendados

### Teste 1: Despesa Compartilhada na Viagem
1. ✅ Criar viagem com 2 participantes
2. ✅ Participante A paga despesa de $100 e divide com B
3. ✅ Verificar que aparece nos gastos da viagem
4. ✅ Verificar que desconta do orçamento
5. ✅ Verificar que total da viagem = $100

### Teste 2: Múltiplas Despesas Compartilhadas
1. ✅ Participante A paga $50 e divide
2. ✅ Participante B paga $30 e divide
3. ✅ Verificar que ambas aparecem
4. ✅ Verificar que total = $80

### Teste 3: Orçamento da Viagem
1. ✅ Criar viagem com orçamento de $500
2. ✅ Adicionar despesas compartilhadas totalizando $200
3. ✅ Verificar que saldo restante = $300
4. ✅ Verificar que percentual usado = 40%

## Impacto

### Positivo
- ✅ Visibilidade completa de todos os gastos da viagem
- ✅ Orçamento da viagem reflete realidade
- ✅ Participantes veem todas as despesas compartilhadas
- ✅ Cálculos financeiros corretos

### Sem Impacto Negativo
- ✅ Transações espelho continuam excluídas
- ✅ Privacidade mantida (cada usuário vê apenas suas próprias contas)
- ✅ Splits continuam funcionando corretamente

## Notas Técnicas

### Single Source of Truth
O sistema usa as funções RPC do banco de dados como fonte única de verdade:
- `calculate_trip_spent()` - Calcula total gasto
- `get_trip_financial_summary()` - Resumo financeiro completo

### Transações Espelho
Transações espelho (`source_transaction_id` não nulo) são sempre excluídas:
- Criadas automaticamente para transferências entre contas
- Não devem ser contabilizadas duas vezes
- Filtro mantido em todas as queries

### Permissões
- Todos os participantes da viagem veem todas as transações
- Apenas o criador da transação pode editá-la ou excluí-la
- Orçamento da viagem é compartilhado entre todos
