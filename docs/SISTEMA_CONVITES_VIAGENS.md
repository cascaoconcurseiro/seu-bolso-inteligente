# Sistema de Convites para Viagens

## ✅ Implementado

### 1. Banco de Dados

#### Tabela `trip_invitations`
```sql
CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  inviter_id UUID REFERENCES auth.users(id),
  invitee_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  UNIQUE(trip_id, invitee_id)
);
```

#### Trigger Automático
```sql
CREATE FUNCTION handle_trip_invitation_accepted()
-- Quando status muda para 'accepted':
-- 1. Adiciona user como member em trip_members
-- 2. Define can_edit_details = false
-- 3. Define can_manage_expenses = true
-- 4. Atualiza responded_at
```

#### RLS Policies
- Usuários veem convites que enviaram ou receberam
- Apenas owner da viagem pode criar convites
- Apenas convidado pode atualizar status (aceitar/rejeitar)

### 2. Frontend

#### Hooks Criados
- `usePendingTripInvitations()` - Busca convites pendentes do usuário
- `useSentTripInvitations(tripId)` - Busca convites enviados de uma viagem
- `useCreateTripInvitation()` - Cria novo convite
- `useAcceptTripInvitation()` - Aceita convite
- `useRejectTripInvitation()` - Rejeita convite

#### Componente `PendingTripInvitationsAlert`
- Mostra notificações de convites pendentes
- Exibe nome da viagem, destino, datas
- Mostra mensagem personalizada (se houver)
- Botões "Aceitar" e "Recusar"
- Toast amigável ao aceitar: "🎉 Você agora faz parte da viagem [nome]!"

#### Integração
- Adicionado no Dashboard abaixo dos convites de família
- `useCreateTrip` atualizado para criar convites ao invés de adicionar membros diretamente

## 🎯 Fluxo Completo

### Criar Viagem com Convites

1. **Wesley cria viagem "Férias em Paris"**
   - Preenche nome, destino, datas
   - Seleciona Fran como participante
   - Clica em "Criar"

2. **Sistema processa:**
   - Cria viagem no banco
   - Adiciona Wesley como owner (automático via trigger)
   - Cria convite para Fran com status "pending"
   - Mensagem: "Você foi convidado para participar da viagem Férias em Paris!"

3. **Fran recebe notificação:**
   - Ao abrir Dashboard, vê alerta azul
   - Mostra: nome da viagem, destino, datas
   - Botões: "Aceitar" ou "Recusar"

4. **Fran aceita:**
   - Trigger adiciona Fran em `trip_members` como "member"
   - Status do convite muda para "accepted"
   - Toast: "🎉 Você agora faz parte da viagem Férias em Paris! Convite de Wesley aceito. Boa viagem!"
   - Viagem aparece na lista de viagens da Fran

5. **Fran pode:**
   - ✅ Ver viagem
   - ✅ Adicionar gastos
   - ✅ Editar gastos
   - ✅ Ver lista de compras, roteiro, checklist
   - ❌ Editar nome da viagem
   - ❌ Editar período
   - ❌ Editar moeda
   - ❌ Adicionar/remover membros

### Espelhamento de Transações

Quando Wesley cria gasto compartilhado na viagem:
1. Transação original: `user_id = Wesley`, `trip_id = viagem`
2. Espelho para Fran: `user_id = Fran`, `trip_id = viagem` (mesmo ID!)
3. Ambos veem o gasto na aba "Gastos" da viagem
4. Função `handle_transaction_mirroring()` mantém o `trip_id`

## 📋 Diferenças: Convites vs Adição Direta

### Antes (Adição Direta)
- ❌ Membro era adicionado sem permissão
- ❌ Viagem aparecia automaticamente
- ❌ Sem notificação
- ❌ Sem opção de recusar

### Agora (Sistema de Convites)
- ✅ Membro recebe convite
- ✅ Pode aceitar ou recusar
- ✅ Notificação amigável
- ✅ Mensagem personalizada
- ✅ Controle sobre participação

## 🔧 Arquivos Criados/Modificados

### Backend
- Migration: `create_trip_invitations_system`

### Frontend
- `src/hooks/useTripInvitations.ts` (novo)
- `src/components/trips/PendingTripInvitationsAlert.tsx` (novo)
- `src/hooks/useTrips.ts` (atualizado - criar convites)
- `src/components/trips/NewTripDialog.tsx` (atualizado - texto)
- `src/pages/Dashboard.tsx` (atualizado - adicionar alerta)

## 🧪 Como Testar

### Teste 1: Criar Viagem com Convite
1. Login como Wesley
2. Criar nova viagem "Teste"
3. Selecionar Fran como participante
4. Verificar que viagem foi criada
5. Logout

### Teste 2: Receber e Aceitar Convite
1. Login como Fran
2. Verificar alerta azul no Dashboard
3. Ver detalhes do convite
4. Clicar em "Aceitar"
5. Ver toast de sucesso
6. Verificar que viagem aparece na lista

### Teste 3: Permissões
1. Como Fran, abrir viagem
2. Tentar editar nome (deve falhar no backend)
3. Adicionar gasto compartilhado (deve funcionar)
4. Verificar que Wesley vê o gasto

### Teste 4: Rejeitar Convite
1. Wesley cria outra viagem
2. Convida Fran
3. Fran rejeita
4. Viagem NÃO aparece para Fran
5. Status do convite = "rejected"

## ✅ Status Final

- ✅ Tabela de convites criada
- ✅ Trigger de aceitação automática
- ✅ RLS policies configuradas
- ✅ Hooks do frontend
- ✅ Componente de notificação
- ✅ Integração com Dashboard
- ✅ Mensagem amigável ao aceitar
- ✅ Espelhamento de transações com trip_id
- ✅ Sistema completo funcionando

## 🎉 Resultado

Agora o sistema de viagens compartilhadas funciona igual ao de família:
- Convites com aceitar/rejeitar
- Notificações amigáveis
- Controle de permissões
- Espelhamento automático de gastos
- Experiência completa e profissional!
