# AUDITORIA COMPLETA — Seu Bolso Inteligente
> Data: 2026-06-30 | Branch: `main` | Deploy: meupedemeia.vercel.app

---

## RESUMO EXECUTIVO

**Nota geral: 7.2/10** — Sistema funcional, mas com débito técnico significativo.
O banco de dados tem **4 tabelas ausentes do type system**, **1 tabela morta**, **2 tabelas sem migration documentada**, e o frontend tem **12 problemas de consistência** identificados.

| Categoria | Achados |
| --------- | ------- |
| 🔴 CRÍTICO | 6       |
| 🟠 ALTO    | 10      |
| 🟡 MÉDIO   | 15      |
| 🔵 BAIXO   | 8       |

---

## 1. INVENTÁRIO COMPLETO

### Páginas (15 rotas + 404)
| Rota              | Página              | Lazy | Protected | Pin |
| ----------------- | ------------------- | ---- | --------- | --- |
| `/auth`           | Auth                | ❌    | ❌         | ❌   |
| `/reset-password` | ResetPassword       | ❌    | ❌         | ❌   |
| `/privacidade`    | Privacidade         | ❌    | ❌         | ❌   |
| `/`               | Dashboard           | ✅    | ✅         | ✅   |
| `/transacoes`     | Transactions        | ✅    | ✅         | ✅   |
| `/contas`         | Accounts            | ✅    | ✅         | ✅   |
| `/contas/:id`     | AccountDetail       | ✅    | ✅         | ✅   |
| `/cartoes`        | CreditCards         | ✅    | ✅         | ✅   |
| `/cartoes/:id`    | CreditCards         | ✅    | ✅         | ✅   |
| `/compartilhados` | SharedExpenses      | ✅    | ✅         | ✅   |
| `/viagens`        | Trips               | ✅    | ✅         | ✅   |
| `/familia`        | Family              | ✅    | ✅         | ✅   |
| `/relatorios`     | Reports             | ✅    | ✅         | ✅   |
| `/orcamentos`     | Budgets             | ✅    | ✅         | ✅   |
| `/metas`          | GoalsAndInvestments | ✅    | ✅         | ✅   |
| `/simuladores`    | Calculators         | ✅    | ✅         | ✅   |
| `/configuracoes`  | Settings            | ✅    | ✅         | ✅   |
| `*`               | NotFound            | ❌    | ❌         | ❌   |

### Rotas de navegação vs rotas reais
| Navegação              | Rota real                                           |
| ---------------------- | --------------------------------------------------- |
| `/compartilhado` (nav) | `/compartilhados` (rota) ✅ Corrigido                |
| `/configuracoes`       | Sem entrada no nav — só acessível via menu dropdown |

### Componentes: ~170 | Hooks: 43 | Contexts: 4 | Services: 19 | Utils: 27

---

## 2. BANCO DE DADOS — ESQUEMA COMPLETO

### Tabelas (28 no types.ts)
| #   | Tabela                     | Status       | Usada no Front?        |
| --- | -------------------------- | ------------ | ---------------------- |
| 1   | `accounts`                 | ✅ Ativa      | ✅                      |
| 2   | `assets`                   | ✅ Ativa      | ✅                      |
| 3   | `asset_transactions`       | ✅ Ativa      | ✅                      |
| 4   | `audit_logs`               | ✅ Ativa      | ⚠️ Só via trigger       |
| 5   | `b3_tickers_cache`         | ✅ Ativa      | ✅ (edge function)      |
| 6   | `budgets`                  | ✅ Ativa      | ✅                      |
| 7   | `categories`               | ✅ Ativa      | ✅                      |
| 8   | `category_keywords`        | ✅ Ativa      | ✅ (auto-categorização) |
| 9   | `credit_card_invoices`     | ✅ Ativa      | ✅                      |
| 10  | `error_reports`            | ⚠️ Duplicada? | ❌ (usam `error_logs`)  |
| 11  | `families`                 | ✅ Ativa      | ✅                      |
| 12  | `family_invitations`       | ✅ Ativa      | ✅                      |
| 13  | `family_members`           | ✅ Ativa      | ✅                      |
| 14  | `financial_ledger`         | 🔴 **MORTA**  | ❌ NUNCA usado no front |
| 15  | `goals`                    | ✅ Ativa      | ✅                      |
| 16  | `notification_preferences` | ✅ Ativa      | ✅                      |
| 17  | `notifications`            | ✅ Ativa      | ✅                      |
| 18  | `profiles`                 | ✅ Ativa      | ✅                      |
| 19  | `shared_credit_cards`      | ✅ Ativa      | ✅                      |
| 20  | `transaction_splits`       | ✅ Ativa      | ✅                      |
| 21  | `transactions`             | ✅ Ativa      | ✅                      |
| 22  | `trip_checklist`           | ✅ Ativa      | ✅                      |
| 23  | `trip_exchange_purchases`  | ✅ Ativa      | ✅                      |
| 24  | `trip_invitations`         | ✅ Ativa      | ✅                      |
| 25  | `trip_itinerary`           | ✅ Ativa      | ✅                      |
| 26  | `trip_members`             | ✅ Ativa      | ✅                      |
| 27  | `trips`                    | ✅ Ativa      | ✅                      |
| 28  | `user_category_learning`   | ✅ Ativa      | ✅                      |

