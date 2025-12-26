# AUDITORIA COMPLETA: Sistema Atual vs PE copy (Produção)

## RESUMO EXECUTIVO

Comparação detalhada entre o sistema atual (`src/`) e o PE copy (`PE copy/producao/src/`). O PE copy é uma versão muito mais completa e robusta com:
- **Estrutura de dados 3x mais complexa** (mais campos, tabelas, validações)
- **Funcionalidades avançadas** (viagens com compras, contas internacionais, recorrência)
- **Arquitetura profissional** (hooks especializados, validações rigorosas, tratamento de erros)
- **Sistema de compartilhamento sofisticado** (mirrors, requests, sincronização)

---

## 1. REGRAS DE NEGÓCIO - DIFERENÇAS CRÍTICAS

### 1.1 PARTIDAS DOBRADAS (LEDGER)

#### Sistema Atual (`src/services/ledger.ts`)
```typescript
// Implementação básica
- Suporta EXPENSE, INCOME, TRANSFER
- Validação simples de contas
- Sem suporte a reembolsos (refunds)
- Sem tratamento de transações órfãs
```

#### PE copy (`PE copy/producao/src/services/ledger.ts`)
```typescript
// Implementação avançada
✅ Suporta EXPENSE, INCOME, TRANSFER
✅ Validação CRÍTICA: Ignora transações órfãs (conta deletada)
✅ Suporta REEMBOLSOS (isRefund):
   - Expense refund: Debit Account, Credit Category
   - Income refund: Debit Category, Credit Account
✅ Usa shouldShowTransaction() para filtrar transações
✅ Descrição customizada para reembolsos: "Reembolso: {description}"
```

**DIFERENÇA CRÍTICA**: PE copy trata reembolsos corretamente nas partidas dobradas.

---

### 1.2 VALIDAÇÕES DE TRANSAÇÕES

#### Sistema Atual
- Validação básica de duplicatas (3 dias, descrição, valor)
- Sem validação de data inválida
- Sem validação de limite de cartão
- Sem validação de parcelamento

#### PE copy (`PE copy/producao/src/services/validationService.ts`)
```typescript
✅ VALIDAÇÕES CRÍTICAS:
1. Data inválida (ex: 2024-02-30)
2. Data muito no futuro (>1 ano)
3. Data muito no passado (>1 ano)
4. Valor muito alto (>1.000.000)
5. Limite de cartão será ultrapassado
6. Parcelamento mínimo 2, máximo 48
7. Parcelamento em conta não-cartão (warning)
8. Divisão compartilhada > valor total (ERROR)
9. Soma de percentagens ≠ 100% (ERROR)
10. Duplicatas exatas (description, amount, date, account)
```

**DIFERENÇA CRÍTICA**: PE copy tem validações muito mais rigorosas.

---

### 1.3 OBRIGATORIEDADE DE CONTA/CARTÃO

#### Sistema Atual
- Conta é obrigatória para EXPENSE/INCOME
- Sem validação de tipo de conta para operações específicas

#### PE copy
```typescript
✅ REGRAS ESTRITAS:
1. EXPENSE: Requer account_id OU payerId
2. INCOME: Requer account_id
3. TRANSFER: Requer account_id E destination_account_id
4. TRANSFER: Nunca pode ir para CREDIT_CARD
5. TRANSFER: Validação de moeda (conversão vs transferência)
6. TRIP EXPENSES: Apenas contas com mesma moeda da viagem
```

**DIFERENÇA CRÍTICA**: PE copy valida tipos de conta e moedas.

---

### 1.4 REGRAS DE COMPARTILHAMENTO

#### Sistema Atual
- Splits básicos com member_id
- Sem validação de soma de percentagens
- Sem sistema de requests/mirrors
- Sem sincronização entre usuários

