# Tasks: Correção de Problemas Críticos do Seu Bolso Inteligente

## Fase 1: Requisitos Críticos (Semana 1)

### Task 1.1: Remover console.log de Produção
- **Requisito**: Req 2
- **Descrição**: Remover todas as instruções console.log/console.error de 7 arquivos críticos e substituir por logger.debug() ou logger.error()
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts (9 ocorrências)
  - src/hooks/useSharedFinances.ts (múltiplas)
  - src/hooks/useSettlement.ts (1)
  - src/services/auditLog.ts (4)
  - src/hooks/useCategories.ts (1)
  - src/hooks/useAnticipateInstallments.ts (6)
  - src/hooks/useAccountStatement.ts (2)
- **Subtasks**:
  - [x] Verificar/melhorar src/utils/logger.ts com funções debug, error, warn, info
  - [x] Remover console.log de useTransactions.ts
  - [x] Remover console.log de useSharedFinances.ts
  - [x] Remover console.log de useSettlement.ts
  - [x] Remover console.log de auditLog.ts
  - [x] Remover console.log de useCategories.ts
  - [x] Remover console.log de useAnticipateInstallments.ts
  - [x] Remover console.log de useAccountStatement.ts
  - [x] Verificar com grep que não há mais console.log em produção
- **Dependências**: Nenhuma
- **Prioridade**: CRÍTICA

### Task 1.2: Corrigir Problemas de Fuso Horário
- **Requisito**: Req 3
- **Descrição**: Usar date-fns com UTC para todas as operações de data, removendo new Date() de lógica de parcelamento
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts (linhas 380-430)
  - src/lib/invoiceUtils.ts (linhas 20-50)
  - src/hooks/useSharedFinances.ts (linhas 80-120)
- **Subtasks**:
  - [x] Criar/melhorar src/lib/dateUtils.ts com funções parseDate, formatDate, getCompetenceDate, addMonthsToDate
  - [x] Atualizar useTransactions.ts para usar dateUtils em lógica de parcelamento
  - [x] Atualizar invoiceUtils.ts para usar dateUtils em parsing e formatação
  - [x] Atualizar useSharedFinances.ts para usar dateUtils.getCompetenceDate()
  - [x] Remover todas as instâncias de new Date(year, month-1, day)
  - [x] Testar com múltiplos fusos horários
- **Dependências**: Task 1.1 (para remover console.log de debug)
- **Prioridade**: CRÍTICA

### Task 1.3: Validar Payer_ID Antes de Criar Splits
- **Requisito**: Req 4
- **Descrição**: Validar que payer_id existe em family_members ANTES de criar splits ou transações
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts (linhas 310-330)
- **Subtasks**:
  - [x] Criar função validatePayerId() em useTransactions.ts
  - [x] Chamar validatePayerId() ANTES de criar transaction
  - [x] Se validação falhar, lançar erro descritivo
  - [x] Testar com payer_id válido e inválido
- **Dependências**: Task 1.2 (para usar dateUtils)
- **Prioridade**: CRÍTICA

### Task 1.4: Implementar Operações de Liquidação Atômicas
- **Requisito**: Req 5
- **Descrição**: Usar RPC functions para garantir que operações de settlement são atômicas (tudo-ou-nada)
- **Arquivos Afetados**:
  - src/hooks/useSettlement.ts (linhas 1-250)
  - Database RPC functions
- **Subtasks**:
  - [-] Criar RPC function settle_split() no Supabase
  - [-] Criar RPC function settle_multiple_splits() no Supabase
  - [-] Criar RPC function unsettleWithReversal() no Supabase
  - [~] Atualizar useSettlement.ts para usar RPC em vez de múltiplas operações
  - [~] Implementar retry logic com rpcWithRetry()
  - [~] Testar atomicidade com falhas simuladas
- **Dependências**: Task 1.3 (para validação de payer_id)
- **Prioridade**: CRÍTICA

### Task 1.5: Estabelecer Infraestrutura de Testes Automatizados
- **Requisito**: Req 1
- **Descrição**: Setup Jest/Vitest com cobertura de 80% para SafeFinancialCalculator, splits, e settlement
- **Arquivos Afetados**:
  - tests/unit/SafeFinancialCalculator.test.ts (novo)
  - tests/unit/invoiceUtils.test.ts (novo)
  - tests/unit/settlementValidation.test.ts (novo)
  - tests/integration/useTransactions.test.ts (novo)
  - tests/integration/useSettlement.test.ts (novo)
  - tests/integration/useSharedFinances.test.ts (novo)
  - vitest.config.ts (novo)