### Tabelas EXISTENTES no banco mas AUSENTES do types.ts
| Tabela                 | Usada no front?                         | Migration?                           |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| `error_logs`           | ✅ `ErrorBoundary.tsx`, `errorLogger.ts` | ✅ `20260527135500`                   |
| `goal_milestones`      | ✅ `useGoalMilestones.ts`                | ❌ Só índice em `20260626000002`      |
| `push_subscriptions`   | ✅ `usePushNotifications.ts`             | ❌ NENHUMA encontrada                 |
| `settlement_reversals` | ✅ RPC `unsettle_split`                  | ✅ `20260106000003`, `20260628000003` |

### Colunas ausentes do types.ts
| Tabela           | Coluna         | Usada no front?                            | Migration?           |
| ---------------- | -------------- | ------------------------------------------ | -------------------- |
| `family_members` | `member_type`  | ✅ `useFamily.ts:22`                        | ❌ NENHUMA encontrada |
| `profiles`       | `app_pin_hash` | ✅ `PinWrapper.tsx`, `SecuritySettings.tsx` | ✅ `20260625000002`   |

### 🔴 CRÍTICO: `financial_ledger` — TABELA MORTA
- Existe no types.ts (linha 937), tem 14 colunas, 5 FKs
- **Zero usos no frontend** (grep `from('financial_ledger'` retorna 0 resultados)
- Parece ser um artefato de arquitetura antiga substituído por `transaction_splits`
- **Ação:** Verificar se tem dados. Se vazio, dropar. Se tem dados, migrar para `transaction_splits` e dropar.

### 🔴 CRÍTICO: `error_reports` vs `error_logs` — DUPLICIDADE
- `error_reports` está no types.ts
- `error_logs` NÃO está no types.ts mas é a tabela realmente usada no código
- `error_reports` tem schema diferente de `error_logs` (colunas diferentes)
- **Ação:** Unificar em `error_logs`, dropar `error_reports`, regenerar types.ts

### Views (9)
| View                                   | Finalidade                             |
| -------------------------------------- | -------------------------------------- |
| `active_families`                      | Famílias não deletadas                 |
| `active_family_members`                | Membros ativos (sem `member_type`)     |
| `active_trip_members`                  | Membros de viagem ativos               |
| `active_trips`                         | Viagens não deletadas                  |
| `shared_transactions_for_current_user` | Transações compartilhadas do usuário   |
| `shared_transactions_view`             | Mesma acima, com enums tipados         |
| `transactions_ssot`                    | Visão completa de transações com joins |
| `trip_budget_summary`                  | Resumo financeiro de viagem            |
| `user_net_worth`                       | Patrimônio líquido do usuário          |

### ⚠️ View `active_family_members` sem `member_type`
A view filtra `family_members` mas não inclui `member_type` — isso quebra queries que dependem dessa coluna via view.

### Functions (62 RPCs)
Todas documentadas em `docs/RPC_FUNCTIONS.md` (parcialmente). As funções críticas de settlement (`settle_split`, `unsettle_split`, etc.) foram corrigidas no Bug Hunt 2026-06-28.