#### PE copy
```typescript
✅ SISTEMA COMPLETO DE COMPARTILHAMENTO:

1. SHARED TRANSACTION MIRRORS:
   - Transação original criada por pagador
   - Mirror transaction criada para cada devedor
   - Sincronização automática de status
   - Rastreamento de erros de sincronização

2. SHARED TRANSACTION REQUESTS:
   - Requester cria request
   - Invited user responde (accept/reject)
   - Retry automático com backoff exponencial
   - Expiração de requests (configurable)

3. VALIDAÇÕES:
   - Soma de percentagens = 100%
   - Soma de valores ≤ valor total
   - Cada split tem assignedAmount
   - Rastreamento de isSettled por split

4. DEBIT LOGIC (Quando outro pagou):
   - Busca payer_id (UUID do auth)
   - Mapeia para family_member via linkedUserId
   - Fallback: Fuzzy match por nome em "(Compartilhado por NAME)"
   - Calcula myShare = total - outros splits
```

**DIFERENÇA CRÍTICA**: PE copy tem sistema robusto de sincronização e requests.

---

## 2. ESTRUTURA DE DADOS - CAMPOS FALTANDO

### 2.1 TABELA TRANSACTIONS

#### Sistema Atual
```sql
- id, user_id, account_id, destination_account_id
- category_id, trip_id, amount, description, date
- type, domain, is_shared, payer_id
- is_installment, current_installment, total_installments, series_id
- is_recurring, recurrence_pattern
- source_transaction_id, external_id, sync_status
- notes, created_at, updated_at
```

#### PE copy (CAMPOS ADICIONAIS)
```sql
✅ CAMPOS FALTANDO NO SISTEMA ATUAL:

1. REEMBOLSOS:
   - is_refund BOOLEAN
   - refund_of_transaction_id UUID (referência)

2. RECORRÊNCIA AVANÇADA:
   - frequency TEXT (DAILY, WEEKLY, MONTHLY, YEARLY)
   - recurrence_day INTEGER
   - last_generated TIMESTAMP
   - recurring_rule_id UUID

3. NOTIFICAÇÕES:
   - enable_notification BOOLEAN
   - notification_date DATE
   - reminder_option TEXT

4. PARCELAMENTO AVANÇADO:
   - installment_plan_id UUID
   - original_amount NUMERIC

5. COMPARTILHAMENTO AVANÇADO:
   - creator_user_id UUID (quem criou)
   - related_member_id UUID (membro relacionado)
   - shared_with JSON (array de splits)

6. TRANSFERÊNCIAS INTERNACIONAIS:
   - destination_amount NUMERIC
   - destination_currency TEXT
   - exchange_rate NUMERIC

7. RECONCILIAÇÃO:
   - reconciled BOOLEAN
   - reconciled_at TIMESTAMP
   - reconciled_by UUID
   - reconciled_with TEXT
   - bank_statement_id UUID
   - statement_id UUID

8. VIAGEM:
   - observation TEXT (campo adicional)

9. ESPELHO:
   - is_mirror BOOLEAN
   - mirror_transaction_id UUID
   - linked_transaction_id UUID
   - settled_by_tx_id UUID
```

### 2.2 TABELA ACCOUNTS

#### Sistema Atual
```sql
- id, user_id, name, type, balance
- bank_id, bank_color, bank_logo, currency
- is_active, closing_day, due_day, credit_limit
- created_at, updated_at
```

#### PE copy (CAMPOS ADICIONAIS)
```sql
✅ CAMPOS FALTANDO:
- initial_balance NUMERIC (saldo inicial)
- is_international BOOLEAN (conta internacional)
- deleted BOOLEAN (soft delete)
- sync_status TEXT
```

### 2.3 TABELA TRIPS

#### Sistema Atual
```sql
- id, owner_id, name, destination
- start_date, end_date, currency, budget
- status, cover_image, notes
- created_at, updated_at
```

#### PE copy (CAMPOS ADICIONAIS)
```sql
✅ CAMPOS FALTANDO:
- participants JSON (array de participantes)
- itinerary JSON (roteiro)
- checklist JSON (checklist)
- shopping_list JSON (lista de compras) ← ABA "COMPRAS"
- exchange_entries JSON (câmbio)
- source_trip_id UUID (viagem espelho)
```

### 2.4 NOVAS TABELAS NO PE copy

