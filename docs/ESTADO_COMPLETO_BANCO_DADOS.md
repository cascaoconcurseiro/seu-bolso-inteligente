# Estado Completo do Banco de Dados

**Data:** 27/12/2024  
**Projeto:** Seu Bolso Inteligente  
**Supabase Project ID:** vrrcagukyfnlhxuvnssp

## ✅ Todas as Tabelas Criadas

### 1. **accounts** - Contas bancárias e cartões
- Tipos: checking, savings, credit_card, investment
- Campos: name, type, balance, bank_color, credit_limit, etc.

### 2. **categories** - Categorias de transações
- Tipos: income, expense
- Campos: name, icon, type, color

### 3. **transactions** - Transações financeiras
- Tipos: EXPENSE, INCOME, TRANSFER
- Domínios: PERSONAL, SHARED, TRAVEL
- Campos importantes:
  - `is_shared` - Se é compartilhada
  - `is_mirror` - Se é espelho de outra transação
  - `source_transaction_id` - ID da transação original (para espelhos)
  - `trip_id` - Vinculada a viagem
  - `payer_id` - Quem pagou (para compartilhadas)
  - Parcelamento: `is_installment`, `current_installment`, `total_installments`
  - Recorrência: `is_recurring`, `recurrence_pattern`

### 4. **transaction_splits** - Divisão de despesas
- Vincula transação com membro da família
- Campos: `member_id`, `percentage`, `amount`

### 5. **shared_transaction_mirrors** - Controle de espelhamento
- Rastreia transações originais e seus espelhos
- Campos: `original_transaction_id`, `mirror_transaction_id`, `mirror_user_id`

### 6. **profiles** - Perfis de usuários
- Campos: `full_name`, `email`, `avatar_url`
- Vinculado a `auth.users`

### 7. **families** - Famílias
- Campos: `name`, `owner_id`

### 8. **family_members** - Membros da família
- Relacionamento bidirecional entre usuários
- Campos importantes:
  - `user_id` - Dono do relacionamento
  - `linked_user_id` - Pessoa vinculada (se cadastrada)
  - `name`, `email` - Dados locais (se não cadastrada)
  - **Escopo de compartilhamento:**
    - `sharing_scope` - all, trips_only, date_range, specific_trip
    - `scope_start_date`, `scope_end_date`
    - `scope_trip_id`

### 9. **family_invitations** - Convites de família
- Status: pending, accepted, rejected
- Trigger automático cria membros bidirecionais ao aceitar

### 10. **trips** - Viagens
- Campos: `name`, `destination`, `start_date`, `end_date`, `currency`, `budget`
- `owner_id` - Criador da viagem

### 11. **trip_members** - Membros de viagens
- Quem participa de cada viagem
- Permissões:
  - `role` - owner ou member
  - `can_edit_details` - Pode editar nome, período, moeda (apenas owner)
  - `can_manage_expenses` - Pode gerenciar gastos (todos)

### 12. **trip_invitations** - Convites para viagens
- Status: pending, accepted, rejected
- Trigger automático adiciona membro ao aceitar
- Campos: `message` - Mensagem personalizada

### 13. **trip_participants** - Participantes de viagem (legado)
- Usado para controle interno de participantes

### 14. **trip_itinerary** - Roteiro de viagem
- Itens do roteiro com data/hora

### 15. **trip_checklist** - Lista de tarefas da viagem
- Itens com status checked/unchecked

## 🔧 Funções e Triggers Principais

### Espelhamento de Transações
**Função:** `handle_transaction_mirroring()`
- Trigger: `trg_transaction_mirroring` (AFTER INSERT OR UPDATE OR DELETE)
- **O que faz:**
  - Quando transação compartilhada é criada, cria espelhos para cada membro
  - Mantém `trip_id` nos espelhos (CORRIGIDO)
  - Sincroniza updates
  - Deleta espelhos quando original é deletada
  - Usa `transaction_splits` para determinar valores

### Convites de Família
**Função:** `handle_invitation_accepted()`
- Trigger: `trg_family_invitation_accepted` (BEFORE UPDATE)
- **O que faz:**
  - Quando convite é aceito, cria membros bidirecionais
  - Copia escopo de compartilhamento
  - Usa `WHERE NOT EXISTS` para evitar duplicatas

### Convites de Viagem
**Função:** `handle_trip_invitation_accepted()`
- Trigger: `trg_trip_invitation_accepted` (BEFORE UPDATE)
- **O que faz:**
  - Quando convite é aceito, adiciona membro à viagem
  - Define permissões (member, can_manage_expenses=true)

### Owner Automático de Viagem
**Função:** `add_trip_owner()`
- Trigger: `trg_add_trip_owner` (AFTER INSERT)
- **O que faz:**
  - Adiciona criador como owner automaticamente

## 🔒 RLS (Row Level Security)

Todas as tabelas têm RLS habilitado com policies específicas:

### Transactions
- Usuários veem suas próprias transações
- Usuários veem transações espelhadas para eles
- Usuários veem transações de viagens que participam

### Family Members
- Usuários veem membros onde são `user_id` ou `linked_user_id`

### Trip Members
- Usuários veem membros de viagens que participam
- Apenas owner pode adicionar/remover membros

### Invitations (Family e Trip)
- Usuários veem convites que enviaram ou receberam
- Apenas convidado pode aceitar/rejeitar

## 📊 Migrações Aplicadas

Total: **29 migrações**

Últimas 5:
1. `add_sharing_scope_to_family_members` - Escopo de compartilhamento
2. `fix_mirror_trip_id` - Correção espelhamento com trip_id
3. `create_trip_sharing_system` - Sistema de membros de viagem
4. `create_trip_invitations_system` - Sistema de convites de viagem
5. Documentação de correções pendentes

## ✅ Status: COMPLETO

- ✅ Todas as tabelas criadas
- ✅ Todos os triggers funcionando
- ✅ Todas as RLS policies aplicadas
- ✅ Sistema de espelhamento corrigido
- ✅ Sistema de convites implementado
- ✅ Escopo de compartilhamento implementado
- ✅ Sistema de viagens compartilhadas completo
- ✅ Push para GitHub realizado

## 🚀 Pronto para Deploy

O banco de dados está completo e funcional. Todas as features implementadas:
- Transações pessoais, compartilhadas e de viagem
- Espelhamento automático
- Convites de família e viagem
- Escopo de compartilhamento
- Permissões diferenciadas
- Parcelamento e recorrência

**Próximos passos:** Deploy na Vercel para testar em produção.