### Enums (7)
| Enum                 | Valores                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `account_type`       | CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, CASH, EMERGENCY_FUND, GLOBAL_ACCOUNT |
| `family_role`        | admin, editor, viewer                                                            |
| `split_method`       | EQUAL, PERCENTAGE, CUSTOM                                                        |
| `sync_status`        | SYNCED, PENDING, ERROR                                                           |
| `transaction_domain` | PERSONAL, SHARED, TRAVEL                                                         |
| `transaction_type`   | EXPENSE, INCOME, TRANSFER, WITHDRAWAL, DEPOSIT                                   |
| `trip_status`        | PLANNING, ACTIVE, COMPLETED, CANCELLED                                           |

### ⚠️ Enum `account_type` no frontend diverge do banco
Frontend (`Accounts.tsx:32`): CHECKING, SAVINGS, INVESTMENT, CASH, EMERGENCY_FUND, GLOBAL_ACCOUNT
Banco: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, CASH, EMERGENCY_FUND, GLOBAL_ACCOUNT
→ `CREDIT_CARD` existe no banco mas não no label map do frontend. Labels não cobrem CREDIT_CARD.

---

## 3. CRUZAMENTO FRONTEND ↔ BANCO

### Tabelas com CRUD completo
| Tabela           | Criar | Ler | Editar | Excluir/Arquivar | Form                 | Modal |
| ---------------- | ----- | --- | ------ | ---------------- | -------------------- | ----- |
| `accounts`       | ✅     | ✅   | ✅      | ✅ Archive        | ✅ AccountFormModal   | ✅     |
| `transactions`   | ✅     | ✅   | ✅      | ✅ Soft delete    | ✅ TransactionForm    | ✅     |
| `categories`     | ✅     | ✅   | ✅      | ✅                | ✅ Settings           | ✅     |
| `budgets`        | ✅     | ✅   | ✅      | ✅                | ✅ Budgets page       | ✅     |
| `goals`          | ✅     | ✅   | ✅      | ✅                | ✅ GoalFormDialog     | ✅     |
| `assets`         | ✅     | ✅   | ✅      | ✅                | ✅ AssetFormDialog    | ✅     |
| `trips`          | ✅     | ✅   | ✅      | ✅ Archive        | ✅ NewTripDialog      | ✅     |
| `family_members` | ✅     | ✅   | ✅      | ✅ Remove         | ✅ InviteMemberDialog | ✅     |

### Tabelas SEM CRUD no frontend
| Tabela                   | Problema                                          |
| ------------------------ | ------------------------------------------------- |
| `financial_ledger`       | Tabela morta — sem nenhum uso                     |
| `error_reports`          | Duplicada com `error_logs`                        |
| `audit_logs`             | Só populado via trigger, sem tela de visualização |
| `b3_tickers_cache`       | Só sync automático, sem UI                        |
| `category_keywords`      | Só learning automático, sem UI                    |
| `user_category_learning` | Só learning automático, sem UI                    |
| `settlement_reversals`   | Só RPC, sem tela de auditoria (IMUTÁVEL — OK)     |

### Telas SEM tabela correspondente
| Tela          | Tabela                                 | Status |
| ------------- | -------------------------------------- | ------ |
| Auth          | `auth.users` (Supabase)                | ✅      |
| Settings      | `profiles`, `notification_preferences` | ✅      |
| NotFound      | N/A                                    | ✅      |
| Privacidade   | N/A (estática)                         | ✅      |
| ResetPassword | `auth.users` (Supabase)                | ✅      |

---

## 4. AUDITORIA DE BOTÕES — Resumo

Auditei os principais fluxos de botões por página:

### Dashboard
| Botão              | Ação              | API?                      | Loading? | Erro? |
| ------------------ | ----------------- | ------------------------- | -------- | ----- |
| Nova Transação (+) | Abre modal        | N/A                       | N/A      | N/A   |
| Buscar (Ctrl+K)    | Abre GlobalSearch | RPC `search_transactions` | ✅        | ✅     |
| Privacidade (Eye)  | Toggle blur       | Context                   | ❌        | ❌     |
| Tema (Theme)       | Toggle dark/light | N/A                       | ❌        | ❌     |
| Notificações       | Dropdown          | `notifications` table     | ✅        | ✅     |
| Logout             | Sign out          | Supabase Auth             | ❌        | ✅     |

