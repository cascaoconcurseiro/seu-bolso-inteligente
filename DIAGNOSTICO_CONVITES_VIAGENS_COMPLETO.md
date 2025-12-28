# Diagnóstico Completo: Convites de Viagem Não Funcionam

## Problema Relatado

O usuário reporta que:
1. **Convites não chegam no outro participante**
2. **A viagem não é criada nem para quem criou nem para os participantes**
3. **Problema similar já foi corrigido antes**

## Análise do Sistema Atual

### 1. Estrutura do Banco de Dados

#### Tabelas Envolvidas
- `trips`: Armazena as viagens
- `trip_members`: Armazena os membros de cada viagem (owner e members)
- `trip_invitations`: Armazena os convites enviados

#### Triggers Importantes
- `trg_add_trip_owner`: Adiciona automaticamente o criador como owner em `trip_members` quando uma viagem é criada
- `trg_trip_invitation_accepted`: Adiciona o convidado em `trip_members` quando um convite é aceito

### 2. Fluxo de Criação de Viagem

**Frontend (`src/hooks/useTrips.ts` - linha 138-180):**
```typescript
export function useCreateTrip() {
  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      // 1. Criar viagem
      const { data, error } = await supabase
        .from("trips")
        .insert({ owner_id: user.id, ...tripData })
        .select()
        .single();

      // 2. Owner é adicionado automaticamente via trigger add_trip_owner()
      
      // 3. Criar convites para membros selecionados
      if (memberIds && memberIds.length > 0) {
        const invitations = memberIds.map(userId => ({
          trip_id: data.id,
          inviter_id: user.id,
          invitee_id: userId,
          message: `Você foi convidado para participar da viagem "${data.name}"!`,
        }));

        await supabase.from("trip_invitations").insert(invitations);
      }
    }
  });
}
```

### 3. Problemas Identificados

#### Problema 1: Trigger `add_trip_owner` Pode Não Estar Ativo

**Localização:** `supabase/migrations/20251227145010_fix_trip_system.sql`

O trigger foi criado mas pode ter sido sobrescrito por migrações posteriores:

```sql
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, true)
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- MAS O TRIGGER PODE NÃO ESTAR CRIADO!
DROP TRIGGER IF EXISTS trg_add_trip_owner ON trips;
CREATE TRIGGER trg_add_trip_owner
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner();
```

**Verificação Necessária:**
- O trigger `trg_add_trip_owner` está ativo na tabela `trips`?
- A função `add_trip_owner()` existe?

#### Problema 2: Políticas RLS Podem Estar Bloqueando

**Migração:** `supabase/migrations/20251227151000_fix_recursion_with_security_definer.sql`

As políticas RLS foram simplificadas para evitar recursão:

```sql
-- POLICY para TRIPS
CREATE POLICY "trips_select"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR is_trip_member(id, auth.uid())
  );
```

**Problema Potencial:**
- Se o trigger `add_trip_owner` não executar, o criador não será adicionado em `trip_members`
- Sem registro em `trip_members`, a função `is_trip_member()` retorna FALSE
- A viagem não aparece na query de viagens do criador

#### Problema 3: Query de Viagens Depende de `trip_members`

**Frontend (`src/hooks/useTrips.ts` - linha 52-88):**

```typescript
export function useTrips() {
  return useQuery({
    queryFn: async () => {
      // Busca viagens onde user_id = auth.uid()
      const { data: trips } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)  // ❌ PROBLEMA: Deveria buscar por trip_members!
        .order("start_date", { ascending: false });
      
      return trips;
    }
  });
}
```

**ERRO CRÍTICO:** A query está buscando por `user_id` na tabela `trips`, mas essa coluna não existe! A tabela `trips` tem `owner_id`, não `user_id`.

#### Problema 4: Convites Podem Não Estar Sendo Criados

**Possíveis Causas:**
1. Erro silencioso ao inserir convites (catch sem throw)
2. Políticas RLS bloqueando inserção
3. Constraint violation (convite duplicado)

### 4. Correções Necessárias

#### Correção 1: Verificar e Recriar Trigger

```sql
-- Verificar se trigger existe
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'trips'::regclass 
AND tgname = 'trg_add_trip_owner';

-- Se não existir ou estiver desabilitado, recriar:
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, true)
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_trip_owner ON trips;
CREATE TRIGGER trg_add_trip_owner
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner();
```

#### Correção 2: Corrigir Query de Viagens no Frontend

**Arquivo:** `src/hooks/useTrips.ts`

```typescript
export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // CORREÇÃO: Buscar por trip_members, não por user_id
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

      if (error) throw error;
      
      // Buscar orçamentos pessoais
      const { data: budgets } = await supabase
        .from("trip_participant_budgets")
        .select("trip_id, budget")
        .eq("user_id", user.id)
        .in("trip_id", tripIds);

      const budgetMap = new Map(budgets?.map(b => [b.trip_id, b.budget]) || []);
      
      return trips.map(trip => ({
        ...trip,
        my_personal_budget: budgetMap.get(trip.id) || null,
      }));
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
```