- **Subtasks**:
  - [~] Instalar vitest, @vitest/ui, fast-check
  - [~] Criar vitest.config.ts
  - [~] Criar SafeFinancialCalculator.test.ts com property-based tests
  - [~] Criar invoiceUtils.test.ts
  - [~] Criar settlementValidation.test.ts
  - [~] Criar useTransactions.test.ts
  - [~] Criar useSettlement.test.ts
  - [~] Criar useSharedFinances.test.ts
  - [~] Atingir 80% cobertura para módulos críticos
  - [~] Configurar coverage reporter
- **Dependências**: Task 1.1, 1.2, 1.3, 1.4 (para testar)
- **Prioridade**: CRÍTICA

---

## Fase 2: Requisitos Altos (Semana 2)

### Task 2.1: Implementar RPC com Retry Logic
- **Requisito**: Req 7
- **Descrição**: Criar wrapper rpcWithRetry() com backoff exponencial para todas as chamadas RPC
- **Arquivos Afetados**:
  - src/utils/rpcWithRetry.ts (novo)
  - src/hooks/useSettlement.ts
  - src/hooks/useTransactions.ts
  - src/hooks/useSharedFinances.ts
- **Subtasks**:
  - [~] Criar src/utils/rpcWithRetry.ts com retry logic
  - [~] Implementar backoff exponencial
  - [~] Adicionar logging de tentativas
  - [~] Atualizar useSettlement.ts para usar rpcWithRetry()
  - [~] Atualizar useTransactions.ts para usar rpcWithRetry()
  - [~] Atualizar useSharedFinances.ts para usar rpcWithRetry()
  - [~] Testar com falhas simuladas
- **Dependências**: Task 1.1 (para logger)
- **Prioridade**: ALTA

### Task 2.2: Adicionar Segurança de Tipo (Type Safety)
- **Requisito**: Req 6
- **Descrição**: Remover todos os tipos `any` de arquivos críticos e usar interfaces explícitas
- **Arquivos Afetados**:
  - src/hooks/useSharedExpensesActions.ts
  - src/hooks/useAccounts.ts
  - src/services/notificationGenerator.ts
  - src/types/database.ts
- **Subtasks**:
  - [~] Revisar useSharedExpensesActions.ts e criar interfaces
  - [~] Revisar useAccounts.ts e criar interfaces
  - [~] Revisar notificationGenerator.ts e criar interfaces
  - [~] Atualizar types/database.ts com tipos faltantes
  - [~] Remover todos os tipos `any`
  - [~] Verificar que TypeScript compila sem erros
- **Dependências**: Nenhuma
- **Prioridade**: ALTA

### Task 2.3: Validar Member_ID Antes de Criar Splits
- **Requisito**: Req 11
- **Descrição**: Validar que member_id existe em family_members ANTES de criar splits
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts (linhas 450-510)
- **Subtasks**:
  - [~] Criar função validateMemberId() em useTransactions.ts
  - [~] Chamar validateMemberId() ANTES de criar splits
  - [ ] Se validação falhar, lançar erro descritivo
  - [~] Testar com member_id válido e inválido
- **Dependências**: Task 1.3 (para padrão de validação)
- **Prioridade**: ALTA

### Task 2.4: Implementar Validação com Zod
- **Requisito**: Req 9
- **Descrição**: Usar Zod para validação robusta de entrada em formulários
- **Arquivos Afetados**:
  - src/lib/validation.ts (novo)
  - src/pages/CreditCards.tsx
  - src/pages/AccountDetail.tsx
  - src/pages/Accounts.tsx
  - src/hooks/useTransactions.ts
- **Subtasks**:
  - [~] Criar src/lib/validation.ts com schemas Zod
  - [~] Criar TransactionSchema com validações
  - [~] Criar SplitSchema com validações
  - [~] Criar AccountSchema com validações
  - [~] Atualizar formulários para usar Zod
  - [~] Adicionar mensagens de erro claras
  - [~] Testar validação com dados inválidos
- **Dependências**: Task 2.2 (para type safety)
- **Prioridade**: ALTA

### Task 2.5: Habilitar e Testar Categorização Automática
- **Requisito**: Req 8
- **Descrição**: Identificar por que categorização automática foi desabilitada, corrigir, e habilitar com fallback
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts
  - src/services/categorizationEngine.ts (se existe)
- **Subtasks**:
  - [~] Investigar por que categorização foi desabilitada
  - [~] Identificar e corrigir causa raiz
  - [~] Implementar fallback (não bloqueia transação)
  - [~] Adicionar testes para categorização
  - [~] Habilitar categorização automática
- **Dependências**: Task 1.1 (para logger)
- **Prioridade**: ALTA

