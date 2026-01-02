# Schema do Banco de Dados - Versão 1.0.0

## Tabelas Principais (26 tabelas)

### 1. accounts
Contas bancárias e cartões de crédito
- Suporte a contas nacionais e internacionais (30+ moedas)
- Tipos: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT
- Campos: balance, credit_limit, closing_day, due_day, currency

### 2. transactions
Transações financeiras (despesas, receitas, transferências)
- Tipos: EXPENSE, INCOME, TRANSFER
- Domínios: PERSONAL, SHARED, TRAVEL
- Suporte a parcelamento, recorrência, espelhamento
- Campos: amount, currency, competence_date, is_mirror

### 3. categories
Categorias hierárquicas (pais e filhos)
- 18 categorias pai + 200+ subcategorias
- Tipos: expense, income
- Campo parent_category_id para hierarquia

### 4. families
Grupos familiares para compartilhamento
- Um usuário pode ter uma família
- Owner gerencia membros e convites

### 5. family_members
Membros da família
- Roles: owner, admin, editor, viewer
- Status: active, pending, inactive
- Sharing scope: all, date_range, trip_only

### 6. family_invitations
Convites para família
- Status: pending, accepted, rejected, expired
- Configuração de escopo de compartilhamento

### 7. transaction_splits
Divisão de despesas entre membros
- Percentual e valor de cada membro
- Status de acerto (is_settled)
- Rastreamento de settlements

### 8. shared_transaction_mirrors
Espelhamento de transações compartilhadas
- Sincronização automática via trigger
- Status: SYNCED, PENDING, ERROR

### 9. trips
Viagens
- Orçamento, moeda, datas
- Status: PLANNING, ACTIVE, COMPLETED, CANCELLED
- Features: checklist, itinerário, câmbio

### 10. trip_members
Participantes de viagens
- Roles: owner, admin, member
- Permissões: can_edit_details, can_manage_expenses
- Orçamento pessoal

### 11. trip_invitations
Convites para viagens
- Status: pending, accepted, rejected

### 12. budgets
Orçamentos por categoria
- Períodos: MONTHLY, QUARTERLY, YEARLY
- Moeda configurável
- Privacidade (visível apenas para o dono)

### 13. profiles
Perfis de usuários
- Sincronizado com auth.users
- Campos: full_name, avatar_url, email

### 14. notifications
Sistema de notificações
- Tipos: FAMILY_INVITATION, TRIP_INVITATION, SETTLEMENT_REQUEST, etc.
- Prioridades: LOW, NORMAL, HIGH, URGENT
- Status: is_read, is_dismissed

### 15. notification_preferences
Preferências de notificação por usuário
- Configurações por tipo de notificação
- Email e push notifications

### 16. financial_ledger
Razão financeiro (débitos e créditos)
- Rastreamento de dívidas entre membros
- Acertos (settlements)

### 17. trip_checklist
Checklist de viagem
- Itens com categoria e responsável
- Status de conclusão

### 18. trip_itinerary
Itinerário de viagem
- Atividades por data
- Horários e localização

### 19. trip_exchange_purchases
Compras de câmbio
- Taxa de câmbio e CET
- Conversão BRL ↔ moeda estrangeira

### 20. trip_participants
Participantes de viagem (legado)
- Mantido para compatibilidade

### 21. pending_operations
Operações pendentes (fila de retry)
- Operações que falharam e precisam retry
- Status: PENDING, PROCESSING, COMPLETED, FAILED

### 22. category_keywords (IA - Desabilitado)
Palavras-chave para categorização automática
- Peso de relevância (1-10)

### 23. user_category_learning (IA - Desabilitado)
Aprendizado de categorias por usuário
- Confiança (0.0-1.0)
- Número de vezes usado

### 24-26. Views
- shared_transactions_view
- shared_transactions_for_current_user
- trip_budget_summary

## Tipos Customizados (ENUM)

- account_type: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT
- transaction_type: EXPENSE, INCOME, TRANSFER
- transaction_domain: PERSONAL, SHARED, TRAVEL
- trip_status: PLANNING, ACTIVE, COMPLETED, CANCELLED
- sync_status: SYNCED, PENDING, ERROR
- family_role: owner, admin, editor, viewer

## Índices Principais

- Índices em todas as foreign keys
- Índices compostos para queries frequentes
- Índices em campos de busca (description, name)
- Índices em datas (date, competence_date)

## Triggers Importantes

### 1. mirror_shared_transaction_trigger
Espelha transações compartilhadas para membros
- Dispara em INSERT/UPDATE de transaction_splits
- Cria transação espelho para cada membro

### 2. update_account_balance_trigger
Atualiza saldo de contas
- Dispara em INSERT/UPDATE/DELETE de transactions
- Calcula saldo baseado em tipo de transação

### 3. prevent_duplicate_mirrors_trigger
Previne duplicação de espelhamentos
- Verifica se já existe espelho antes de criar

### 4. cascade_delete_installments_trigger
Deleta série completa de parcelas
- Quando deleta uma parcela, deleta todas da série

## RLS Policies

Todas as tabelas têm Row Level Security ativado:

### Padrão Básico
- SELECT: usuário vê apenas seus dados
- INSERT: usuário cria apenas para si
- UPDATE: usuário atualiza apenas seus dados
- DELETE: usuário deleta apenas seus dados

### Compartilhamento Familiar
- Membros de família veem transações compartilhadas
- Baseado em sharing_scope (all, date_range, trip_only)

### Viagens
- Participantes veem transações da viagem
- Owner e admins têm permissões extras

## Estatísticas do Backup

- Total de Tabelas: 26
- Total de Usuários: 2
- Total de Transações: 25
- Migrations Aplicadas: 194

## Versão

- Data: 02/01/2026
- Versão: 1.0.0
- Status: Produção Estável