```sql
✅ TABELAS FALTANDO NO SISTEMA ATUAL:

1. account_types
   - code, name, category, nature
   - parent_code (hierarquia)

2. shared_transaction_requests
   - transaction_id, requester_id, invited_user_id
   - status, assigned_amount, expires_at
   - retry_count, last_retry_at, error_message

3. shared_system_audit_logs
   - operation_type, operation_data
   - success, error_message, execution_time_ms

4. shared_operation_queue
   - operation_type, operation_data
   - status, retry_count, max_retries
   - next_retry_at, completed_at

5. shared_circuit_breaker
   - operation_type, circuit_state
   - failure_count, last_failure_at
```

---

## 3. FORMULÁRIOS - DIFERENÇAS

### 3.1 TRANSACTION FORM

#### Sistema Atual (`src/components/transactions/TransactionForm.tsx`)
```typescript
- Abas: EXPENSE, INCOME, TRANSFER
- Campos: amount, description, date, account, category
- Parcelamento: isInstallment, totalInstallments
- Compartilhamento: splits, payerId
- Detecção de duplicatas (3 dias)
- Sem validação de moeda
- Sem suporte a reembolsos
- Sem recorrência
- Sem notificações
```

#### PE copy (`PE copy/producao/src/features/transactions/TransactionForm.tsx`)
```typescript
✅ CAMPOS ADICIONAIS:

1. REEMBOLSOS:
   - isRefund toggle
   - Descrição customizada

2. RECORRÊNCIA:
   - isRecurring toggle
   - frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
   - recurrenceDay (1-31)

3. NOTIFICAÇÕES:
   - enableNotification toggle
   - notificationDate
   - reminderOption

4. TRANSFERÊNCIAS INTERNACIONAIS:
   - isConversion toggle
   - manualExchangeRate
   - destinationAmount
   - destinationCurrency

5. VALIDAÇÕES:
   - Validação de moeda (trip expenses)
   - Validação de tipo de conta
   - Validação de limite de cartão
   - Validação de data inválida

6. OWNERSHIP CHECK:
   - Verifica se user é owner (userId matches)
   - Verifica se user criou (createdBy matches)
   - isReadOnly para transações de outros

7. LOCK LOGIC:
   - Mirror transactions são read-only
   - sourceTransactionId indica transação espelho
```

### 3.2 ACCOUNT FORM

#### Sistema Atual
- Campos básicos: name, type, balance, currency
- Sem validação de campos obrigatórios por tipo

#### PE copy
```typescript
✅ VALIDAÇÕES POR TIPO:

CREDIT_CARD:
- limit obrigatório (>0)
- closingDay obrigatório (1-31)
- dueDay obrigatório (1-31)

TODOS:
- name obrigatório
- type obrigatório
- balance validado (não >10.000.000)

INTERNACIONAL:
- is_international flag
- currency pode ser diferente de BRL
```

### 3.3 TRIP FORM

#### Sistema Atual
- Campos básicos: name, destination, dates, budget, currency

#### PE copy
```typescript
✅ CAMPOS ADICIONAIS:

1. SHOPPING LIST (ABA "COMPRAS"):
   - TripShoppingItem[]
   - item: string
   - estimatedCost: number
   - purchased: boolean
   - Cálculo de total de gastos

2. ITINERARY:
   - date, title, description
   - location, start_time, end_time
   - order_index

3. CHECKLIST:
   - item, is_completed
   - assigned_to (trip_participant)
   - category, order_index

4. EXCHANGE:
   - Rastreamento de câmbio
   - Taxas de conversão

5. PARTICIPANTS:
   - personal_budget por participante
   - Rastreamento de gastos individuais
```

---

## 4. FUNCIONALIDADES FALTANDO

### 4.1 ABA "COMPRAS" EM VIAGENS

#### Sistema Atual
❌ NÃO EXISTE

#### PE copy
✅ IMPLEMENTADO (`PE copy/producao/src/features/trips/tabs/TripShopping.tsx`)
```typescript
- Lista de desejos (shopping list)
- Cada item tem: item, estimatedCost, purchased
- Cálculo de previsão total de gastos
- Editar/deletar itens
- Marcar como comprado (checkbox)
- Otimistic updates
- Sincronização com servidor
```