### Task 2.6: Adicionar Testes Abrangentes para Finanças Compartilhadas
- **Requisito**: Req 10
- **Descrição**: Adicionar testes para splits, settlement, e cálculos de fatura
- **Arquivos Afetados**:
  - tests/integration/useSharedFinances.test.ts
  - tests/unit/sharedFinancesCalculations.test.ts (novo)
- **Subtasks**:
  - [~] Criar testes para cálculo de splits
  - [~] Criar testes para validação de splits
  - [~] Criar testes para settlement
  - [~] Criar testes para cálculo de fatura
  - [~] Criar testes para múltiplas moedas
  - [~] Atingir 80% cobertura
- **Dependências**: Task 1.5 (para infraestrutura de testes)
- **Prioridade**: ALTA

---

## Fase 3: Requisitos Médios (Semana 3)

### Task 3.1: Implementar Invalidação de Cache Consistente
- **Requisito**: Req 14
- **Descrição**: Centralizar invalidação de cache em queryInvalidation.ts
- **Arquivos Afetados**:
  - src/utils/queryInvalidation.ts (novo)
  - src/hooks/useTransactions.ts
  - src/hooks/useSettlement.ts
  - src/hooks/useSharedFinances.ts
- **Subtasks**:
  - [~] Criar src/utils/queryInvalidation.ts
  - [~] Criar funções invalidateTransactionQueries, invalidateFinancialQueries, invalidateSharedQueries
  - [~] Atualizar useTransactions.ts para usar invalidation
  - [~] Atualizar useSettlement.ts para usar invalidation
  - [~] Atualizar useSharedFinances.ts para usar invalidation
  - [~] Testar que dados são frescos após operações
- **Dependências**: Task 1.4 (para settlement)
- **Prioridade**: MÉDIA

### Task 3.2: Otimizar Problemas de Consulta N+1
- **Requisito**: Req 13
- **Descrição**: Usar RPC consolidado em vez de múltiplas queries
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts
  - src/hooks/useSharedFinances.ts
  - Database RPC functions
- **Subtasks**:
  - [~] Identificar N+1 queries em useTransactions.ts
  - [~] Identificar N+1 queries em useSharedFinances.ts
  - [~] Criar RPC functions consolidadas
  - [~] Atualizar hooks para usar RPC consolidado
  - [~] Medir melhoria em contagem de queries
- **Dependências**: Task 2.1 (para rpcWithRetry)
- **Prioridade**: MÉDIA

### Task 3.3: Implementar Limite de Transações com Aviso
- **Requisito**: Req 12
- **Descrição**: Avisar quando limite de 1000 transações é atingido
- **Arquivos Afetados**:
  - src/hooks/useTransactions.ts
  - src/pages/Transactions.tsx
- **Subtasks**:
  - [~] Adicionar verificação de limite em useTransactions.ts
  - [~] Exibir aviso quando limite é atingido
  - [~] Sugerir uso de filtros de data
  - [~] Registrar quando limite é atingido
- **Dependências**: Nenhuma
- **Prioridade**: MÉDIA

### Task 3.4: Documentar Fluxos Complexos
- **Requisito**: Req 15
- **Descrição**: Adicionar documentação e comentários para fluxos complexos
- **Arquivos Afetados**:
  - src/hooks/useSharedFinances.ts
  - src/hooks/useSettlement.ts
  - src/hooks/useTransactions.ts
  - docs/FLUXOS.md (novo)
- **Subtasks**:
  - [~] Documentar fluxo de finanças compartilhadas
  - [~] Documentar fluxo de settlement
  - [~] Documentar fluxo de parcelamento
  - [~] Adicionar comentários inline em código complexo
  - [~] Criar docs/FLUXOS.md com exemplos
- **Dependências**: Nenhuma
- **Prioridade**: MÉDIA

### Task 3.5: Implementar TODOs Faltantes
- **Requisito**: Req 16
- **Descrição**: Identificar e completar TODOs no codebase
- **Arquivos Afetados**:
  - Todos os arquivos com comentários TODO
- **Subtasks**:
  - [~] Procurar todos os comentários TODO
  - [~] Categorizar por prioridade
  - [~] Completar TODOs críticos
  - [~] Criar issues para TODOs não críticos
  - [~] Remover comentários TODO completados
- **Dependências**: Nenhuma
- **Prioridade**: MÉDIA

---

## Fase 4: Requisitos Baixos (Semana 4)

### Task 4.1: Limpeza de Código
- **Requisito**: Req 17
- **Descrição**: Remover código morto, imports não utilizados, e inconsistências de formatação
- **Arquivos Afetados**:
  - Todos os arquivos fonte
- **Subtasks**:
  - [~] Remover variáveis não utilizadas
  - [~] Remover imports não utilizados
  - [~] Remover código comentado
  - [~] Corrigir inconsistências de formatação
  - [~] Simplificar expressões complexas
