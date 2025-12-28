# 🚨 APLICAR FIX: Convites de Viagem Não Funcionam

## Problema Identificado

**ERRO CRÍTICO:** A query de viagens está buscando por uma coluna que não existe!

```typescript
// ❌ ERRADO (linha 59 de src/hooks/useTrips.ts)
.eq("user_id", user.id)  // A tabela trips NÃO TEM coluna user_id!
```

A tabela `trips` tem `owner_id`, não `user_id`. Além disso, a query deveria buscar através de `trip_members` para incluir viagens compartilhadas.

## Correções Necessárias

### 1. Banco de Dados (EXECUTAR PRIMEIRO)

**Arquivo:** `scripts/FIX_TRIP_CREATION_COMPLETE.sql`

Este script:
- ✅ Recria o trigger `trg_add_trip_owner` que adiciona o criador automaticamente
- ✅ Corrige viagens existentes sem owner em `trip_members`
- ✅ Adiciona membros de convites aceitos que faltam
- ✅ Recria todas as políticas RLS de `trip_invitations`
- ✅ Valida que tudo está funcionando

**Como aplicar:**
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de `scripts/FIX_TRIP_CREATION_COMPLETE.sql`
4. Execute
5. Verifique os logs de validação

### 2. Frontend (EXECUTAR DEPOIS)

**Arquivo:** `src/hooks/useTrips.ts`

**Substituir a função `useTrips` completa:**

```typescript
export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // CORREÇÃO: Buscar viagens através de trip_members
      const { data: memberTrips, error: memberError } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;
      
      if (!memberTrips || memberTrips.length === 0) return [];

      const tripIds = memberTrips.map(m => m.trip_id);

      // Buscar as viagens completas
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .in("id", tripIds)
        .order("start_date", { ascending: false });

      if (tripsError) throw tripsError;
      
      if (!trips || trips.length === 0) return [];

      // Buscar orçamentos pessoais para essas viagens
      const { data: budgets } = await supabase
        .from("trip_participant_budgets")
        .select("trip_id, budget")
        .eq("user_id", user.id)
        .in("trip_id", tripIds);

      // Mapear orçamentos para viagens
      const budgetMap = new Map(budgets?.map(b => [b.trip_id, b.budget]) || []);
      
      return trips.map(trip => ({
        ...trip,
        my_personal_budget: budgetMap.get(trip.id) || null,
      })) as TripWithPersonalBudget[];
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
```

**Mudanças:**
1. ✅ Busca primeiro os `trip_ids` de `trip_members` onde o usuário é membro
2. ✅ Depois busca as viagens completas usando esses IDs
3. ✅ Inclui viagens onde o usuário é owner E viagens compartilhadas
4. ✅ Remove a query incorreta por `user_id`

### 3. Melhorar Feedback de Erros (OPCIONAL MAS RECOMENDADO)

**Arquivo:** `src/hooks/useTrips.ts` - função `useCreateTrip`

**Localizar a seção de criação de convites (linha ~160-170) e substituir:**

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
    toast.warning(
      `Viagem criada, mas houve erro ao enviar convites: ${invitationsError.message}`,
      { duration: 5000 }
    );
  } else {
    toast.success(
      `Viagem criada com sucesso! ${memberIds.length} convite(s) enviado(s).`,
      { duration: 3000 }
    );
  }
} else {
  // Sem convites, apenas sucesso simples
  toast.success("Viagem criada com sucesso!");
}
```

## Ordem de Aplicação

### Passo 1: Banco de Dados
```bash
# No Supabase SQL Editor, executar:
scripts/FIX_TRIP_CREATION_COMPLETE.sql
```

**Resultado esperado:**
```
✅ Função add_trip_owner recriada
✅ Trigger trg_add_trip_owner recriado
✅ X owners adicionados em trip_members
✅ Y membros de convites aceitos adicionados
✅ Política INSERT de trip_invitations recriada
✅ Política SELECT de trip_invitations recriada
✅ Política UPDATE de trip_invitations recriada
✅ Política DELETE de trip_invitations recriada

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 VALIDAÇÃO DO SISTEMA DE VIAGENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Componentes:
  Trigger existe: ✅ SIM
  Trigger ativo: ✅ SIM
  Função existe: ✅ SIM