### 4.2 CONTAS/CARTÕES INTERNACIONAIS

#### Sistema Atual
- Campo `is_international` existe mas não é usado
- Sem validação de moeda
- Sem suporte a transferências com câmbio

#### PE copy
✅ IMPLEMENTADO
```typescript
- is_international flag em accounts
- currency pode ser diferente de BRL
- Transferências internacionais com exchange_rate
- destination_amount e destination_currency
- Validação: Trip expenses apenas com mesma moeda
- Conversão vs Transferência (isConversion flag)
```

### 4.3 FILTRO POR MÊS EM RELATÓRIOS

#### Sistema Atual
- Sem filtro por mês específico
- Sem contexto de mês ativo

#### PE copy
✅ IMPLEMENTADO
```typescript
- MonthContext (contexto global de mês)
- useSharedFinances com activeTab e currentDate
- Filtro por mês em invoices
- isSameMonth() para comparação
- Relatórios mensais específicos
```

### 4.4 GASTOS POR PESSOA

#### Sistema Atual
- Sem relatório de gastos por pessoa
- Sem análise de quem gastou mais

#### PE copy
✅ IMPLEMENTADO
```typescript
- Análise de gastos por family_member
- Rastreamento de quem pagou
- Rastreamento de quem deve
- Relatório de débitos/créditos por pessoa
- Cálculo de acertos (settlements)
```

### 4.5 SISTEMA DE ACERTO IGUAL FATURA

#### Sistema Atual
- Splits básicos
- Sem sistema de requests
- Sem sincronização de acertos

#### PE copy
✅ IMPLEMENTADO
```typescript
- shared_transaction_requests table
- Requester cria request
- Invited user responde
- Retry automático
- Expiração de requests
- Rastreamento de status
- Sincronização de acertos
```

---

## 5. ARQUITETURA E PADRÕES

### 5.1 HOOKS ESPECIALIZADOS

#### Sistema Atual
```typescript
- useAccounts
- useCategories
- useTransactions
- useTrips
- useFamilyMembers
- useSharedFinances
- usePermissions
- useAssets
- useBudgets
- useGoals
```

#### PE copy (HOOKS ADICIONAIS)
```typescript
✅ HOOKS ESPECIALIZADOS:

1. useTransactionForm
   - Gerencia estado completo do formulário
   - Validações integradas
   - Detecção de duplicatas
   - Cálculo de exchange rate

2. useTransactionStore
   - Estado centralizado de transações
   - Cache local
   - Sincronização

3. useAccountStore
   - Estado centralizado de contas
   - Validações por tipo

4. useTripStore
   - Estado centralizado de viagens
   - Gerenciamento de shopping list

5. useSharedFinances
   - Lógica de compartilhamento
   - Cálculo de débitos/créditos
   - Filtro por mês

6. useDataConsistency
   - Verificação de integridade
   - Detecção de inconsistências

7. useErrorTracker
   - Rastreamento de erros
   - Logging estruturado

8. useNetworkStatus
   - Detecção de conectividade
   - Sincronização offline

9. useSmartNotifications
   - Notificações inteligentes
   - Deduplicação

10. useKeyboardShortcuts
    - Atalhos de teclado
    - Acessibilidade
```

### 5.2 SERVIÇOS ESPECIALIZADOS

#### Sistema Atual
```typescript
- ledger.ts
- SafeFinancialCalculator.ts
```

#### PE copy (SERVIÇOS ADICIONAIS)
```typescript
✅ SERVIÇOS ESPECIALIZADOS:

1. validationService.ts
   - Validação de transações
   - Validação de contas
   - Validação de orçamentos

2. transactionService.ts
   - Operações CRUD de transações
   - Sincronização

3. SharedTransactionManager.ts
   - Gerenciamento de transações compartilhadas
   - Cache local
   - Auto-sync
   - Event emitter

4. financialPrecision.ts
   - Cálculos financeiros precisos
   - Arredondamento correto

5. integrityService.ts
   - Verificação de integridade
   - Reconciliação

6. exportUtils.ts
   - Exportação de dados
   - Múltiplos formatos

7. pdfService.ts
   - Geração de PDFs
   - Relatórios

8. ofxParser.ts
   - Parse de arquivos OFX
   - Importação de banco

9. currencyService.ts
   - Conversão de moedas
   - Taxas de câmbio

10. tripDebtsCalculator.ts
    - Cálculo de débitos em viagens
    - Acertos automáticos
```