- **Dependências**: Nenhuma
- **Prioridade**: BAIXA

### Task 4.2: Adicionar Testes End-to-End
- **Requisito**: Req 18
- **Descrição**: Adicionar testes E2E com Playwright/Cypress para fluxos de usuário
- **Arquivos Afetados**:
  - e2e/ (novo diretório)
  - e2e/shared-expenses.spec.ts (novo)
  - e2e/settlement.spec.ts (novo)
  - e2e/installments.spec.ts (novo)
- **Subtasks**:
  - [~] Setup Playwright ou Cypress
  - [~] Criar teste E2E para despesa compartilhada
  - [~] Criar teste E2E para settlement
  - [~] Criar teste E2E para parcelamento
  - [~] Criar teste E2E para filtros de transação
  - [~] Testar caminho feliz e cenários de erro
- **Dependências**: Task 1.5 (para infraestrutura de testes)
- **Prioridade**: BAIXA

### Task 4.3: Adicionar Testes de Row-Level Security (RLS)
- **Requisito**: Req 19
- **Descrição**: Testar que políticas RLS funcionam corretamente
- **Arquivos Afetados**:
  - tests/rls/ (novo diretório)
  - tests/rls/transactions.test.ts (novo)
  - tests/rls/shared-finances.test.ts (novo)
- **Subtasks**:
  - [~] Criar testes para RLS de transações
  - [~] Criar testes para RLS de finanças compartilhadas
  - [~] Testar que usuário só vê seus dados
  - [~] Testar que usuário não pode modificar dados de outro
  - [~] Verificar todas as tabelas críticas
- **Dependências**: Task 1.5 (para infraestrutura de testes)
- **Prioridade**: BAIXA

### Task 4.4: Remover Código Morto
- **Requisito**: Req 20
- **Descrição**: Identificar e remover código não utilizado
- **Arquivos Afetados**:
  - Todos os arquivos fonte
- **Subtasks**:
  - [~] Procurar funções não utilizadas
  - [~] Procurar variáveis não utilizadas
  - [~] Procurar exports não utilizados
  - [~] Remover código morto
  - [~] Verificar que nada quebrou
- **Dependências**: Nenhuma
- **Prioridade**: BAIXA

---

## Resumo de Dependências

```
Fase 1 (Crítica):
  Task 1.1 (Logger) → Task 1.2, 1.4, 1.5
  Task 1.2 (Datas) → Task 1.3, 1.4, 1.5
  Task 1.3 (Payer) → Task 1.4, 1.5
  Task 1.4 (Settlement) → Task 1.5
  Task 1.5 (Testes) ← Task 1.1, 1.2, 1.3, 1.4

Fase 2 (Alta):
  Task 2.1 (Retry) → Task 2.5, 3.2
  Task 2.2 (Types) → Task 2.4
  Task 2.3 (Member) → Task 2.4
  Task 2.4 (Zod) ← Task 2.2, 2.3
  Task 2.5 (Categorização) ← Task 1.1
  Task 2.6 (Testes Shared) ← Task 1.5

Fase 3 (Média):
  Task 3.1 (Cache) ← Task 1.4
  Task 3.2 (N+1) ← Task 2.1
  Task 3.3 (Limite) ← Nenhuma
  Task 3.4 (Docs) ← Nenhuma
  Task 3.5 (TODOs) ← Nenhuma

Fase 4 (Baixa):
  Task 4.1 (Limpeza) ← Nenhuma
  Task 4.2 (E2E) ← Task 1.5
  Task 4.3 (RLS) ← Task 1.5
  Task 4.4 (Código Morto) ← Nenhuma
```

---

## Ordem Recomendada de Execução

1. Task 1.1 - Remover console.log (rápido, sem dependências)
2. Task 1.2 - Corrigir fusos horários (base para outras)
3. Task 1.3 - Validar payer_id (base para settlement)
4. Task 1.4 - Settlement atômico (crítico)
5. Task 1.5 - Testes (valida tudo acima)
6. Task 2.1 - RPC com retry (base para otimizações)
7. Task 2.2 - Type safety (melhora qualidade)
8. Task 2.3 - Validar member_id (similar a payer_id)
9. Task 2.4 - Validação com Zod (usa type safety)
10. Task 2.5 - Categorização automática
11. Task 2.6 - Testes de finanças compartilhadas
12. Task 3.1 - Invalidação de cache
13. Task 3.2 - Otimização N+1
14. Task 3.3 - Limite de transações
15. Task 3.4 - Documentação
16. Task 3.5 - TODOs
17. Task 4.1 - Limpeza de código
18. Task 4.2 - Testes E2E
19. Task 4.3 - Testes RLS
20. Task 4.4 - Remover código morto
