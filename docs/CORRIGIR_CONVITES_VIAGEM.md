# Correção: Convites de Viagem Não Aparecem

## Status Atual

✅ **Banco de Dados**: Convites existem e estão corretos
✅ **Políticas RLS**: Configuradas corretamente
✅ **Trigger**: Função `handle_trip_invitation_accepted` funcionando
✅ **Componentes**: Criados e importados
❓ **Frontend**: Precisa verificar

## Convites Existentes no Banco

```
1. Fran (francy.von@gmail.com) tem 2 convites pendentes:
   - Viagem "fran" (convidado por Wesley)
   - Viagem "fran2" (convidado por Wesley)

2. Wesley (wesley.diaslima@gmail.com) tem 1 convite pendente:
   - Viagem "wesley" (convidado por Fran)
```

## Passos para Testar

### 1. Verificar o Console do Navegador

Abra o Dashboard e verifique o console (F12). Você deve ver logs como:

```
🔍 usePendingTripInvitations - INICIANDO
👤 User: {...}
🆔 User ID: 9545d0c1-94be-4b69-b110-f939bce072ee
📡 Buscando convites para user: 9545d0c1-94be-4b69-b110-f939bce072ee
📦 Convites encontrados (raw): [...]
```

### 2. Verificar o Card de Debug

No topo do Dashboard, você verá um card azul com informações de debug:
- Usuário autenticado: Sim/Não
- User ID: [seu ID]
- Convites encontrados: [número]

### 3. Possíveis Problemas e Soluções

#### Problema A: "Usuário autenticado: Não"
**Solução**: Faça logout e login novamente

#### Problema B: "Convites encontrados: 0" mas usuário está autenticado
**Possíveis causas**:
1. **User ID diferente**: O ID do usuário no frontend não corresponde ao ID no banco
2. **Erro de RLS**: As políticas RLS estão bloqueando o acesso
3. **Erro na query**: A query do Supabase está falhando

**Solução**: Verifique os logs no console para ver qual é o erro exato

#### Problema C: Erro de permissão
**Solução**: Execute o script de reparo das políticas RLS:

```sql
-- Limpar políticas duplicadas
DROP POLICY IF EXISTS "trip_invitations_select_policy" ON public.trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_insert_policy" ON public.trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_update_policy" ON public.trip_invitations;

-- Manter apenas as políticas originais
-- (As políticas "Users can view their trip invitations", etc. já existem)
```

### 4. Testar Manualmente no Supabase

Vá para o Supabase Dashboard > SQL Editor e execute:

```sql
-- Verificar se você consegue ver os convites
SELECT * FROM trip_invitations 
WHERE invitee_id = auth.uid() 
AND status = 'pending';
```

Se retornar vazio, o problema é com RLS ou autenticação.

## Arquivos Modificados

1. ✅ `src/hooks/useTripInvitations.ts` - Adicionados logs detalhados
2. ✅ `src/components/trips/PendingTripInvitationsAlert.tsx` - Melhorado tratamento de erros
3. ✅ `src/components/trips/TripInvitationsDebug.tsx` - Novo componente de debug
4. ✅ `src/pages/Dashboard.tsx` - Adicionado componente de debug

## Próximos Passos

1. **Teste no navegador** e veja o que aparece no card de debug
2. **Copie os logs do console** e me envie se houver erro
3. **Verifique se o User ID** no debug corresponde aos IDs no banco:
   - Fran: `9545d0c1-94be-4b69-b110-f939bce072ee`
   - Wesley: `56ccd60b-641f-4265-bc17-7b8705a2f8c9`

## Remover Debug (Depois de Corrigir)

Quando tudo estiver funcionando, remova o componente de debug:

```tsx
// Em src/pages/Dashboard.tsx, remova esta linha:
<TripInvitationsDebug />
```

## Sistema Completo de Convites

### Como Funciona

1. **Criar Viagem**: Ao criar uma viagem, você pode selecionar membros da família
2. **Enviar Convites**: Convites são criados automaticamente na tabela `trip_invitations`
3. **Receber Convites**: Membros veem os convites no Dashboard
4. **Aceitar/Rejeitar**: Ao aceitar, o trigger adiciona automaticamente à tabela `trip_members`
5. **Participar**: Usuário agora pode ver e gerenciar a viagem

### Fluxo de Dados

```
1. useCreateTrip() 
   → Cria viagem
   → Cria convites para memberIds selecionados

2. usePendingTripInvitations()
   → Busca convites onde invitee_id = user.id
   → Exibe no PendingTripInvitationsAlert

3. useAcceptTripInvitation()
   → Atualiza status para 'accepted'
   → Trigger adiciona à trip_members
   → Invalida cache e atualiza UI

4. useTrips()
   → Agora inclui a nova viagem
   → Usuário pode acessar detalhes
```