📈 Integridade de Dados:
  Viagens sem owner: 0
  Convites aceitos sem membro: 0

🔒 Políticas RLS:
  INSERT policy: ✅ OK
  SELECT policy: ✅ OK

✅ TODOS OS PROBLEMAS FORAM CORRIGIDOS!
```

### Passo 2: Frontend

1. Abrir `src/hooks/useTrips.ts`
2. Localizar a função `useTrips` (linha ~48)
3. Substituir completamente pela versão corrigida acima
4. Salvar o arquivo
5. O Vite deve recarregar automaticamente

### Passo 3: Testar

1. **Criar uma nova viagem:**
   - Ir para página de viagens
   - Clicar em "Nova Viagem"
   - Preencher dados
   - Selecionar membros para convidar
   - Criar viagem
   - ✅ Viagem deve aparecer na lista imediatamente

2. **Verificar convites:**
   - Fazer login com outro usuário
   - Verificar se o convite aparece
   - ✅ Convite deve estar visível

3. **Aceitar convite:**
   - Clicar em "Aceitar"
   - ✅ Viagem deve aparecer na lista do convidado
   - ✅ Ambos usuários devem ver a viagem

4. **Verificar console:**
   - Abrir DevTools (F12)
   - ✅ Não deve haver erros no console
   - ✅ Não deve haver warnings sobre queries

## Diagnóstico Adicional (Se Ainda Houver Problemas)

Se após aplicar as correções ainda houver problemas, execute estas queries no Supabase SQL Editor:

```sql
-- 1. Ver viagens recentes e seus owners
SELECT 
  t.id,
  t.name,
  t.owner_id,
  t.created_at,
  tm.id as member_record,
  tm.role
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
ORDER BY t.created_at DESC
LIMIT 10;

-- 2. Ver convites recentes
SELECT 
  ti.id,
  ti.trip_id,
  ti.inviter_id,
  ti.invitee_id,
  ti.status,
  ti.created_at,
  t.name as trip_name,
  tm.id as member_record
FROM trip_invitations ti
LEFT JOIN trips t ON t.id = ti.trip_id
LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
ORDER BY ti.created_at DESC
LIMIT 10;

-- 3. Verificar trigger
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgrelid = 'trips'::regclass 
AND tgname = 'trg_add_trip_owner';
```

## Resumo das Causas

1. **❌ Query incorreta:** Buscava por `user_id` que não existe na tabela `trips`
2. **❌ Query incompleta:** Não buscava através de `trip_members`, então viagens compartilhadas não apareciam
3. **⚠️  Trigger pode estar inativo:** O trigger que adiciona o owner automaticamente pode não estar funcionando
4. **⚠️  Dados inconsistentes:** Viagens antigas podem não ter owner em `trip_members`

## Resultado Esperado

Após aplicar todas as correções:

✅ Criar viagem → Viagem aparece imediatamente na lista do criador
✅ Enviar convites → Convites chegam para os convidados
✅ Aceitar convite → Viagem aparece na lista do convidado
✅ Ambos usuários veem a mesma viagem
✅ Sem erros no console
✅ Feedback claro se houver erro ao enviar convites

## Documentos de Referência

- `DIAGNOSTICO_CONVITES_VIAGENS_COMPLETO.md` - Análise detalhada do problema
- `scripts/FIX_TRIP_CREATION_COMPLETE.sql` - Script de correção do banco
- `.kiro/specs/fix-trip-invitations-and-transaction-form/` - Spec completo com requirements e design
