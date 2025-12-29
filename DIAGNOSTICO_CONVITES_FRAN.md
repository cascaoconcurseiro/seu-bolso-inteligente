# Diagnóstico: Convites não aparecem para Fran

## Problema
Fran (francy.von@gmail.com) não consegue ver o convite de família enviado por Wesley no Dashboard.

## Dados Confirmados no Banco
```sql
-- Convite existe e está pendente
id: fc190d08-7208-4f10-b08b-544187ed28cc
from_user_id: 56ccd60b-641f-4265-bc17-7b8705a2f8c9 (Wesley)
to_user_id: 9545d0c1-94be-4b69-b110-f939bce072ee (Fran)
family_id: 2c564172-3aa5-43c4-a8cf-14b99865f581
member_name: Fran
role: viewer
status: pending
```

## Correções Aplicadas

### 1. Políticas RLS Otimizadas (Migration: optimize_family_rls_policies)
- ✅ Removidas políticas duplicadas e recursivas
- ✅ Criados índices para melhor performance:
  - `idx_family_invitations_to_user` (to_user_id WHERE status = 'pending')
  - `idx_family_invitations_from_user` (from_user_id)
  - `idx_family_members_user_id` (user_id)
  - `idx_family_members_linked_user` (linked_user_id)
  - `idx_family_members_family_id` (family_id)
  - `idx_families_owner_id` (owner_id)
- ✅ Recriadas políticas sem recursão:
  - Members can view their own records
  - Family owners can view all members
  - Family owners can insert members
  - Family owners can update members
  - Members can update their own records
  - Family owners can delete members

### 2. Logs Detalhados Adicionados
- ✅ Hook `usePendingInvitations` com logs completos
- ✅ Componente `PendingInvitationsAlert` com logs de renderização
- ✅ useEffect para monitorar mudanças de estado

### 3. Botão de Debug no Dashboard
- ✅ Área amarela com botão para recarregar e verificar logs

## Próximos Passos

### Para Diagnosticar
1. Fran deve abrir o Console (F12)
2. Recarregar a página
3. Procurar mensagens com 📨 e 🔔
4. Enviar os logs completos

### Possíveis Causas
1. **Cache do React Query**: Query pode estar em cache com dados vazios
2. **Problema de Autenticação**: user.id pode não estar sendo passado corretamente
3. **Erro de RLS**: Políticas podem estar bloqueando o acesso (improvável após otimização)
4. **Problema de Timing**: Hook pode estar executando antes do user estar disponível

### Logs Esperados
```
📨 usePendingInvitations: Iniciando busca para user: 9545d0c1-94be-4b69-b110-f939bce072ee
📨 usePendingInvitations: Fazendo query no Supabase...
📨 usePendingInvitations: Resposta do Supabase: { invitations: [...], error: null, count: 1 }
📨 Buscando perfis dos remetentes: [56ccd60b-641f-4265-bc17-7b8705a2f8c9]
📨 Perfis encontrados: [{ id: ..., full_name: "Wesley", email: "wesley.diaslima@gmail.com" }]
📨 Convites pendentes FINAIS: [{ id: ..., from_user: {...}, ... }]
🔔 PendingInvitationsAlert RENDER: { isLoading: false, error: null, invitationsCount: 1, ... }
```

## Arquivos Modificados
- `src/hooks/useFamilyInvitations.ts` - Logs detalhados
- `src/components/family/PendingInvitationsAlert.tsx` - Logs e useEffect
- `src/pages/Dashboard.tsx` - Botão de debug
- Migration: `optimize_family_rls_policies` - Políticas RLS otimizadas

## Status
🔍 **AGUARDANDO LOGS DO CONSOLE DA FRAN**