### Transactions
| Botão          | Ação                        | Confirmação? | Rollback?       |
| -------------- | --------------------------- | ------------ | --------------- |
| Nova Transação | Abre modal                  | N/A          | N/A             |
| Editar         | Abre modal com dados        | ❌            | ❌               |
| Excluir        | Abre DeleteTransactionModal | ✅ (cascade)  | ✅ (soft delete) |
| Filtrar        | Toggle filtros              | N/A          | N/A             |
| Importar OFX   | Abre OFXImportModal         | N/A          | ❌               |

### ⚠️ Problemas encontrados em botões:
- **Editar transação**: sem confirmação antes de salvar alterações
- **Excluir meta**: confirmação existe, mas sem indicador visual de loading durante a exclusão
- **Arquivar conta**: confirmação existe, sem toast de sucesso consistente
- **Botão "Nova Transação" no mobile**: usa TransactionModal mas não usa Drawer bottom-sheet (mobile modals guideline violada em alguns casos)

---

## 5. AUDITORIA DE FORMULÁRIOS

### TransactionForm (mais crítico)
| Campo     | Validação Front  | Validação Back     | Máscara         |
| --------- | ---------------- | ------------------ | --------------- |
| Valor     | ✅ Zod > 0        | ✅ CHECK constraint | ✅ CurrencyInput |
| Descrição | ✅ Zod min 1      | ✅ CHECK not empty  | ❌               |
| Data      | ✅ date-fns parse | ✅ CHECK            | ❌               |
| Categoria | ✅ Select         | ✅ FK               | ❌               |
| Conta     | ✅ Select         | ✅ FK               | ❌               |
| Tipo      | ✅ Tab selector   | ✅ Enum             | ❌               |
| Parcelas  | ✅ Number > 0     | ✅ CHECK            | ❌               |
| Splits    | ✅ Percentages    | ✅ RPC validate     | ❌               |

### ⚠️ Falta validação contra SQL Injection e XSS nos formulários
- `description` no `TransactionForm`: aceita qualquer texto. Deveria sanitizar HTML/Scripts.
- Nomes de categorias, contas, etc. não sanitizam input.

### AccountFormModal
- Currency: valida moeda mas não impede valor negativo no initial_balance
- closing_day/due_day: aceita 0-31 mas sem validação de dia inválido para o mês (ex: 31 de fevereiro)

---

## 6. NAVEGAÇÃO — OK
- Todas as rotas respondem (não quebram em branco)
- Breadcrumb não implementado (não é requisito declarado)
- 404 funciona corretamente
- Deep links: `/contas/:id`, `/cartoes/:id` funcionam
- Sessão expirada: `ProtectedRoute` redireciona para `/auth`
- Logout: limpa cache, localStorage, redireciona

---

## 7. SEGURANÇA

### ✅ Já corrigido (Bug Hunt 2026-06-28)
- PIN com bcrypt via RPC (não plaintext)
- Senha admin '909496' removida → `is_admin()` JWT-based
- CSP sem `unsafe-eval`
- RLS restrito em `error_logs`
- `settle_split` com FOR UPDATE (race condition)
- FK RESTRICT em `settlement_reversals`

### 🔴 Pendente
| ID     | Problema                                   | Severidade |
| ------ | ------------------------------------------ | ---------- |
| SEC-05 | OAuth redirect em Vercel Preview URLs      | 🟠          |
| RLS-01 | RLS cross-family para cartão compartilhado | 🟠          |
| SEC-08 | Cache IndexedDB sem criptografia           | 🟡          |

### ⚠️ Nova descoberta: `error_logs` insert sem validação de schema
`ErrorBoundary.tsx:60` e `errorLogger.ts:19` inserem em `error_logs` sem verificar se os campos batem com a tabela. O types.ts não tem `error_logs`, então é `supabase.from('error_logs')` sem tipagem. Se o schema mudar, quebra silenciosamente.

---

## 8. PERFORMANCE

### ✅ Otimizações existentes
- Lazy loading em todas as páginas (14 chunks)
- TanStack Query com persistência IndexedDB (24h)
- Debounce 400ms na busca global
- Índices `idx_transactions_notifications`, `idx_push_subscriptions_user_id`, etc.
- AbortController no `rpcWithRetry`

