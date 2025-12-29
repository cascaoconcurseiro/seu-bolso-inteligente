# Correções do Sistema de Família - 29/12/2024

## Problemas Resolvidos

### 1. ✅ Convites não apareciam para usuários sem contas/transações
**Problema**: Fran não via o convite no Dashboard porque não tinha contas nem transações cadastradas, então o Dashboard mostrava o "empty state" que não incluía o componente `PendingInvitationsAlert`.

**Solução**: Adicionado `PendingInvitationsAlert` também no empty state do Dashboard.

**Arquivos**: `src/pages/Dashboard.tsx`

---

### 2. ✅ Erro ao aceitar convite: "record 'new' has no field 'invitee_id'"
**Problema**: Havia um trigger antigo (`trg_invitation_accepted`) que tentava acessar campos que não existem mais na tabela (`invitee_id` e `inviter_id`).

**Solução**: Removido trigger antigo via migration `remove_old_invitation_trigger`.

**Migration**: `remove_old_invitation_trigger`

---

### 3. ✅ Dono da família não aparecia para membros convidados
**Problema**: Quando Fran aceitava o convite, ela não via Wesley na lista de membros da família.

**Solução**: 
- Modificado `useFamily` para buscar dados do owner via join com profiles
- Modificado página Family para incluir o dono como "pseudo-membro" quando o usuário não é o dono
- Dono aparece com badge de coroa (Crown) e role "admin"

**Arquivos**: 
- `src/hooks/useFamily.ts`
- `src/pages/Family.tsx`

---

### 4. ✅ Wesley não via Fran na lista de membros após aceite
**Problema**: O hook `useFamilyMembers` buscava apenas `user_id = user.id`, mas quando Fran aceitava, o membro era criado com `user_id = NULL` e `linked_user_id = fran.id`.

**Solução**: 
- Modificado `useFamilyMembers` para buscar TODOS os membros da família usando `family_id`
- Modificado `useFamily` para funcionar tanto para donos quanto para membros:
  - Se é dono: busca família onde `owner_id = user.id`
  - Se é membro: busca família via `family_members` onde `linked_user_id = user.id`

**Arquivos**: `src/hooks/useFamily.ts`

---

### 5. ✅ Convites aceitos apareciam como "Erro ao aceitar"
**Problema**: Convites com status 'accepted' apareciam na seção "Aguardando resposta" com mensagem de erro.

**Solução**: Removido filtro de convites aceitos - eles não devem mais aparecer na lista de pendentes pois já viraram membros ativos.

**Arquivos**: `src/pages/Family.tsx`

---

### 6. ✅ Políticas RLS otimizadas
**Problema**: Havia recursão infinita nas políticas RLS de `family_members` e `families`.

**Solução**: 
- Removidas políticas duplicadas e recursivas
- Criados índices para melhor performance
- Recriadas políticas sem recursão usando subqueries com `IN`

**Migration**: `optimize_family_rls_policies`

**Índices criados**:
- `idx_family_invitations_to_user` (to_user_id WHERE status = 'pending')
- `idx_family_invitations_from_user` (from_user_id)
- `idx_family_members_user_id` (user_id)
- `idx_family_members_linked_user` (linked_user_id)
- `idx_family_members_family_id` (family_id)
- `idx_families_owner_id` (owner_id)

---

## Fluxo Atual do Sistema de Convites

### Para o Remetente (Wesley):
1. Envia convite via página Família
2. Convite fica em `family_invitations` com status 'pending'
3. Aparece na seção "Aguardando resposta"
4. Quando aceito, convite some da lista e membro aparece em "Membros ativos"

### Para o Destinatário (Fran):
1. Recebe convite que aparece no Dashboard (componente `PendingInvitationsAlert`)
2. Pode aceitar ou rejeitar
3. Ao aceitar:
   - Status do convite muda para 'accepted'
   - Trigger cria registro em `family_members` com:
     - `user_id = NULL`
     - `linked_user_id = fran.id`
     - `status = 'active'`
4. Convite desaparece do Dashboard
5. Pode acessar página Família e ver:
   - Wesley (dono) com badge de coroa
   - Ela mesma como membro

---

## Estrutura de Dados

### Tabela `families`
- `id`: UUID
- `name`: Nome da família
- `owner_id`: UUID do dono (referência a profiles)
- `created_at`, `updated_at`

### Tabela `family_members`
- `id`: UUID
- `family_id`: UUID da família
- `user_id`: UUID do criador (NULL para membros convidados)
- `linked_user_id`: UUID do usuário vinculado (para membros convidados)
- `name`: Nome do membro
- `email`: Email (opcional)
- `role`: 'admin' | 'editor' | 'viewer'
- `status`: 'pending' | 'active'
- `invited_by`: UUID de quem convidou
- `sharing_scope`: 'all' | 'trips_only' | 'date_range' | 'specific_trip'
- Campos de escopo: `scope_start_date`, `scope_end_date`, `scope_trip_id`

### Tabela `family_invitations`
- `id`: UUID
- `from_user_id`: UUID de quem enviou
- `to_user_id`: UUID de quem recebe
- `family_id`: UUID da família
- `member_name`: Nome do membro
- `role`: 'admin' | 'editor' | 'viewer'
- `status`: 'pending' | 'accepted' | 'rejected'
- `sharing_scope`: 'all' | 'trips_only' | 'date_range' | 'specific_trip'
- Campos de escopo: `scope_start_date`, `scope_end_date`, `scope_trip_id`

---

## Arquivos Modificados

1. `src/pages/Dashboard.tsx` - Adicionado PendingInvitationsAlert no empty state
2. `src/pages/Family.tsx` - Incluir dono na lista, remover convites aceitos
3. `src/hooks/useFamily.ts` - Buscar família para donos e membros, buscar todos os membros
4. `src/hooks/useFamilyInvitations.ts` - Logs detalhados
5. `src/components/family/PendingInvitationsAlert.tsx` - Logs e mensagens de debug
6. `src/contexts/AuthContext.tsx` - Logs de autenticação

## Migrations Aplicadas

1. `optimize_family_rls_policies` - Otimizar políticas RLS e criar índices
2. `remove_old_invitation_trigger` - Remover trigger antigo com campos inexistentes
3. `fix_infinite_recursion_rls` - Remover recursão em políticas (aplicada anteriormente)

---

## Status Final

✅ **Sistema de convites funcionando completamente**:
- Convites aparecem para destinatários
- Aceitar convite funciona
- Membros aparecem para ambos os lados
- Dono aparece na lista de membros
- Sem erros de RLS ou triggers