#### Correção 3: Melhorar Tratamento de Erros ao Criar Convites

**Arquivo:** `src/hooks/useTrips.ts`

```typescript
// Criar convites para membros selecionados
if (memberIds && memberIds.length > 0) {
  const invitations = memberIds.map(userId => ({
    trip_id: data.id,
    inviter_id: user.id,
    invitee_id: userId,
    message: `Você foi convidado para participar da viagem "${data.name}"!`,
  }));

  const { error: invitationsError } = await supabase
    .from("trip_invitations")
    .insert(invitations);

  if (invitationsError) {
    console.error("Erro ao criar convites:", invitationsError);
    // ADICIONAR: Notificar usuário sobre erro
    toast.warning("Viagem criada, mas houve erro ao enviar convites: " + invitationsError.message);
  } else {
    toast.success(`Viagem criada! ${memberIds.length} convite(s) enviado(s).`);
  }
}
```

#### Correção 4: Verificar Políticas RLS de trip_invitations

```sql
-- Verificar políticas existentes
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'trip_invitations';

-- Garantir que owner pode criar convites
CREATE POLICY "trip_invitations_insert_policy" ON public.trip_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );
```

## Plano de Ação

### Fase 1: Diagnóstico (Executar no Supabase SQL Editor)

```sql
-- 1. Verificar se trigger existe e está ativo
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgrelid = 'trips'::regclass 
AND tgname = 'trg_add_trip_owner';

-- 2. Verificar se função existe
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE proname = 'add_trip_owner';

-- 3. Verificar viagens sem owner em trip_members
SELECT 
  t.id,
  t.name,
  t.owner_id,
  t.created_at,
  tm.id as member_record
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
WHERE tm.id IS NULL
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Verificar convites criados recentemente
SELECT 
  ti.id,
  ti.trip_id,
  ti.inviter_id,
  ti.invitee_id,
  ti.status,
  ti.created_at,
  t.name as trip_name
FROM trip_invitations ti
LEFT JOIN trips t ON t.id = ti.trip_id
ORDER BY ti.created_at DESC
LIMIT 10;

-- 5. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('trips', 'trip_members', 'trip_invitations')
ORDER BY tablename, policyname;
```

### Fase 2: Correção no Banco de Dados

Criar arquivo: `scripts/FIX_TRIP_CREATION_COMPLETE.sql`

```sql
-- =====================================================
-- FIX COMPLETO: CRIAÇÃO DE VIAGENS E CONVITES
-- =====================================================

BEGIN;

-- 1. Recriar função add_trip_owner
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE 'Trigger add_trip_owner executando para viagem %', NEW.id;
  
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, true)
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RAISE NOTICE 'Owner % adicionado à viagem %', NEW.owner_id, NEW.id;
  
  RETURN NEW;
END;
$$;

-- 2. Recriar trigger
DROP TRIGGER IF EXISTS trg_add_trip_owner ON trips;
CREATE TRIGGER trg_add_trip_owner
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner();

-- 3. Corrigir viagens existentes sem owner em trip_members
INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
SELECT t.id, t.owner_id, 'owner', true, true
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
WHERE tm.id IS NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 4. Verificar políticas RLS de trip_invitations
DROP POLICY IF EXISTS "trip_invitations_insert_policy" ON trip_invitations;
CREATE POLICY "trip_invitations_insert_policy" ON trip_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

COMMIT;

-- Validação
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_trips_without_owner INTEGER;
BEGIN
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = 'trips'::regclass 
    AND tgname = 'trg_add_trip_owner'
  ) INTO v_trigger_exists;
  
  -- Verificar função
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_trip_owner'
  ) INTO v_function_exists;
  
  -- Contar viagens sem owner
  SELECT COUNT(*) INTO v_trips_without_owner
  FROM trips t
  LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
  WHERE tm.id IS NULL;
  
  RAISE NOTICE '=== VALIDAÇÃO ===';
  RAISE NOTICE 'Trigger existe: %', CASE WHEN v_trigger_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Função existe: %', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Viagens sem owner: %', v_trips_without_owner;
  
  IF v_trigger_exists AND v_function_exists AND v_trips_without_owner = 0 THEN
    RAISE NOTICE '✅ CORREÇÃO APLICADA COM SUCESSO!';
  ELSE
    RAISE WARNING '⚠️  Ainda existem problemas!';
  END IF;
END $$;
```

### Fase 3: Correção no Frontend

Atualizar `src/hooks/useTrips.ts` conforme descrito na Correção 2 acima.

## Resumo

O problema tem **3 causas principais**:

1. **Trigger `trg_add_trip_owner` pode não estar ativo** → Owner não é adicionado em `trip_members`
2. **Query de viagens está incorreta** → Busca por `user_id` em vez de usar `trip_members`
3. **Erros ao criar convites são silenciosos** → Usuário não sabe que convites falharam

**Solução:**
1. Recriar trigger e função no banco
2. Corrigir query no frontend
3. Melhorar feedback de erros