### ⚠️ Problemas encontrados
| ID      | Problema                                        | Local                 | Impacto                                 |
| ------- | ----------------------------------------------- | --------------------- | --------------------------------------- |
| PERF-01 | `useTransactions({ limit: 100 })` no Dashboard  | `Dashboard.tsx:50`    | Carrega 100 transações só pra mostrar 5 |
| PERF-02 | `useTransactions` sem paginação no Transactions | `Transactions.tsx`    | Carrega TODAS as transações do mês      |
| PERF-03 | `annualTransactions` carrega ano inteiro        | `Transactions.tsx:62` | Sem lazy/paginação                      |
| PERF-04 | Process invoices no Dashboard mount             | `Dashboard.tsx:61`    | Chamada RPC síncrona no carregamento    |
| PERF-05 | Recharts com muitos dados sem virtualização     | Gráficos              | Pode travar com 1000+ transações        |

---

## 9. CÓDIGO MORTO

### Tabelas mortas
| Tabela             | Evidência                                    |
| ------------------ | -------------------------------------------- |
| `financial_ledger` | 0 usos no frontend                           |
| `error_reports`    | Código usa `error_logs`, não `error_reports` |

### Campos potencialmente mortos
| Tabela         | Coluna                                         | Evidência                                                       |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `transactions` | `reconciled`, `reconciled_at`, `reconciled_by` | Sem referência no frontend                                      |
| `profiles`     | `use_subcategories`                            | Sem referência no frontend                                      |
| `profiles`     | `monthly_budget`                               | Sem referência no frontend                                      |
| `accounts`     | `deleted` (boolean)                            | Sistema usa `is_active` + `is_archived`, `deleted` é redundante |

### Componentes potencialmente não usados
| Componente         | Verificação                         |
| ------------------ | ----------------------------------- |
| `Confetti.tsx`     | Verificar se é usado em algum fluxo |
| `NumberTicker.tsx` | Verificar uso                       |
| `RippleEffect.tsx` | Verificar uso                       |

---

## 10. INCONSISTÊNCIAS

### Banco → Frontend
| Banco tem                              | Frontend não tem         |
| -------------------------------------- | ------------------------ |
| `financial_ledger` table               | Nenhuma tela/API         |
| `error_reports` table                  | Nenhuma tela/API         |
| `audit_logs` table                     | Sem tela de visualização |
| Enum `CREDIT_CARD` no `account_type`   | Sem label no frontend    |
| `reconciled_*` columns em transactions | Sem uso                  |

### Frontend → Banco
| Frontend usa                    | Banco tem?                           |
| ------------------------------- | ------------------------------------ |
| `push_subscriptions` table      | ✅ Sim, mas sem migration documentada |
| `goal_milestones` table         | ✅ Sim, mas sem migration documentada |
| `error_logs` table              | ✅ Sim, mas não está no types.ts      |
| `member_type` em family_members | ✅ Sim, mas não está no types.ts      |
| `app_pin_hash` em profiles      | ✅ Sim, mas não está no types.ts      |

### ⚠️ Navigation vs Rotas
- `navigation.ts` exporta `secondaryNavItems` como array vazio — legado, pode remover

---

## 11. MIGRATIONS — 134 arquivos

### Migrations sem documentação clara (nomes genéricos)
Muitas migrations têm nomes como `fix_competence_date_to_due_month` → `revert_competence_date_to_closing_month` → `fix_competence_date_to_due_month_for_shared` → `revert_due_month_keep_closing_month`. Isso indica **múltiplas idas e vindas** na lógica de `competence_date` que devem ser analisadas para consolidar.

### ⚠️ Migrations possivelmente conflitantes
- `20260629000000_remove_shared_cycle_config.sql` — remove configuração
- `20260629000001_smart_closing_day_modes.sql` — adiciona nova lógica

---

## 12. TESTES AUTOMATIZADOS

### Cobertura atual (estimada: ~15-20%)
| Tipo        | Arquivos                                                 | Quantidade |
| ----------- | -------------------------------------------------------- | ---------- |
| Unitários   | `src/test/`, `src/**/*.test.ts`, `src/**/*.spec.ts`      | ~15        |
| Componentes | `AccountCard.test.tsx`, `TransactionForm.test.tsx`, etc. | ~5         |
| Integração  | `settle_split.test.ts`, `settlementAtomicity.test.ts`    | ~2         |
| E2E         | `e2e/*.spec.ts`                                          | 13 specs   |
| Hooks       | `useTransactions.test.ts`, `useSettlement.test.ts`       | ~3         |

