# Design Document

## Overview

Este design corrige o sistema de viagens para funcionar de forma confiável, seguindo os mesmos padrões do sistema de compartilhamento de transações que já funciona perfeitamente. O problema principal é que o trigger `add_trip_owner()` está causando erro de chave duplicada, e as políticas RLS não estão permitindo que as viagens apareçam para os usuários.

A solução envolve:
1. Adicionar `ON CONFLICT DO NOTHING` no trigger para evitar erros de duplicação
2. Simplificar as políticas RLS para serem mais diretas
3. Remover código frontend que tenta inserir manualmente
4. Limpar triggers e scripts obsoletos
5. Criar script de validação de integridade

## Architecture

### Fluxo de Criação de Viagem

```
1. Usuário cria viagem via frontend
   ↓
2. INSERT em trips (owner_id = user.id)
   ↓
3. Trigger add_trip_owner() executa automaticamente
   ↓
4. INSERT em trip_members (trip_id, user_id, role='owner') ON CONFLICT DO NOTHING
   ↓
5. Query de viagens retorna a viagem criada
   ↓
6. Frontend exibe a viagem
```

### Fluxo de Convite

```
1. Owner cria convite via frontend
   ↓
2. INSERT em trip_invitations (trip_id, inviter_id, invitee_id)
   ↓
3. Invitee aceita convite
   ↓
4. UPDATE trip_invitations SET status='accepted'
   ↓
5. Trigger handle_trip_invitation_accepted() executa
   ↓
6. INSERT em trip_members (trip_id, user_id, role='member') ON CONFLICT DO NOTHING
   ↓
7. Query de viagens retorna a viagem para o novo membro
```

### Comparação com Sistema de Compartilhamento

| Aspecto | Compartilhamento (Funciona) | Viagens (Atual) | Viagens (Proposto) |
|---------|----------------------------|-----------------|-------------------|
| Adicionar owner | Via trigger em family_invitations | Via trigger em trips | Via trigger em trips com ON CONFLICT |
| Adicionar membros | Via trigger em family_invitations | Via trigger em trip_invitations | Via trigger em trip_invitations com ON CONFLICT |
| RLS SELECT | Verifica family_members | Verifica trip_members | Verifica trip_members (simplificado) |
| Espelhamento | Automático via trigger | N/A | N/A |
| Inserção manual | Não há | Comentado no código | Removido completamente |

## Components and Interfaces

### 1. Trigger: add_trip_owner()

**Responsabilidade:** Adicionar automaticamente o criador da viagem como owner em trip_members