### 5.3 ESTRUTURA DE DIRETÓRIOS

#### Sistema Atual
```
src/
├── components/
│   ├── auth/
│   ├── family/
│   ├── financial/
│   ├── layout/
│   ├── modals/
│   ├── shared/
│   ├── transactions/
│   └── ui/
├── contexts/
├── hooks/
├── integrations/
├── lib/
├── pages/
├── services/
└── types/
```

#### PE copy (ESTRUTURA PROFISSIONAL)
```
src/
├── __tests__/
├── analysis/
├── cleanup/
├── components/
│   ├── accounts/
│   ├── family/
│   ├── forms/
│   ├── goals/
│   ├── investments/
│   ├── layout/
│   ├── settings/
│   ├── shared/
│   └── ui/
├── config/
├── contexts/
├── core/
│   ├── engines/
│   └── services/
├── features/
│   ├── dashboard/
│   ├── transactions/
│   └── trips/
├── hooks/
├── integrations/
├── refactoring/
├── services/
├── shared/
├── types/
└── utils/
```

---

## 6. VALIDAÇÕES E TRATAMENTO DE ERROS

### 6.1 VALIDAÇÃO DE TRANSAÇÕES

#### Sistema Atual
- Validação básica de duplicatas
- Sem validação de data
- Sem validação de limite

#### PE copy
```typescript
✅ VALIDAÇÕES COMPLETAS:

1. Campos obrigatórios
2. Data válida (não 2024-02-30)
3. Data razoável (±1 ano)
4. Valor razoável (<1.000.000)
5. Limite de cartão
6. Parcelamento válido (2-48)
7. Divisão válida (100%, ≤total)
8. Duplicatas exatas
9. Tipo de conta apropriado
10. Moeda consistente
```

### 6.2 TRATAMENTO DE ERROS

#### Sistema Atual
- Erros básicos com toast
- Sem logging estruturado
- Sem retry automático

#### PE copy
```typescript
✅ TRATAMENTO ROBUSTO:

1. errorHandler.ts
   - Mapeamento de erros
   - Mensagens customizadas

2. logger.ts
   - Logging estruturado
   - Níveis de severidade

3. Retry automático
   - Backoff exponencial
   - Max retries configurável

4. Circuit breaker
   - Proteção contra falhas
   - Estado: CLOSED, OPEN, HALF_OPEN

5. Audit logs
   - Rastreamento de operações
   - Sucesso/erro
   - Tempo de execução
```

---

## 7. POLÍTICAS RLS (ROW LEVEL SECURITY)

### 7.1 Sistema Atual
- RLS básico por user_id
- Sem validação de family membership
- Sem validação de trip participation

### 7.2 PE copy
```sql
✅ RLS AVANÇADO:

1. PROFILES
   - Usuários veem apenas seu perfil

2. FAMILIES
   - Owners veem suas famílias
   - Members veem famílias onde estão

3. FAMILY_MEMBERS
   - Owners gerenciam membros
   - Members veem membros da família

4. ACCOUNTS
   - Usuários veem apenas suas contas

5. TRANSACTIONS
   - Usuários veem apenas suas transações
   - Não podem editar transações espelho (source_transaction_id IS NOT NULL)

6. TRANSACTION_SPLITS
   - Usuários veem splits de suas transações
   - Usuários veem splits onde estão envolvidos

7. TRIPS
   - Owners veem suas viagens
   - Participants veem viagens onde estão

8. TRIP_PARTICIPANTS
   - Owners gerenciam participantes
   - Participants veem participantes da viagem

9. TRIP_ITINERARY
   - Apenas participants veem

10. TRIP_CHECKLIST
    - Participants podem gerenciar
```

---