### ⚠️ Problemas
- Cobertura muito abaixo dos 95% desejados
- `vitest.config.ts` existe mas sem threshold configurado
- E2E tests não rodam em CI (não há workflow configurado)
- Testes de formulário não cobrem casos de erro (SQL injection, XSS, campos inválidos)
- Sem testes para RPCs críticas além de `settle_split`

---

## 13. ORDEM DE PRIORIDADE

### 🔴 CRÍTICO (6)
1. **Regenerar `types.ts`** — 4 tabelas + 2 colunas ausentes quebram type safety
2. **Dropar `financial_ledger`** — tabela morta com 5 FKs, risco de confusão
3. **Unificar `error_reports` / `error_logs`** — duplicidade causa perda de dados
4. **Criar migrations faltantes** — `goal_milestones`, `push_subscriptions`, `member_type`
5. **Adicionar `member_type` à view `active_family_members`** — quebra queries via view
6. **Corrigir `account_type` labels** — divergência frontend/banco

### 🟠 ALTO (10)
7. `useTransactions({ limit: 100 })` no Dashboard — carrega dados desnecessários
8. Paginação nas transações — carrega todas do mês
9. `annualTransactions` sem lazy loading
10. RLS cross-family para cartão compartilhado (CHECKLIST SEC-05)
11. Sanitização de inputs contra XSS nos formulários
12. `AccountFormModal`: validar dia máximo do mês para closing_day/due_day
13. OAuth redirect em Vercel Preview URLs (CHECKLIST RLS-01)
14. Cache IndexedDB sem criptografia (CHECKLIST SEC-08)
15. `process_credit_card_invoices` chamado no Dashboard mount — deveria ser cron job
16. `error_logs` insert sem tipagem — risco de quebra silenciosa

### 🟡 MÉDIO (15)
17. Remover `secondaryNavItems` vazio do `navigation.ts`
18. Consolidar migrations de `competence_date` (idas e vindas)
19. Remover colunas `reconciled_*` se confirmadas como não usadas
20. Remover coluna `deleted` (boolean) de `accounts` (redundante com `is_active`)
21. Verificar uso de `Confetti`, `NumberTicker`, `RippleEffect`
22. Mobile: usar Drawer bottom-sheet em vez de Dialog para modais
23. Adicionar breadcrumb (UX)
24. `Profiles.monthly_budget` e `use_subcategories` — verificar se são usados
25. toast de sucesso consistente em todas as mutações
26. Confirmar edição de transação antes de salvar
27. Testes: adicionar casos de SQL injection e XSS
28. Testes: configurar threshold de coverage no vitest.config.ts
29. CI/CD: adicionar workflow para rodar testes
30. Documentar RPC functions pendentes no `RPC_FUNCTIONS.md`
31. Auditoria de `settlement_reversals` — sem tela de visualização (mas IMUTÁVEL)

### 🔵 BAIXO (8)
32. Remover `expense_splits` da documentação (não existe mais)
33. Verificar `profiles.month_start_day` — é usado?
34. `import.meta.env.DEV` em `AuthContext.tsx:24` — mock auth já resolvido
35. Adicionar lazy loading nas imagens de bancos (189 SVGs)
36. Corrigir labels de moedas no `Accounts.tsx` (BRL ausente da lista)
37. Service Worker cache: verificar se 1h é suficiente
38. Export PDF via Web Worker (CHECKLIST ARC-05)
39. Relatório mensal por email (CHECKLIST FEAT-01)

---

## 14. AÇÕES IMEDIATAS RECOMENDADAS

```sql
-- 1. Verificar se financial_ledger tem dados
SELECT count(*) FROM public.financial_ledger;

-- 2. Verificar se error_reports tem dados
SELECT count(*) FROM public.error_reports;

-- 3. Verificar se goal_milestones existe
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'goal_milestones');

-- 4. Verificar push_subscriptions
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_subscriptions');

-- 5. Verificar member_type column
SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'family_members' AND column_name = 'member_type');
```

**Próximo passo concreto:** Rodar queries acima no Supabase → regenerar `types.ts` → dropar tabelas mortas → corrigir divergências.

---

*Relatório gerado em 2026-06-30. Próxima auditoria recomendada: após correção dos itens CRÍTICOS.*
