# Trip Budget Privacy & Personal Ownership - Spec

## 🎯 Objetivo

Corrigir o sistema de orçamentos de viagens para garantir **privacidade total** e **ownership pessoal**. Cada usuário deve ver apenas SEU orçamento, nunca o de outros participantes.

## 🚨 Problema Atual

1. **Vazamento de Privacidade**: Lista de viagens mostra orçamento do criador para todos
2. **Confusão de Ownership**: UI sugere "orçamento da viagem" (compartilhado) em vez de pessoal
3. **Fonte Inconsistente**: Código usa `trips.budget` em vez de `trip_participants.personal_budget`
4. **Agregação Indevida**: Sistema tenta somar/calcular orçamentos de múltiplos usuários

## ✅ Solução

### Regra de Negócio Fundamental

> **TODO orçamento em viagens é PESSOAL. Não existe orçamento compartilhado visível.**

### Princípios

1. **Single Source of Truth**: `trip_participants.personal_budget` é a ÚNICA fonte
2. **Database-Level Privacy**: RLS garante que ninguém vê orçamento de outros
3. **Clear Ownership**: UI usa linguagem de primeira pessoa ("Meu", "Meus")
4. **No Aggregation**: Nunca somar, calcular média ou expor múltiplos orçamentos
5. **One-Time Setup**: Modal de orçamento aparece uma vez, depois pode atualizar manualmente

## 📋 Documentos

- **[requirements.md](./requirements.md)**: 10 requirements com EARS patterns
- **[design.md](./design.md)**: Design técnico completo com 8 correctness properties
- **[tasks.md](./tasks.md)**: 11 tasks de implementação

## 🔧 Mudanças Principais

### 1. Database

```sql
-- Garantir que personal_budget seja positivo
ALTER TABLE trip_participants
ADD CONSTRAINT personal_budget_positive CHECK (personal_budget >= 0);

-- Eventualmente tornar NOT NULL
ALTER TABLE trip_participants
ALTER COLUMN personal_budget SET NOT NULL;
```

### 2. Query de Listagem

**Antes (ERRADO)**:
```typescript
const { data: trips } = await supabase
  .from("trips")
  .select("*, budget"); // ❌ Mostra orçamento do criador
```

**Depois (CORRETO)**:
```typescript
const { data: trips } = await supabase
  .from("trips")
  .select(`
    *,
    trip_participants!inner(personal_budget)
  `)
  .eq("trip_participants.user_id", user.id); // ✅ Apenas meu orçamento
```

### 3. UI Labels

**Antes (ERRADO)**:
- "Orçamento da viagem"
- "Orçamento total"
- "Gastos da viagem"

**Depois (CORRETO)**:
- "Meu Orçamento"
- "Meus Gastos"
- "Me restam"

### 4. Cálculo de Progresso

**Antes (ERRADO)**:
```typescript
const totalExpenses = expenses.reduce(...); // ❌ Todos os gastos
const progress = totalExpenses / trip.budget; // ❌ Orçamento do criador
```

**Depois (CORRETO)**:
```typescript
const myExpenses = expenses.filter(e => e.user_id === user.id); // ✅ Só meus gastos
const myTotal = myExpenses.reduce(...);
const progress = myTotal / myPersonalBudget; // ✅ Meu orçamento
```

## 🎨 Exemplos de UX

### Lista de Viagens

```
┌─────────────────────────────────┐
│ 🏖️ Viagem para Bahia            │
│                                 │
│ 15-20 Dez 2024                  │
│                                 │
│ R$ 2.500,00                     │
│ Meu Orçamento                   │ ← Primeira pessoa
└─────────────────────────────────┘
```

### Detalhe da Viagem

```
┌─────────────────────────────────┐
│ Meu Orçamento                   │ ← Primeira pessoa
│ R$ 2.500,00                     │
│                                 │
│ Meus Gastos                     │ ← Primeira pessoa
│ R$ 1.200,00 (48%)               │
│                                 │
│ Me restam: R$ 1.300,00          │ ← Primeira pessoa
└─────────────────────────────────┘
```

## 🧪 Testes

### Property Tests (8)

1. **Budget Privacy Isolation**: Usuários não veem orçamento de outros
2. **Single Source Consistency**: Sempre usa `personal_budget`
3. **Modal Idempotency**: Modal aparece uma vez
4. **Expense Attribution Isolation**: Gastos não afetam outros
5. **UI Language Consistency**: Sempre primeira pessoa
6. **RLS Enforcement**: Database filtra budgets
7. **Budget Positivity**: Orçamento > 0
8. **Itinerary Privacy**: Roteiro é privado

### Unit Tests

- Query transformation
- Budget calculation
- Expense filtering
- Validation logic
- Modal behavior

## 📊 Impacto

### Antes (Problemas)

- ❌ Usuário A vê orçamento do usuário B
- ❌ UI confusa sobre ownership
- ❌ Dados inconsistentes (trips.budget vs personal_budget)
- ❌ Violação de privacidade

### Depois (Benefícios)

- ✅ Privacidade total garantida
- ✅ UI clara sobre ownership pessoal
- ✅ Fonte única de dados
- ✅ Conformidade com LGPD/GDPR

## 🚀 Próximos Passos

1. **Revisar Requirements**: Ler [requirements.md](./requirements.md)
2. **Revisar Design**: Ler [design.md](./design.md)
3. **Executar Tasks**: Seguir [tasks.md](./tasks.md)
4. **Testar**: Executar property tests e unit tests
5. **Deploy**: Aplicar em produção

## 📞 Dúvidas?

- **Requirements**: Consultar [requirements.md](./requirements.md)
- **Design Técnico**: Consultar [design.md](./design.md)
- **Implementação**: Consultar [tasks.md](./tasks.md)

---

**Status**: ✅ Spec Completa  
**Prioridade**: 🔴 CRÍTICO (Privacidade)  
**Complexidade**: 🟡 MÉDIA  
**Impacto**: 🟢 ALTO (Positivo)
