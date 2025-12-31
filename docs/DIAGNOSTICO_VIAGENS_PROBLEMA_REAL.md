# 🔍 DIAGNÓSTICO: Por Que Viagens Não Aparecem

## 🎯 PROBLEMA REAL IDENTIFICADO

Usei o Supabase Power para investigar o banco de dados e descobri o problema real:

### ❌ Problema 1: Tabela `trip_participants` Vazia
```sql
SELECT * FROM trip_participants;
-- Resultado: [] (vazio)
```

A viagem existe, mas não tem participantes registrados em `trip_participants`.

### ❌ Problema 2: Campo `personal_budget` Não Existe
A tabela `trip_participants` NÃO tem o campo `personal_budget`. 

**Estrutura Real**:
- `trip_participants`: id, trip_id, member_id, user_id, role, created_at
- `trip_participant_budgets`: id, trip_id, user_id, budget, created_at, updated_at

### ❌ Problema 3: Código Buscava de Tabela Errada
O código estava tentando buscar `personal_budget` de `trip_participants`, mas esse campo está em `trip_participant_budgets`.

---

## ✅ SOLUÇÃO IMPLEMENTADA

### Mudança no `useTrips.ts`

**ANTES** (Errado):
```typescript
// Buscava de trip_participants (que está vazia)
.from("trip_participants")
.select("personal_budget, trip_id, trips(...)")
```

**DEPOIS** (Correto):
```typescript
// 1. Busca viagens do usuário
.from("trips")
.select("*")
.eq("user_id", user.id)

// 2. Busca orçamentos de trip_participant_budgets
.from("trip_participant_budgets")
.select("trip_id, budget")
.eq("user_id", user.id)

// 3. Combina os dados
return trips.map(trip => ({
  ...trip,
  my_personal_budget: budgetMap.get(trip.id) || null,
}))
```

---

## 🗄️ ESTRUTURA DO BANCO (REAL)

### Tabela: `trips`
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- Owner da viagem
  name TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'PLANNED',
  ...
);
```

### Tabela: `trip_participants` (VAZIA)
```sql
CREATE TABLE trip_participants (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  member_id UUID,
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ
);
-- ❌ NÃO TEM personal_budget
```

### Tabela: `trip_participant_budgets`
```sql
CREATE TABLE trip_participant_budgets (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  user_id UUID REFERENCES auth.users(id),
  budget NUMERIC DEFAULT 0,  -- ✅ Orçamento pessoal está AQUI
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🔧 POR QUE ESTAVA FALHANDO

1. **Viagem criada**: ✅ Existe em `trips`
2. **Participante adicionado**: ❌ NÃO existe em `trip_participants`
3. **Orçamento definido**: ❌ NÃO existe em `trip_participant_budgets`
4. **Código buscava**: `trip_participants.personal_budget` (campo inexistente)
5. **Resultado**: Nenhuma viagem retornada

---

## ✅ COMO FUNCIONA AGORA

### Fluxo Correto

1. **Buscar viagens do usuário**:
   ```sql
   SELECT * FROM trips WHERE user_id = 'USER_ID';
   ```

2. **Buscar orçamentos pessoais**:
   ```sql
   SELECT trip_id, budget 
   FROM trip_participant_budgets 
   WHERE user_id = 'USER_ID' 
   AND trip_id IN ('TRIP_IDS');
   ```

3. **Combinar dados**:
   ```typescript
   trips.map(trip => ({
     ...trip,
     my_personal_budget: budgetMap.get(trip.id) || null
   }))
   ```

---

## 🧪 TESTE NO BANCO

### Verificar Viagens
```sql
SELECT id, name, user_id, created_at 
FROM trips 
WHERE user_id = auth.uid();
```

### Verificar Participantes
```sql
SELECT * FROM trip_participants 
WHERE trip_id = 'TRIP_ID';
```

### Verificar Orçamentos
```sql
SELECT * FROM trip_participant_budgets 
WHERE trip_id = 'TRIP_ID' AND user_id = auth.uid();
```

---

## 📝 PRÓXIMOS PASSOS

### 1. Testar Agora
- Limpe o cache: Ctrl+Shift+R
- Acesse a página de Viagens
- ✅ Viagens devem aparecer agora

### 2. Adicionar Participante (Opcional)
Se quiser adicionar participantes:
```sql
INSERT INTO trip_participants (trip_id, user_id, role)
VALUES ('TRIP_ID', 'USER_ID', 'OWNER');
```

### 3. Definir Orçamento (Opcional)
Se quiser definir orçamento pessoal:
```sql
INSERT INTO trip_participant_budgets (trip_id, user_id, budget)
VALUES ('TRIP_ID', 'USER_ID', 1000.00);
```

---

## 🎯 RESUMO

**Problema**: Código buscava de tabela errada (`trip_participants`) que estava vazia e não tinha o campo `personal_budget`.

**Solução**: Buscar viagens de `trips` (onde o usuário é owner) e orçamentos de `trip_participant_budgets`.

**Status**: ✅ CORRIGIDO

---

**Data**: 27/12/2024 - 23:15  
**Investigação**: Supabase Power  
**Arquivo Corrigido**: `src/hooks/useTrips.ts`
