# Implementação de Compartilhamento de Viagens

## ✅ O que foi implementado

### 1. Banco de Dados

#### Tabela `trip_members`
```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'member')),
  can_edit_details BOOLEAN DEFAULT false,
  can_manage_expenses BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(trip_id, user_id)
);
```

#### Permissões (RLS)
- Usuários podem ver membros das viagens que participam
- Apenas o dono pode adicionar/remover membros
- Apenas o dono pode editar detalhes da viagem (nome, período, moeda)

#### Trigger Automático
- Ao criar uma viagem, o criador é automaticamente adicionado como `owner`

### 2. Frontend

#### Hooks Criados
- `useTripMembers(tripId)` - Busca membros de uma viagem
- `useAddTripMember()` - Adiciona membro à viagem
- `useRemoveTripMember()` - Remove membro da viagem
- `useTripPermissions(tripId)` - Verifica permissões do usuário

#### Componente `NewTripDialog`
- Campo para selecionar membros da família
- Checkbox para cada membro disponível
- Contador de membros selecionados
- Explicação das permissões

#### Atualização do `useCreateTrip`
- Aceita array de `memberIds`
- Adiciona membros automaticamente ao criar viagem

## 🎯 Como Funciona

### Criar Viagem com Membros

1. Usuário abre o diálogo "Nova Viagem"
2. Preenche nome, destino, datas, orçamento
3. **Seleciona membros da família** (opcional)
4. Ao criar:
   - Viagem é criada
   - Criador vira `owner` (automático via trigger)
   - Membros selecionados são adicionados como `member`

### Permissões

#### Owner (Criador)
- ✅ Ver viagem
- ✅ Editar nome, destino, período, moeda
- ✅ Adicionar/remover membros
- ✅ Gerenciar gastos
- ✅ Ver todas as abas

#### Member (Convidado)
- ✅ Ver viagem
- ❌ Editar nome, período, moeda
- ❌ Adicionar/remover membros
- ✅ Gerenciar gastos (adicionar, editar, deletar)
- ✅ Ver todas as abas (gastos, lista de compras, roteiro, checklist)

### Espelhamento de Transações

Quando um membro cria uma transação compartilhada na viagem:
- A transação original fica com o `trip_id` da viagem
- O espelho também recebe o mesmo `trip_id`
- Ambos aparecem na aba "Gastos" da viagem
- Função `handle_transaction_mirroring()` foi corrigida para manter o `trip_id`

## 📋 Próximos Passos (Opcional)

### 1. UI para Gerenciar Membros
- [ ] Mostrar lista de membros na página da viagem
- [ ] Botão para adicionar mais membros depois de criar
- [ ] Botão para remover membros (apenas owner)
- [ ] Badge mostrando quem é owner vs member

### 2. Restrições no Frontend
- [ ] Desabilitar campos de edição para members
- [ ] Esconder botões de adicionar/remover membros para non-owners
- [ ] Mostrar mensagem explicativa quando member tentar editar

### 3. Notificações
- [ ] Notificar membros quando são adicionados a uma viagem
- [ ] Sistema similar ao de convites de família

## 🔧 Arquivos Modificados

### Backend (Supabase)
- Migration: `create_trip_sharing_system`
- Migration: `fix_mirror_trip_id`

### Frontend
- `src/hooks/useTripMembers.ts` (novo)
- `src/hooks/useTrips.ts` (atualizado)
- `src/components/trips/NewTripDialog.tsx` (novo)
- `src/pages/Trips.tsx` (atualizado)

## 🧪 Como Testar

1. **Criar viagem com membros:**
   - Login como Wesley
   - Criar nova viagem
   - Selecionar Fran como membro
   - Verificar que viagem aparece para ambos

2. **Testar permissões:**
   - Login como Fran
   - Tentar editar nome da viagem (deve falhar no backend)
   - Adicionar gasto compartilhado (deve funcionar)
   - Verificar que gasto aparece para Wesley

3. **Espelhamento:**
   - Wesley cria gasto compartilhado na viagem
   - Verificar que aparece para Fran na mesma viagem
   - Verificar que `trip_id` está correto em ambos

## ✅ Status

- ✅ Banco de dados configurado
- ✅ RLS policies aplicadas
- ✅ Trigger de owner automático
- ✅ Hooks do frontend criados
- ✅ Componente de seleção de membros
- ✅ Integração com criação de viagem
- ✅ Espelhamento de transações com trip_id
- ⏳ UI de gerenciamento de membros (pendente)
- ⏳ Restrições visuais no frontend (pendente)
