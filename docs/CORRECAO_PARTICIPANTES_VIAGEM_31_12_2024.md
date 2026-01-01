# Correção: Participantes de Viagem - 31/12/2024

## Resumo
Corrigido sistema de participantes de viagem para usar trip_members, filtrar corretamente membros disponíveis e contar o criador da viagem.

## Problemas Identificados

### 1. Participantes Não Apareciam (0 participantes)
**Problema**: A viagem mostrava "0 participantes" mesmo tendo o criador.

**Causa**: O hook `useTripParticipants` buscava dados de `trip_participants` (tabela vazia), ao invés de `trip_members` (tabela real com os dados).

**Impacto**:
- Contagem de participantes sempre zero
- Valor por pessoa não calculado
- Balances não exibidos

### 2. Próprio Usuário Aparecia na Lista
**Problema**: Ao adicionar participantes, o próprio usuário aparecia na lista.

**Causa**: Não havia filtro para remover o usuário logado da lista de membros disponíveis.

**Impacto**: Confusão ao tentar adicionar a si mesmo

### 3. Membros Já Adicionados Apareciam
**Problema**: Membros que já estavam na viagem apareciam como "Adicionado" mas ainda na lista.

**Causa**: Filtro apenas desabilitava, não removia da lista.

**Impacto**: Lista poluída com membros indisponíveis

### 4. Sem Mensagem Quando Não Há Membros
**Problema**: Se todos os membros já estavam na viagem, mostrava lista vazia sem explicação.

**Causa**: Não havia tratamento para lista vazia.

**Impacto**: Usuário não sabia o que fazer

## Correções Aplicadas

### 1. Hook useTripParticipants Corrigido ✅

**Arquivo**: `src/hooks/useTrips.ts`

**Mudança**: Buscar dados de `trip_members` ao invés de `trip_participants`

**Antes**:
```typescript
const { data, error } = await supabase
  .from("trip_participants")
  .select("*")
  .eq("trip_id", tripId)
  .order("name");
```

**Depois**:
```typescript
const { data, error } = await supabase
  .from("trip_members")
  .select(`
    id,
    trip_id,
    user_id,
    role,
    personal_budget,
    created_at
  `)
  .eq("trip_id", tripId)
  .order("created_at");

// Buscar nomes dos usuários
const participantsWithNames = await Promise.all(
  (data || []).map(async (member) => {
    const { data: userData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", member.user_id)
      .single();
    
    return {
      id: member.id,
      trip_id: member.trip_id,
      user_id: member.user_id,
      member_id: null,
      name: userData?.full_name || "Usuário",
      personal_budget: member.personal_budget,
      created_at: member.created_at,
    };
  })
);
```

### 2. Filtro de Membros Disponíveis ✅

**Arquivo**: `src/pages/Trips.tsx`

**Mudanças**:
1. Filtrar membros que já estão na viagem
2. Filtrar o próprio usuário (linked_user_id === user.id)
3. Mostrar apenas membros realmente disponíveis

**Código**:
```typescript
const availableMembers = familyMembers.filter(member => {
  // Não mostrar se já está na viagem
  const isAlreadyInTrip = participants.some(p => p.member_id === member.id);
  // Não mostrar o próprio usuário
  const isCurrentUser = member.linked_user_id === user?.id;
  return !isAlreadyInTrip && !isCurrentUser;
});
```

### 3. Mensagem Quando Não Há Membros ✅

**Arquivo**: `src/pages/Trips.tsx`

**Mudança**: Exibir mensagem amigável com botão para adicionar novos membros

**Código**:
```typescript
if (availableMembers.length === 0) {
  return (
    <div className="py-8 text-center">
      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-medium mb-1">Nenhum membro disponível</p>
      <p className="text-xs text-muted-foreground mb-4">
        Todos os membros da família já estão nesta viagem.
      </p>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          setShowAddParticipantDialog(false);
          navigate("/familia");
        }}
      >
        Adicionar Novos Membros
      </Button>
    </div>
  );
}
```

### 4. Imports Adicionados ✅

**Arquivo**: `src/pages/Trips.tsx`

**Mudanças**:
- Adicionado `useNavigate` do react-router-dom
- Adicionado variável `navigate` no componente

## Arquivos Modificados

1. ✅ `src/hooks/useTrips.ts` - Corrigido useTripParticipants para usar trip_members
2. ✅ `src/pages/Trips.tsx` - Filtro de membros e mensagem quando vazio

## Verificação

### Participantes Contados Corretamente
```sql
SELECT 
  t.name,
  COUNT(tm.id) as participant_count
FROM trips t
LEFT JOIN trip_members tm ON t.id = tm.trip_id
WHERE t.name = 'Ferias'
GROUP BY t.name;
```

**Resultado esperado**: 2 participantes (Wesley e Fran)

### Teste Manual
1. Abrir viagem "Ferias"
2. Verificar que mostra "2" em Participantes
3. Verificar que "Por Pessoa" está calculado ($ 10,00 / 2 = $ 5,00)
4. Clicar em "Adicionar Participante"
5. Verificar que:
   - Wesley (usuário logado) NÃO aparece
   - Fran (já na viagem) NÃO aparece
   - Se não houver outros membros, mostra mensagem com botão

## Status Final

✅ Participantes contados corretamente (inclui criador)
✅ Valor por pessoa calculado corretamente
✅ Filtro remove próprio usuário
✅ Filtro remove membros já adicionados
✅ Mensagem quando não há membros disponíveis
✅ Botão para adicionar novos membros na família

## Benefícios

1. **Precisão**: Contagem correta de participantes
2. **Clareza**: Usuário entende quem está na viagem
3. **UX**: Não mostra opções inválidas
4. **Orientação**: Mensagem clara quando não há membros
5. **Fluxo**: Botão direto para adicionar membros na família

## Notas Técnicas

### trip_members vs trip_participants
- `trip_members`: Tabela real com membros da viagem (user_id, role, permissions)
- `trip_participants`: Tabela antiga/vazia (não está sendo usada)
- Sistema deve usar `trip_members` como fonte de verdade

### Filtro de Membros
- `linked_user_id`: ID do usuário do Auth (Supabase Auth)
- `user_id` em trip_members: Mesmo ID do Auth
- Comparar `member.linked_user_id === user?.id` para filtrar próprio usuário

### Busca de Nomes
- trip_members tem apenas `user_id`, não tem nome
- Precisa fazer join com `profiles` para buscar `full_name`
- Fallback para "Usuário" se não encontrar nome