**Implementação:**
```sql
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adicionar o criador da viagem como owner
  -- ON CONFLICT DO NOTHING evita erro se já existir
  INSERT INTO trip_members (
    trip_id, 
    user_id, 
    role, 
    can_edit_details, 
    can_manage_expenses
  )
  VALUES (
    NEW.id, 
    NEW.owner_id, 
    'owner', 
    true, 
    true
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

**Mudanças:**
- Adicionar `ON CONFLICT (trip_id, user_id) DO NOTHING` para evitar erro de chave duplicada
- Manter SECURITY DEFINER para executar com privilégios do sistema

### 2. Trigger: handle_trip_invitation_accepted()

**Responsabilidade:** Adicionar membro em trip_members quando convite é aceito

**Implementação:**
```sql
CREATE OR REPLACE FUNCTION handle_trip_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas processar se foi aceito
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Adicionar como membro da viagem
    -- ON CONFLICT DO NOTHING evita erro se já existir
    INSERT INTO trip_members (
      trip_id,
      user_id,
      role,
      can_edit_details,
      can_manage_expenses
    )
    VALUES (
      NEW.trip_id,
      NEW.invitee_id,
      'member',
      false,
      true
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    
    -- Atualizar timestamp de resposta
    NEW.responded_at := NOW();
  END IF;
  
  -- Se rejeitado, apenas atualizar timestamp
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Mudanças:**
- Já tem `ON CONFLICT DO NOTHING` - manter como está
- Verificar se está funcionando corretamente

### 3. RLS Policy: trips SELECT

**Responsabilidade:** Permitir que usuários vejam viagens das quais são membros

**Implementação Atual (Problemática):**
```sql
CREATE POLICY "Users can view own trips and shared trips"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );
```

**Implementação Proposta (Simplificada):**
```sql
DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trips.id 
      AND tm.user_id = auth.uid()
    )
  );
```

**Mudanças:**
- Remover verificação redundante de `owner_id = auth.uid()` (já está em trip_members)
- Usar EXISTS ao invés de IN para melhor performance
- Usar alias `tm` para evitar ambiguidade
- Simplificar lógica: se está em trip_members, pode ver

### 4. Frontend: useCreateTrip Hook

**Responsabilidade:** Criar viagem e confiar no trigger para adicionar owner

**Implementação Atual:**
```typescript
const { data, error } = await supabase
  .from("trips")
  .insert({
    owner_id: user.id,
    ...tripData,
  })
  .select()
  .single();

if (error) throw error;

// Trigger 'trg_add_trip_owner' no banco já adiciona o criador como owner automaticamente.
// Não precisamos inserir manualmente em trip_members aqui.
```

**Implementação Proposta:**
```typescript
const { data, error } = await supabase
  .from("trips")
  .insert({
    owner_id: user.id,
    ...tripData,
  })
  .select()
  .single();

if (error) throw error;

// Owner é adicionado automaticamente via trigger add_trip_owner()
```

**Mudanças:**
- Remover comentário longo
- Simplificar comentário
- Manter confiança no trigger

### 5. Frontend: useTrips Hook

**Responsabilidade:** Buscar viagens do usuário

**Implementação Atual:**
```typescript
// Buscar IDs das viagens onde o usuário é membro
const { data: memberTrips, error: memberError } = await supabase
  .from("trip_members")
  .select("trip_id")
  .eq("user_id", user.id);

if (memberError) throw memberError;

if (!memberTrips || memberTrips.length === 0) return [];

const tripIds = memberTrips.map(m => m.trip_id);

// Buscar as viagens completas
const { data, error } = await supabase
  .from("trips")
  .select("*")
  .in("id", tripIds)
  .order("start_date", { ascending: false });
```

**Implementação Proposta (Simplificada):**
```typescript
// Buscar viagens diretamente - RLS cuida do filtro
const { data, error } = await supabase
  .from("trips")
  .select("*")
  .order("start_date", { ascending: false });

if (error) throw error;
return data as Trip[];
```

**Mudanças:**
- Remover query intermediária em trip_members
- Confiar na política RLS para filtrar
- Simplificar código
- Melhor performance (uma query ao invés de duas)

## Data Models

### trip_members

```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  can_edit_details BOOLEAN DEFAULT false,
  can_manage_expenses BOOLEAN DEFAULT true,
  personal_budget NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id) -- Esta constraint é essencial
);
```

**Invariantes:**
- Cada viagem deve ter exatamente um owner
- Não pode haver duplicatas de (trip_id, user_id)
- Owner sempre tem can_edit_details = true
- Todos os membros têm can_manage_expenses = true por padrão

### trip_invitations

```sql
CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(trip_id, invitee_id) -- Não pode convidar mesma pessoa duas vezes
);
```

**Invariantes:**
- Não pode haver convites duplicados para mesma pessoa na mesma viagem
- Status só pode mudar de pending para accepted/rejected
- responded_at é preenchido quando status muda

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Owner sempre é membro

*For any* viagem criada, o owner_id deve sempre existir em trip_members com role='owner'

**Validates: Requirements 1.1, 1.4**

### Property 2: Sem duplicatas em trip_members

*For any* combinação de (trip_id, user_id), deve existir no máximo um registro em trip_members

**Validates: Requirements 1.3, 8.2**

### Property 3: Viagens visíveis para membros

*For any* usuário que é membro de uma viagem (existe em trip_members), a query de viagens deve retornar essa viagem

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Convite aceito cria membro

*For any* convite com status='accepted', deve existir um registro correspondente em trip_members com user_id=invitee_id

**Validates: Requirements 7.2, 8.3**

### Property 5: Exatamente um owner por viagem

*For any* viagem, deve existir exatamente um registro em trip_members com role='owner'

**Validates: Requirements 8.1**

### Property 6: Trigger é idempotente

*For any* viagem, executar o trigger add_trip_owner() múltiplas vezes não deve causar erro nem criar duplicatas

**Validates: Requirements 1.2, 1.3**

## Error Handling

### 1. Erro de Chave Duplicada

**Situação:** Tentativa de inserir (trip_id, user_id) que já existe

**Solução:** `ON CONFLICT DO NOTHING` nos triggers

**Comportamento:** Ignorar silenciosamente, não é erro

### 2. Viagem Não Aparece

**Situação:** Usuário criou viagem mas não vê na lista

**Diagnóstico:**
1. Verificar se existe registro em trip_members
2. Verificar se RLS está permitindo SELECT
3. Verificar se query está correta

**Solução:** Script de validação e correção

### 3. Convite Não Funciona

**Situação:** Convite aceito mas membro não adicionado

**Diagnóstico:**
1. Verificar se trigger está ativo
2. Verificar se há erro no log
3. Verificar se RLS permite INSERT em trip_members

**Solução:** Recriar trigger com ON CONFLICT

### 4. Erro 500 em trip_members

**Situação:** Query retorna erro 500

**Diagnóstico:**
1. Verificar ambiguidade em JOINs
2. Verificar políticas RLS conflitantes
3. Verificar se há loop infinito

**Solução:** Usar aliases explícitos, simplificar políticas

## Testing Strategy

### Unit Tests

**Testes específicos para validar comportamento:**

1. **test_create_trip_adds_owner**
   - Criar viagem
   - Verificar que owner está em trip_members
   - Verificar role='owner'

2. **test_create_trip_no_duplicate_error**
   - Criar viagem
   - Tentar inserir owner manualmente
   - Verificar que não há erro

3. **test_accept_invitation_adds_member**
   - Criar convite
   - Aceitar convite
   - Verificar que membro está em trip_members

4. **test_trip_visible_to_owner**
   - Criar viagem como user A
   - Buscar viagens como user A
   - Verificar que viagem aparece

5. **test_trip_visible_to_member**
   - Criar viagem como user A
   - Adicionar user B como membro
   - Buscar viagens como user B
   - Verificar que viagem aparece

### Property-Based Tests

**Testes com geração aleatória de dados:**

1. **property_owner_always_member**
   - **Property 1: Owner sempre é membro**
   - **Validates: Requirements 1.1, 1.4**
   - Gerar viagens aleatórias
   - Para cada viagem, verificar que owner_id existe em trip_members

2. **property_no_duplicate_members**
   - **Property 2: Sem duplicatas em trip_members**
   - **Validates: Requirements 1.3, 8.2**
   - Gerar viagens e membros aleatórios
   - Verificar que não há duplicatas de (trip_id, user_id)

3. **property_members_see_trips**
   - **Property 3: Viagens visíveis para membros**
   - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   - Gerar viagens e membros aleatórios
   - Para cada membro, verificar que vê suas viagens

4. **property_accepted_invitation_creates_member**
   - **Property 4: Convite aceito cria membro**
   - **Validates: Requirements 7.2, 8.3**
   - Gerar convites aleatórios
   - Aceitar convites
   - Verificar que membros foram criados

5. **property_exactly_one_owner**
   - **Property 5: Exatamente um owner por viagem**
   - **Validates: Requirements 8.1**
   - Gerar viagens aleatórias
   - Verificar que cada viagem tem exatamente um owner

### Integration Tests

1. **test_full_trip_flow**
   - Criar viagem
   - Adicionar membros via convite
   - Criar transações
   - Verificar que todos veem tudo corretamente

2. **test_rls_policies**
   - Criar viagens com diferentes usuários
   - Verificar que cada usuário vê apenas suas viagens
   - Verificar que membros veem viagens compartilhadas

### Validation Script

**Script SQL para validar integridade:**

```sql
-- 1. Viagens sem owner
SELECT t.id, t.name, t.owner_id
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.role = 'owner'
WHERE tm.id IS NULL;

-- 2. Owners não em trip_members
SELECT t.id, t.name, t.owner_id
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
WHERE tm.id IS NULL;

-- 3. Duplicatas em trip_members
SELECT trip_id, user_id, COUNT(*)
FROM trip_members
GROUP BY trip_id, user_id
HAVING COUNT(*) > 1;

-- 4. Convites aceitos sem membro
SELECT ti.id, ti.trip_id, ti.invitee_id
FROM trip_invitations ti
LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
WHERE ti.status = 'accepted' AND tm.id IS NULL;

-- 5. Viagens com múltiplos owners
SELECT trip_id, COUNT(*)
FROM trip_members
WHERE role = 'owner'
GROUP BY trip_id
HAVING COUNT(*) > 1;
```

## Implementation Plan

### Phase 1: Corrigir Triggers (Alta Prioridade)

1. Atualizar `add_trip_owner()` com ON CONFLICT
2. Verificar `handle_trip_invitation_accepted()` tem ON CONFLICT
3. Testar criação de viagem
4. Testar aceitação de convite

### Phase 2: Simplificar RLS (Alta Prioridade)

1. Atualizar política SELECT em trips
2. Testar visibilidade de viagens
3. Verificar performance

### Phase 3: Atualizar Frontend (Média Prioridade)

1. Simplificar useTrips hook
2. Limpar comentários em useCreateTrip
3. Testar fluxo completo

### Phase 4: Validar e Corrigir Dados (Média Prioridade)

1. Executar script de validação
2. Corrigir dados inconsistentes
3. Documentar problemas encontrados

### Phase 5: Limpar Código (Baixa Prioridade)

1. Remover scripts obsoletos
2. Remover triggers não utilizados
3. Atualizar documentação

## Scripts to Remove

### Scripts Obsoletos (Podem ser removidos após validação)

1. `scripts/FIX_RLS_TRIP_MEMBERS_ACEITAR_CONVITE.sql` - Correção pontual, não mais necessário
2. `scripts/CONSOLIDATE_RLS_TRIP_MEMBERS.sql` - Consolidação antiga
3. `scripts/REPARAR_CONVITES_VIAGEM.sql` - Reparo antigo
4. `scripts/FIX_FINAL_CONVITES_VIAGEM.sql` - Fix antigo
5. `scripts/FIX_COMPLETO_SISTEMA_VIAGENS.sql` - Fix antigo
6. `scripts/DIAGNOSTICO_CONVITES_VIAGEM.sql` - Diagnóstico, manter para referência
7. `scripts/DEBUG_CONVITE_ACEITO.sql` - Debug, manter para referência

### Triggers a Manter

1. `trg_add_trip_owner` - Essencial, apenas atualizar
2. `trg_trip_invitation_accepted` - Essencial, apenas verificar
3. `update_trips_updated_at` - Útil para auditoria

### Triggers a Remover

Nenhum trigger deve ser removido, apenas atualizados.

## Migration Strategy

### Nova Migration: fix_trip_system.sql

```sql
-- Corrigir sistema de viagens
-- Data: 2024-12-27

-- 1. Atualizar trigger add_trip_owner com ON CONFLICT
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO trip_members (
    trip_id, 
    user_id, 
    role, 
    can_edit_details, 
    can_manage_expenses
  )
  VALUES (
    NEW.id, 
    NEW.owner_id, 
    'owner', 
    true, 
    true
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Simplificar política RLS de trips
DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trips.id 
      AND tm.user_id = auth.uid()
    )
  );

-- 3. Corrigir dados inconsistentes
-- Adicionar owners que faltam
INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
SELECT t.id, t.owner_id, 'owner', true, true
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
WHERE tm.id IS NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 4. Adicionar membros de convites aceitos que faltam
INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
SELECT ti.trip_id, ti.invitee_id, 'member', false, true
FROM trip_invitations ti
LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
WHERE ti.status = 'accepted' AND tm.id IS NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 5. Remover duplicatas (manter apenas o primeiro)
DELETE FROM trip_members
WHERE id NOT IN (
  SELECT MIN(id)
  FROM trip_members
  GROUP BY trip_id, user_id
);

-- Comentários
COMMENT ON FUNCTION add_trip_owner() IS 'Adiciona automaticamente o criador da viagem como owner em trip_members. ON CONFLICT evita erros de duplicação.';
COMMENT ON POLICY "Users can view trips they are members of" ON trips IS 'Usuários podem ver viagens das quais são membros (verificado via trip_members)';
```

## Rollback Plan

Se algo der errado:

1. Reverter migration: `supabase db reset`
2. Restaurar backup do banco
3. Aplicar migrations antigas
4. Investigar problema
5. Criar nova migration corrigida

## Success Criteria

1. ✅ Criar viagem não gera erro de chave duplicada
2. ✅ Viagem aparece imediatamente para o criador
3. ✅ Convite aceito adiciona membro corretamente
4. ✅ Viagem aparece para membros adicionados
5. ✅ Não há duplicatas em trip_members
6. ✅ Cada viagem tem exatamente um owner
7. ✅ Scripts obsoletos removidos
8. ✅ Código frontend simplificado
9. ✅ Testes passando
10. ✅ Performance adequada