## 8. FUNÇÕES E TRIGGERS

### 8.1 Sistema Atual
```sql
- update_updated_at_column()
- handle_new_user()
- is_family_member()
- is_trip_participant()
- get_user_family_id()
```

### 8.2 PE copy (FUNÇÕES ADICIONAIS)
```sql
✅ FUNÇÕES AVANÇADAS:

1. create_shared_transaction_v2()
   - Cria transação compartilhada
   - Cria mirrors para cada devedor
   - Retorna JSON com status

2. respond_to_shared_request_v2()
   - Responde a request
   - Accept/reject
   - Cria transação se aceito

3. sync_shared_transaction_v2()
   - Sincroniza transação compartilhada
   - Atualiza mirrors
   - Retorna status

4. calculate_next_retry()
   - Calcula próxima tentativa
   - Backoff exponencial

5. enqueue_operation()
   - Enfileira operação
   - Retry automático

6. check_circuit_breaker()
   - Verifica circuit breaker
   - Retorna estado

7. run_full_reconciliation()
   - Reconciliação completa
   - Verifica integridade

8. verify_shared_system_integrity()
   - Verifica integridade do sistema
   - Retorna problemas encontrados

9. get_pending_shared_requests()
   - Retorna requests pendentes
   - Com informações do requester

10. get_shared_system_stats()
    - Estatísticas do sistema
    - Operações, erros, etc
```

---

## 9. TIPOS E INTERFACES

### 9.1 Sistema Atual
- Tipos básicos em `src/types/database.ts`
- Sem tipos para validação
- Sem tipos para erros

### 9.2 PE copy
```typescript
✅ TIPOS COMPLETOS:

1. types/database.types.ts
   - Tipos gerados do Supabase
   - Mais campos que sistema atual

2. types/common.ts
   - Tipos genéricos reutilizáveis
   - FormData, FormErrors, etc

3. types/db.ts
   - Interfaces de banco de dados
   - DBTransaction, DBAccount, etc

4. types/settlement.ts
   - Tipos de acertos
   - Settlement logic

5. types/UserSettings.ts
   - Configurações de usuário

6. types/BaseProps.ts
   - Props base para componentes
   - Reduz duplicação
```

---

## 10. RESUMO DE DIFERENÇAS CRÍTICAS

| Aspecto | Sistema Atual | PE copy |
|---------|---------------|---------|
| **Campos de Transação** | 20 | 40+ |
| **Validações** | 5 | 20+ |
| **Hooks Especializados** | 10 | 25+ |
| **Serviços** | 2 | 15+ |
| **Tabelas de Banco** | 12 | 17+ |
| **Funções SQL** | 4 | 10+ |
| **Suporte a Reembolsos** | ❌ | ✅ |
| **Recorrência** | Básica | Avançada |
| **Notificações** | ❌ | ✅ |
| **Contas Internacionais** | ❌ | ✅ |
| **Aba Compras em Viagens** | ❌ | ✅ |
| **Sistema de Requests** | ❌ | ✅ |
| **Sincronização Automática** | ❌ | ✅ |
| **Circuit Breaker** | ❌ | ✅ |
| **Audit Logs** | ❌ | ✅ |
| **Testes Automatizados** | ❌ | ✅ |

---

## 11. RECOMENDAÇÕES

### PRIORIDADE ALTA (Implementar Primeiro)
1. ✅ Campos faltando em transactions (reembolsos, recorrência, notificações)
2. ✅ Validações rigorosas (data, limite, divisão)
3. ✅ Sistema de requests para compartilhamento
4. ✅ Aba "Compras" em viagens
5. ✅ Suporte a contas internacionais

### PRIORIDADE MÉDIA
6. ✅ Hooks especializados (useTransactionForm, useTransactionStore)
7. ✅ Serviços de validação e integridade
8. ✅ Filtro por mês em relatórios
9. ✅ Gastos por pessoa
10. ✅ Testes automatizados

### PRIORIDADE BAIXA
11. ✅ Circuit breaker e retry automático
12. ✅ Audit logs completos
13. ✅ Análise de código e refactoring
14. ✅ Cleanup e backup systems

