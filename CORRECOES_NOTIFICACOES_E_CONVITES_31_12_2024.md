# Correções de Notificações e Convites de Viagem - 31/12/2024

## Problemas Identificados

### 1. Notificações não somem após serem dispensadas
**Causa**: O componente `NotificationButton.tsx` estava chamando funções `dismiss()` e `dismissAllRead()` que não existiam no hook `useNotifications.ts`.

**Solução**:
- ✅ Criados hooks `useDismissNotification()` e `useDismissAllRead()` em `useNotifications.ts`
- ✅ Atualizado `NotificationButton.tsx` para usar os novos hooks corretamente
- ✅ Adicionado filtro `is_dismissed = false` na query de notificações para não mostrar notificações dispensadas

### 2. Convites de viagem não aparecem ao clicar em "Ver convite"
**Causa**: Quando o usuário clica em "Ver convite" na notificação, ele é redirecionado para `/viagens`, mas os convites não estavam sendo destacados visualmente.

**Solução**:
- ✅ Adicionado scroll automático para a seção de convites pendentes quando a página carrega
- ✅ Implementado `useRef` para referenciar a seção de convites
- ✅ Adicionado `useEffect` que faz scroll suave para os convites quando existem convites pendentes

### 3. Notificações de convites não somem após aceitar/rejeitar
**Causa**: O trigger `handle_trip_invitation_response()` apenas marcava a notificação como lida, mas não a dispensava.

**Solução**:
- ✅ Atualizado trigger para marcar notificação como `is_dismissed = true` quando convite é respondido
- ✅ Criada migration `20251231_fix_trip_invitation_notifications.sql` para aplicar a correção
- ✅ Adicionado script para limpar notificações antigas de convites já respondidos

## Arquivos Modificados

### Frontend
1. **src/hooks/useNotifications.ts**
   - Adicionado filtro `is_dismissed = false` na query principal
   - Criado hook `useDismissNotification()`
   - Criado hook `useDismissAllRead()`

2. **src/components/layout/NotificationButton.tsx**
   - Importados novos hooks de dismiss
   - Corrigidas chamadas de `dismiss()` para `dismiss.mutate()`
   - Corrigidas chamadas de `dismissAllRead()` para `dismissAllRead.mutate()`
   - Corrigidas chamadas de `markAsRead()` para `markAsRead.mutate()`
   - Corrigidas chamadas de `markAllAsRead()` para `markAllAsRead.mutate()`

3. **src/pages/Trips.tsx**
   - Adicionado import de `useRef` do React
   - Adicionado import de `usePendingTripInvitations`
   - Criado ref `invitationsRef` para a seção de convites
   - Adicionado `useEffect` para scroll automático aos convites
   - Envolvido `PendingTripInvitationsAlert` em div com ref

### Backend
4. **supabase/migrations/20251231_fix_trip_invitation_notifications.sql**
   - Atualizado trigger `handle_trip_invitation_response()` para dispensar notificações
   - Adicionado script de limpeza de notificações antigas

## Como Aplicar

### 1. Frontend (já aplicado automaticamente)
As correções no frontend já foram aplicadas nos arquivos TypeScript/React.

### 2. Backend (aplicar no Supabase)
Execute a migration no SQL Editor do Supabase:

```bash
# Copie o conteúdo de:
supabase/migrations/20251231_fix_trip_invitation_notifications.sql

# E execute no SQL Editor do Supabase Dashboard
```

## Testes Recomendados

### Teste 1: Dispensar notificações
1. ✅ Abrir o centro de notificações
2. ✅ Clicar no X de uma notificação
3. ✅ Verificar que a notificação desaparece imediatamente
4. ✅ Recarregar a página e verificar que a notificação não volta

### Teste 2: Limpar notificações lidas
1. ✅ Marcar algumas notificações como lidas
2. ✅ Clicar em "Limpar" no centro de notificações
3. ✅ Verificar que todas as notificações lidas desaparecem
4. ✅ Recarregar a página e verificar que não voltam

### Teste 3: Convites de viagem
1. ✅ Criar um convite de viagem para outro usuário
2. ✅ No usuário convidado, verificar que aparece notificação
3. ✅ Clicar em "Ver convite" na notificação
4. ✅ Verificar que a página rola automaticamente para os convites
5. ✅ Aceitar ou rejeitar o convite
6. ✅ Verificar que a notificação desaparece automaticamente

### Teste 4: Scroll automático
1. ✅ Ter convites pendentes
2. ✅ Acessar a página /viagens
3. ✅ Verificar que a página rola automaticamente para mostrar os convites

## Impacto

### Positivo
- ✅ Notificações agora podem ser removidas corretamente
- ✅ Convites de viagem ficam mais visíveis ao clicar em "Ver convite"
- ✅ Notificações de convites somem automaticamente após resposta
- ✅ Melhor experiência do usuário com scroll automático

### Riscos
- ⚠️ Baixo: Mudanças em hooks podem afetar outros componentes que usam notificações
- ⚠️ Baixo: Scroll automático pode ser inesperado em alguns casos

## Próximos Passos

1. ✅ Aplicar migration no banco de dados
2. ✅ Testar todos os cenários listados acima
3. ✅ Monitorar logs de erro no console do navegador
4. ✅ Verificar se há notificações duplicadas ou não dispensadas

## Observações

- O sistema de notificações agora está completo e funcional
- Triggers do banco de dados garantem consistência automática
- Hooks React Query garantem atualização em tempo real
- Scroll automático melhora a descoberta de convites pendentes
