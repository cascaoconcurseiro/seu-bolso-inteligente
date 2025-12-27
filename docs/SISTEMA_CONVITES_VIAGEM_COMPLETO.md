# Sistema de Convites de Viagem - Implementação Completa

## ✅ Status: FUNCIONANDO

O sistema de convites de viagem está totalmente funcional!

## O que foi Corrigido

### 1. Políticas RLS Ambíguas
**Problema**: Erro "column reference trip_id is ambiguous" ao aceitar convites

**Solução**: Aplicada migração que qualifica explicitamente as colunas nas políticas RLS:
- `trip_invitations.trip_id` em vez de apenas `trip_id`
- Removidas políticas duplicadas
- Adicionada política de DELETE

### 2. Visualização dos Convites
**Problema**: Convites não apareciam no Dashboard

**Solução**: 
- Componente `PendingTripInvitationsAlert` já estava implementado
- Políticas RLS estavam corretas
- Problema era a ambiguidade nas políticas que foi corrigida

## Como Funciona

### Fluxo Completo

```
1. CRIAR VIAGEM
   └─> Usuário cria viagem e seleciona membros da família
   └─> Sistema cria registros em trip_invitations
   └─> Status: 'pending'

2. VISUALIZAR CONVITES
   └─> Convites aparecem no Dashboard
   └─> Componente: PendingTripInvitationsAlert
   └─> Mostra: nome da viagem, destino, datas, quem convidou

3. ACEITAR CONVITE
   └─> Usuário clica em "Aceitar"
   └─> Status muda para 'accepted'
   └─> Trigger automático adiciona à trip_members
   └─> Usuário agora pode acessar a viagem

4. REJEITAR CONVITE
   └─> Usuário clica em "Recusar"
   └─> Status muda para 'rejected'
   └─> Convite desaparece do Dashboard
```

## Estrutura do Banco de Dados

### Tabela: trip_invitations
```sql
- id (uuid, PK)
- trip_id (uuid, FK → trips)
- inviter_id (uuid, FK → profiles) -- Quem enviou
- invitee_id (uuid, FK → profiles) -- Quem recebeu
- status ('pending' | 'accepted' | 'rejected')
- message (text, opcional)
- created_at (timestamp)
- updated_at (timestamp)
- responded_at (timestamp, nullable)
```

### Tabela: trip_members
```sql
- id (uuid, PK)
- trip_id (uuid, FK → trips)
- user_id (uuid, FK → auth.users)
- role ('owner' | 'member')
- can_edit_details (boolean)
- can_manage_expenses (boolean)
- personal_budget (numeric, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## Políticas RLS

### SELECT
```sql
-- Usuários podem ver convites enviados ou recebidos
trip_invitations.invitee_id = auth.uid() OR 
trip_invitations.inviter_id = auth.uid()
```

### INSERT
```sql
-- Apenas donos da viagem podem criar convites
EXISTS (
  SELECT 1 FROM trips 
  WHERE trips.id = trip_invitations.trip_id 
  AND trips.owner_id = auth.uid()
)
```

### UPDATE
```sql
-- Convidados podem atualizar status, ou quem enviou pode gerenciar
trip_invitations.invitee_id = auth.uid() OR 
trip_invitations.inviter_id = auth.uid()
```

### DELETE
```sql
-- Apenas quem enviou pode deletar convites
trip_invitations.inviter_id = auth.uid()
```

## Trigger Automático

### handle_trip_invitation_accepted()
```sql
-- Quando status muda para 'accepted':
1. Adiciona usuário à trip_members (role: 'member')
2. Define responded_at = NOW()
3. Evita duplicatas com ON CONFLICT DO NOTHING
```

## Componentes Frontend

### 1. PendingTripInvitationsAlert
**Localização**: `src/components/trips/PendingTripInvitationsAlert.tsx`
**Função**: Exibe convites pendentes no Dashboard
**Features**:
- Mostra nome da viagem
- Mostra destino e datas
- Mostra quem convidou
- Botões Aceitar/Recusar

### 2. usePendingTripInvitations
**Localização**: `src/hooks/useTripInvitations.ts`
**Função**: Hook para buscar convites pendentes
**Features**:
- Busca convites onde invitee_id = user.id
- Enriquece com dados da viagem e do inviter
- Auto-refresh quando janela ganha foco

### 3. useAcceptTripInvitation
**Localização**: `src/hooks/useTripInvitations.ts`
**Função**: Hook para aceitar convite
**Features**:
- Atualiza status para 'accepted'
- Invalida cache
- Mostra toast de sucesso

### 4. useRejectTripInvitation
**Localização**: `src/hooks/useTripInvitations.ts`
**Função**: Hook para rejeitar convite
**Features**:
- Atualiza status para 'rejected'
- Invalida cache
- Mostra toast de confirmação

## Testando o Sistema

### 1. Criar Convite
```typescript
// Em NewTripDialog.tsx
const handleCreateTrip = async (selectedMemberIds: string[]) => {
  await createTrip.mutateAsync({
    name: "Viagem Teste",
    destination: "Paris",
    start_date: "2025-06-01",
    end_date: "2025-06-10",
    memberIds: selectedMemberIds, // IDs dos membros convidados
  });
};
```

### 2. Ver Convites
- Abra o Dashboard
- Convites aparecem no topo da página
- Card azul com ícone de avião

### 3. Aceitar Convite
- Clique em "Aceitar"
- Toast de sucesso aparece
- Viagem aparece na lista de viagens
- Convite desaparece do Dashboard

### 4. Verificar Membership
```sql
-- No Supabase SQL Editor
SELECT * FROM trip_members 
WHERE user_id = auth.uid();
```

## Migrações Aplicadas

### fix_trip_invitations_ambiguous_column
**Data**: 27/12/2024
**Arquivo**: Gerado automaticamente pelo Supabase
**Conteúdo**:
- Remove políticas duplicadas
- Cria políticas com qualificação explícita
- Adiciona política de DELETE

## Próximas Melhorias (Opcional)

1. **Notificações por Email**: Enviar email quando receber convite
2. **Limite de Convites**: Limitar número de convites por viagem
3. **Expiração**: Convites expiram após X dias
4. **Mensagem Personalizada**: Campo de mensagem ao enviar convite
5. **Histórico**: Ver convites aceitos/rejeitados

## Troubleshooting

### Convites não aparecem
1. Verificar se usuário está autenticado
2. Verificar console do navegador para erros
3. Verificar se há convites no banco:
```sql
SELECT * FROM trip_invitations 
WHERE invitee_id = 'SEU_USER_ID' 
AND status = 'pending';
```

### Erro ao aceitar convite
1. Verificar políticas RLS
2. Verificar se trigger está ativo:
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'trip_invitations';
```

### Convite aceito mas não aparece na lista de viagens
1. Verificar trip_members:
```sql
SELECT * FROM trip_members 
WHERE user_id = 'SEU_USER_ID';
```
2. Verificar se trigger executou corretamente
3. Fazer refresh da página

## Conclusão

O sistema de convites de viagem está 100% funcional e pronto para uso em produção! 🎉

**Principais Features**:
- ✅ Criar convites ao criar viagem
- ✅ Visualizar convites pendentes
- ✅ Aceitar/Rejeitar convites
- ✅ Adicionar automaticamente à viagem
- ✅ Políticas RLS seguras
- ✅ UI intuitiva e responsiva
