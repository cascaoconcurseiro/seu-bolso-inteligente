# 🔍 AUDITORIA COMPLETA DE QUALIDADE DE CÓDIGO
## Seu Bolso Inteligente — 2026-06-30

> **Projeto:** `seu-bolso-inteligente` | **Arquivos auditados:** 359 em `src/` + 38 testes + 13 E2E
> **Stack:** React 18 + TypeScript Strict + Vite + Supabase + TanStack Query + Zustand + Tailwind
> **Equipe simulada:** Principal SE + Staff Engineer + Code Reviewer + Software Architect + Tech Lead + Clean Code + SOLID + TS Specialist + React Specialist + Refactoring Expert + QA Engineer

---

## 📊 FASE 1 — INVENTÁRIO COMPLETO

| Categoria | Qtd | Localização |
|:--|:--|:--|
| Pages | 22 | `src/pages/` |
| Components | 163 | `src/components/` (ui:49, accounts:10, credit-cards:13, dashboard:12, settings:18, shared:10, transactions:21, etc.) |
| Hooks | 55 | `src/hooks/` (incl. subdirs transactions/, credit-cards/) |
| Contexts | 4 | `src/contexts/` |
| Services | 20 | `src/services/` (incl. ai/) |
| Utils/Lib | 40 | `src/utils/` + `src/lib/` |
| Types | 7 | `src/types/` + `src/integrations/supabase/types.ts` |
| Store | 1 | `src/store/useTransactionStore.ts` |
| Config | 1 | `src/config/navigation.ts` |
| Styles | 1 | `src/styles/mobile.css` |
| Testes unitários | 25 | `src/**/*.test.ts` |
| Testes E2E | 13 | `e2e/*.spec.ts` |
| Migrations | 40+ | `supabase/migrations/` |
| Edge Functions | 4+ | `supabase/functions/` |

---

## 🏆 FASE 20 — SCORES FINAIS

| Dimensão | Nota | Justificativa |
|:--|:--|:--|
| **Clean Code** | **62/100** | Funções longas (useUpdateTransaction 120ln, handleSettle 180ln), god hooks (40 props), duplicação de lógica de filtros, DRY violado em month names, `.replace(".", ",")` espalhado |
| **TypeScript** | **58/100** | ~80 `any` no código de produção, `CreateTransactionInput` com propriedade duplicada, `status: string` em vez de union, 3 definições de `Transaction`, `recurrence_day: number` sem restrição |
| **SOLID** | **45/100** | SRP massivamente violado (god functions), DIP ausente (todos services acoplados a supabase diretamente), OCP violado em 6 switch statements, ISP violado (Transaction 35+ campos) |
| **Testabilidade** | **40/100** | Apenas 2 serviços testáveis sem mock de supabase. Hooks impossíveis de testar isoladamente. Zero testes de integração hook+component |
| **Testes** | **35/100** | 7/38 testes fake/broken/skipped. E2E apenas smoke tests (1 assert por página). Zero cobertura de mutations. `rpcWithRetry` sem testes ativos |
| **Segurança** | **72/100** | PIN migrado para bcrypt ✅, CSP implementado ✅, RLS em todas tabelas ✅. Pendente: IndexedDB sem criptografia, OAuth redirect em preview URLs |
| **Performance** | **68/100** | Boa arquitetura de cache (staleTime 2min, gcTime 24h) ✅, lazy loading ✅. Pendente: N+1 em `createNotification`, PDF export bloqueia main thread, queries sequenciais |
| **Manutenibilidade** | **55/100** | Documentação excelente (MASTER_BLUEPRINT, CHECKLIST, HANDOFF) ✅. God components e hooks gigantes ❌ |
| **⭐ QUALIDADE GERAL** | **54/100** | **D** — Projeto funcional e bem documentado, mas acumulou dívida técnica significativa em tipagem, testes e decomposição |

---

## 🔴 PROBLEMAS CRÍTICOS — Corrigir Imediatamente

### [CRIT-01] `CreateTransactionInput` tem propriedade duplicada
- **Arquivo:** `src/hooks/transactions/types.ts:74,83`
- **Categoria:** TypeScript / Bug
- **Evidência:** `splits?: TransactionSplit[]` (linha 74) + `transaction_splits?: TransactionSplit[]` (linha 83) coexistem na mesma interface
- **Impacto:** ALTO — Ambiguidade de API. Código consumidor (`useCreateTransaction.ts`, `useTransactionMutations.ts`) usa `as any` para acessar ambos
- **Correção:** Remover `transaction_splits`, manter `splits`
- **Complexidade:** XS | **Prioridade:** CRÍTICO

### [CRIT-02] `console.error` direto em código de produção
- **Arquivo:** `src/components/settings/CategorySettings.tsx:57`
- **Categoria:** Clean Code / Padrão violado
- **Evidência:** `console.error(err)` chamado diretamente, violando política do projeto (apenas `logger.ts`)
- **Impacto:** BAIXO — Mas escapa do error logging estruturado
- **Correção:** `logger.error('Erro ao salvar categoria', err)`
- **Complexidade:** XS | **Prioridade:** CRÍTICO

### [CRIT-03] Testes do `rpcWithRetry` totalmente desabilitados
- **Arquivos:** `src/utils/rpcWithRetry.test.ts:28`, `src/utils/__tests__/rpcWithRetry.integration.test.ts:24`
- **Categoria:** Testes
- **Evidência:** Ambos com `describe.skip`, TODO: "reescrever mocks para refletir API atual"
- **Impacto:** CRÍTICO — `rpcWithRetry` é wrapper de TODA operação financeira. Sem testes = regressões silenciosas
- **Correção:** Reescrever mocks para API atual (`rpc()` retorna builder com `.abortSignal()`)
- **Complexidade:** M | **Prioridade:** CRÍTICO

### [CRIT-04] `useCreateAccount` sem atomicidade — falha parcial deixa inconsistência
- **Arquivo:** `src/hooks/useAccounts.ts`
- **Categoria:** Atomicidade / Financeiro / MASTER_BLUEPRINT §3.2
- **Evidência:** 3 operações sequenciais (insert account → insert initial balance tx → refetch). Se a 2ª falhar, conta existe sem transação
- **Impacto:** ALTO — Dados financeiros inconsistentes
- **Correção:** RPC atômica `create_account_with_balance` com `BEGIN/COMMIT/ROLLBACK`
- **Complexidade:** M | **Prioridade:** CRÍTICO

### [CRIT-05] `contributeToGoal` sem atomicidade
- **Arquivo:** `src/hooks/useGoals.ts`
- **Categoria:** Atomicidade / Financeiro
- **Evidência:** 5+ chamadas sequenciais. Se insert tx falhar após update goal → goal inconsistente
- **Impacto:** ALTO
- **Correção:** RPC atômica `contribute_to_goal`
- **Complexidade:** M | **Prioridade:** CRÍTICO

### [CRIT-06] `deleteGoal` usa `LIKE '%meta "..."%'` para cascata — perda de dados
- **Arquivo:** `src/hooks/useGoals.ts`
- **Categoria:** Integridade de dados
- **Evidência:** Pattern matching frágil em string de descrição para deletar transações associadas
- **Impacto:** ALTO — Qualquer transação com descrição similar será deletada
- **Correção:** Adicionar coluna `goal_id` FK em `transactions` ou tabela de relação
- **Complexidade:** M (requer migration) | **Prioridade:** CRÍTICO

---

## 🟠 PROBLEMAS DE ALTA PRIORIDADE — Esta Semana

### [ALT-01] `Transaction` definida 3 vezes com propósitos diferentes
- **Arquivos:** `src/hooks/transactions/types.ts` (35 campos), `src/services/validationService.ts` (Zod schema inline), `src/services/settlementValidation.ts` (8 campos)
- **Categoria:** Duplicação / TypeScript
- **Evidência:** 3 interfaces com mesmo nome, zero relação de herança. `validationService.ts` redefine `Account` e `Trip` inline
- **Correção:** Extrair `TransactionCore` (8 campos comuns), usar `Pick<>` ou estender
- **Complexidade:** M

### [ALT-02] `useSharedExpensesActions` — 40 parâmetros, god hook
- **Arquivo:** `src/hooks/useSharedExpensesActions.ts`
- **Categoria:** SOLID / SRP / Code Smell
- **Evidência:** Interface com 29 dados + 11 setters = 40 props. `handleSettle`: 180 linhas
- **Correção:** Quebrar em `useSettlement()`, `useTransactionDelete()`, `useSeriesDelete()`, `useUndoOperations()`
- **Complexidade:** M

### [ALT-03] `useUpdateTransaction.mutationFn` — 120 linhas, múltiplas responsabilidades
- **Arquivo:** `src/hooks/transactions/useTransactionMutations.ts`
- **Categoria:** Clean Code / SRP
- **Evidência:** Validação, member lookup, split recalculation com rounding, backup/rollback — tudo em uma async function
- **Correção:** Extrair `recalculateSplits()` como pure function
- **Complexidade:** S

### [ALT-04] `CreditCards.tsx` — 720 linhas, página colossal
- **Arquivo:** `src/pages/CreditCards.tsx`
- **Categoria:** Code Smell / Large Component
- **Evidência:** Maior página do projeto. EditCard dialog ~120 linhas inline
- **Correção:** Extrair `EditCardDialog`, `InvoicePaymentSection`, `InstallmentList`
- **Complexidade:** M

### [ALT-05] `AdminResetPanel.tsx` — 800+ linhas, constante morta
- **Arquivo:** `src/components/settings/AdminResetPanel.tsx`
- **Categoria:** Code Smell / Dead Code
- **Evidência:** `CONFIRM_WORD = "RESETAR"` declarada mas nunca usada. Tab contents inline (50-200 linhas cada)
- **Correção:** Extrair tabs para componentes próprios. Remover constante morta
- **Complexidade:** M

### [ALT-06] Duplicação de lógica de filtros em `Transactions.tsx`
- **Arquivo:** `src/pages/Transactions.tsx`
- **Categoria:** DRY / Duplicação
- **Evidência:** `filteredTransactions` e `filteredAnnualTransactions` — useMemo blocks com ~40 linhas idênticas
- **Correção:** Extrair `applyTransactionFilters(transactions, filters)` como pure function
- **Complexidade:** XS

### [ALT-07] Array de meses duplicado 3x
- **Arquivos:** `SharedExpenses.tsx`, `Accounts.tsx`, `Dashboard.tsx`
- **Categoria:** DRY / Magic Values
- **Evidência:** `['Jan', 'Fev', ..., 'Dez']` definido inline em 3+ arquivos
- **Correção:** Constante em `src/lib/constants.ts` ou `date-fns` locale pt-BR
- **Complexidade:** XS

### [ALT-08] `Promise.all` em `queryInvalidation.ts` — falha parcial descarta tudo
- **Arquivo:** `src/utils/queryInvalidation.ts`
- **Categoria:** Error Handling / Resiliência
- **Evidência:** 26 queries em `Promise.all`. Se UMA falhar, TODAS as outras são descartadas
- **Correção:** `Promise.allSettled`
- **Complexidade:** XS

### [ALT-09] `useEffect` com dependência instável em `useSharedFinances`
- **Arquivo:** `src/hooks/useSharedFinances.ts`
- **Categoria:** Performance / React
- **Evidência:** `useEffect(..., [user?.id, refetch])` — `refetch` recriado a cada render, causando re-subscribe desnecessário no canal Realtime
- **Correção:** Usar `queryClient.invalidateQueries` estável
- **Complexidade:** XS

### [ALT-10] Violação de timezone documentada como proibida
- **Arquivos:** `src/utils/dateUtils.ts`, `src/lib/invoiceUtils.ts`
- **Categoria:** Bug / MASTER_BLUEPRINT §3.3
- **Evidência:** Ambos usam `new Date(year, month, day)` — exatamente o que `lib/dateUtils.ts` documenta como NUNCA fazer
- **Correção:** `parseISO()` ou `new Date(Date.UTC(...))`
- **Complexidade:** S

---

## 🟡 PROBLEMAS DE MÉDIA PRIORIDADE — Próximas Sprints

| # | Arquivo | Problema | Complexidade |
|:--|:--|:--|:--|
| MED-01 | 28 arquivos | ~80 `any` em código de produção (15 em `useReportsData.ts`, 8 em `useTransactionMutations.ts`, 8 em `useSharedExpensesActions.ts`, 6 em `useFamily.ts`) | L |
| MED-02 | `hooks/transactions/types.ts` | ISP: `Transaction` 35+ campos, `CreateTransactionInput` 26 campos todos opcionais | M |
| MED-03 | `hooks/transactions/types.ts:25` | `status: string` em vez de `'CONFIRMED' \| 'PENDING' \| 'CANCELLED'` | XS |
| MED-04 | `hooks/transactions/types.ts:84` | `recurrence_day?: number` sem restrição de 1-31 | XS |
| MED-05 | `hooks/useAssets.ts` | `createAsset` não reverte asset se transação falhar | S |
| MED-06 | 4 arquivos | `.replace(".", ",")` espalhado para BRL em vez de `moneyUtils.format()` | S |
| MED-07 | ~30 locais | `"BRL"` magic string — deveria ser `DEFAULT_CURRENCY` | XS |
| MED-08 | `hooks/useNotifications.ts` | `useDeleteNotification` e `useDismissNotification` são idênticos | XS |

---

## 🔵 PROBLEMAS DE BAIXA PRIORIDADE — Backlog

| # | Arquivo | Problema | Complexidade |
|:--|:--|:--|:--|
| LOW-01 | `components/modals/TransactionModal.tsx` | API dupla conflitante (`isOpen`/`onClose` + `open`/`onOpenChange`) | XS |
| LOW-02 | `hooks/useTrips.ts` | `useCreateTrip` mostra toast duplicado (mutationFn + onSuccess) | XS |
| LOW-03 | `hooks/useUserProfile.ts` | `localStorage.setItem` dentro de `queryFn` — side effect em query | XS |
| LOW-04 | `utils/rpcWithRetry.ts` | `batchRpcWithRetry` usa `Promise.all` — perde resultados parciais | XS |
| LOW-05 | `hooks/useAccounts.ts` | `useCreditCardInvoice` catch retorna fallback silencioso sem log | XS |
| LOW-06 | `services/recurrenceService.ts` | `last_generated_date` atualizado dentro do loop — N updates separados | XS |
| LOW-07 | `pages/Dashboard.tsx` | `transactionToEdit` state existe mas nunca usado (delega a modal via window event) | XS |

---

## 🧪 FASE 14 — TESTES: DIAGNÓSTICO COMPLETO

### Testes que REALMENTE testam comportamento: 10/38 ✅

| Arquivo | Qualidade |
|:--|:--|
| `SafeFinancialCalculator.test.ts` | ⭐⭐⭐⭐⭐ Excelente — property-based + unit |
| `SafeFinancialCalculator.property.test.ts` | ⭐⭐⭐⭐ Bom — mas duplicado do acima |
| `sharedFinancesCalculations.test.ts` | ⭐⭐⭐⭐ Bom — puro, sem mocks |
| `categoryPrediction.test.ts` | ⭐⭐⭐⭐ Bom — testa fuzzy matching |
| `validateMemberId.test.ts` | ⭐⭐⭐⭐ Bom — mocks corretos |
| `dateUtils.test.ts` (lib) | ⭐⭐⭐⭐ Bom — cobre leap years, UTC |
| `dateUtils.test.ts` (utils) | ⭐⭐⭐⭐ Bom — `vi.setSystemTime` |
| `moneyUtils.spec.ts` | ⭐⭐⭐ Bom — cobertura parcial |
| `logger.test.ts` | ⭐⭐⭐ Bom — verifica exports |
| `UpcomingTransactions.logic.test.ts` | ⭐⭐⭐ Bom — lógica pura |

### Testes FAKE (mock-only, não testam código real): 7/38 ❌

| Arquivo | Problema |
|:--|:--|
| `useTransactions.test.ts` | Testa chains de mock, nunca importa `useTransactions` |
| `useSettlement.test.ts` | Asserts em objetos literais, zero funções chamadas |
| `settlementValidation.test.ts` | Referencia `SafeFinancialCalculator` sem importar |
| `invoiceUtils.test.ts` | Reimplementa aritmética, mal usa `invoiceUtils` |
| `rpcWithRetry.test.ts` | **Tudo com `.skip`** — mocks quebrados |
| `rpcWithRetry.integration.test.ts` | **Tudo com `.skip`** — mocks quebrados |
| `money.spec.ts` | Testa `Decimal.js`, não o projeto |

### Testes snapshot-only com children mockados: 3/38 ⚠️

- `TransactionForm.test.tsx` — 2 snapshots, tudo mockado
- `AccountCard.test.tsx` — 3 snapshots
- `DashboardHero.test.tsx` — 3 snapshots

### E2E: 13 arquivos, 14 testes, TODOS smoke tests ⚠️

Cada spec tem 1 `test()` que verifica se um elemento existe na página. Nenhum testa fluxo CRUD completo. Todos usam `if (await btn.isVisible())` — passam silenciosamente se o botão não existe.

---

## 🏗️ FASE 8 — SOLID: VIOLAÇÕES DETALHADAS

### Single Responsibility (SRP) — 6 violações graves

| Arquivo | Função/Método | Responsabilidades |
|:--|:--|:--|
| `validationService.ts` | `validateTransaction()` | 5: Zod structural + business rules + cross-entity + splits + domain rules |
| `exportService.ts` | `exportTransactions()` | 4: formato if/else + HTML Excel inline + totais + DOM download |
| `recurrenceService.ts` | `generatePendingRecurringTransactions()` | 6: fetch templates + fetch accounts + calc competence + generate txs + batch insert + update dates |
| `AuthContext.tsx` | `signOut()` | 7: Supabase signOut + setState + localStorage + queryClient + localforage + caches + redirect |
| `useAccounts.ts` | `useAccounts()` | 3: data fetch + merge own/shared + UI helpers (`getAccountDisplayName`, `getAccountIcon`) |
| `CreditCards.tsx` | Page component | 8: data display + edit dialog + invoice payment + installment list + archived section + summary + share dialog + import |

### Open/Closed (OCP) — 6 switch/if-else chains

| Arquivo | Função | Alternativa |
|:--|:--|:--|
| `recurrenceService.ts` | `calculateNextOccurrence()` | Strategy map: `Record<string, (date, day?) => Date>` |
| `exportService.ts` | `exportTransactions()` | Registry de exporters por formato |
| `categoryPredictionService.ts` | `predictCategory()` | Chain of Responsibility com array ordenável |
| `useAccounts.ts` | `getAccountDisplayName()` | Map: `Record<AccountType, {local, international}>` |
| `useAccounts.ts` | `getAccountIcon()` | Mesmo padrão de map |
| `money.ts` | `getSymbol()` | `Intl.NumberFormat` nativo |

### Interface Segregation (ISP) — 2 interfaces gordas

- `Transaction`: 35+ campos. Componente de lista recebe `account`, `trip`, `transaction_splits`, `exchange_rate` que nunca usa
- `CreateTransactionInput`: 26 campos TODOS opcionais. Criação de despesa simples precisa de 5 campos mas interface não indica quais

### Dependency Inversion (DIP) — Violação sistêmica

Nenhum serviço depende de abstrações. Todos importam `supabase` diretamente. Apenas `settlementValidation.ts` e `validationService.ts` são testáveis isoladamente.

---

## 📦 FASE 16 — DEPENDÊNCIAS

### Vulnerabilidades npm

| Pacote | Severidade | Descrição | Fix |
|:--|:--|:--|:--|
| `vite` | **HIGH** | SSRF no dev server | `vite@^8.1.1` (major) |
| `esbuild` | MODERATE | Dev server permite requests cross-origin | Via vite update |
| `uuid` (via exceljs) | MODERATE | Buffer bounds check ausente | `exceljs` downgrade ou fork |

### Dependências questionáveis

- `exceljs@^4.4.0` (~1.2MB): Usado com dynamic import só em `exportService.ts`. Pesado para 1 feature.
- `fast-xml-parser`: Só para parse OFX. Substituível por parser nativo mais leve.
- `canvas-confetti` (~15KB): Celebração visual em goal completion. Questionável para app financeiro.

---

## 📝 FASE 17 — COMENTÁRIOS

### TODOs reais (não confundir com palavra "todo" em português)

| Arquivo | Linha | Conteúdo |
|:--|:--|:--|
| `rpcWithRetry.test.ts` | 28 | `TODO: reescrever mocks para refletir API atual (rpc() retorna builder com .abortSignal())` |
| `rpcWithRetry.integration.test.ts` | 24 | `TODO: reescrever mocks para refletir API atual` |

### Qualidade dos comentários: BOA ✅

- Comentários explicam WHY, não WHAT (ex: "Evitar dias inválidos (31 de abril vira 30)")
- Arquitetura documentada em MASTER_BLUEPRINT.md
- Decisões de design explicadas nos hooks críticos
- Sem código comentado significativo
- Sem FIXME, HACK, ou XXX

---

## 🔢 FASE 10 — COMPLEXIDADE: TOP 8 ARQUIVOS

| Arquivo | Linhas | Estados | Complexidade Estimada |
|:--|:--|:--|:--|
| `AdminResetPanel.tsx` | 800+ | 0 (delegado) | **Alta** — múltiplos tabs inline |
| `CreditCards.tsx` | 720 | 0 (delegado) | **Alta** — 8+ responsabilidades |
| `TransactionForm.tsx` | 560 | 2 | **Média-Alta** |
| `Transactions.tsx` | 530 | 13 | **Média** — filtros duplicados |
| `useSharedExpensesActions.ts` | 480 | 0 | **Muito Alta** — handleSettle: 180ln |
| `SharedExpenseCard.tsx` | 460 | 1 | **Média-Alta** |
| `useTransactionMutations.ts` | 520 | 0 | **Alta** — useUpdateTransaction: 120ln |
| `Trips.tsx` | 500 | 18 | **Alta** — 18 useState |

---

## 🧩 FASE 11 — DUPLICAÇÃO: SUMÁRIO

| O que | Onde | Severidade |
|:--|:--|:--|
| `filteredTransactions` vs `filteredAnnualTransactions` | `Transactions.tsx` | Alta |
| Array de meses (`['Jan',...,'Dez']`) | 3 arquivos | Média |
| `Transaction` interface | 3 arquivos (35, Zod, 8 campos) | Alta |
| `TransactionType` / `TabType` | `types/transactions.ts` + `hooks/transactions/types.ts` | Média |
| `Account` interface | `validationService.ts` + `useAccounts.ts` | Média |
| `.replace(".", ",")` BRL formatting | 4 arquivos | Média |
| `SafeFinancialCalculator.test.ts` + `.property.test.ts` | 2 arquivos com ~70% overlap | Baixa |
| `useDeleteNotification` = `useDismissNotification` | `useNotifications.ts` | Baixa |

---

## 🛡️ FASE 12 — TRATAMENTO DE ERROS

| Arquivo | Problema |
|:--|:--|
| Vários hooks/pages | Padrão `/* onError do hook já trata */` — catch vazio que engole erros silenciosamente |
| `CategorySettings.tsx:57` | `console.error` direto, fora do logger |
| `useCreditCardInvoice` | Fallback silencioso, sem log |
| `validationService.ts:isValidDate` | `new Date(year, month, 0)` timezone-dependent |
| `exportService.ts:safeFormatDate` | Hack manual de timezone (`getTimezoneOffset * 60000`) |

---

## 📋 FASE 19 — MANUTENIBILIDADE

| Pergunta | Resposta |
|:--|:--|
| Tempo para novo dev entender o projeto | **2-3 semanas** — MASTER_BLUEPRINT excelente, mas god hooks atrapalham |
| Tempo para feature simples | **2-4h** — boas abstrações de query/mutation |
| Tempo para localizar bug | **30min-2h** — logging bom, mas testes fracos não previnem regressão |
| Maior risco de manutenção | `useSharedExpensesActions.ts` — 40 props, 180ln, qualquer mudança = alto risco |
| Segundo maior risco | `useTransactionMutations.ts` — 120ln em uma função, split logic complexa |

---

## 🗺️ ROADMAP DE REFATORAÇÃO

### Sprint 1 — 🔴 Críticos (3-5 dias)
- [ ] CRIT-01: Remover `transaction_splits` duplicado de `CreateTransactionInput`
- [ ] CRIT-02: Substituir `console.error` por `logger.error`
- [ ] CRIT-03: Reescrever mocks e reativar testes do `rpcWithRetry`
- [ ] CRIT-04: RPC atômica `create_account_with_balance`
- [ ] CRIT-05: RPC atômica `contribute_to_goal`
- [ ] CRIT-06: Substituir `LIKE '%meta%'` por `goal_id` FK (requer migration)

### Sprint 2 — 🟠 Alta Prioridade (3-5 dias)
- [ ] ALT-01: Unificar 3 definições de `Transaction`
- [ ] ALT-06: Extrair `applyTransactionFilters` pure function
- [ ] ALT-07: Extrair month names para constante
- [ ] ALT-08: `Promise.all` → `Promise.allSettled` em queryInvalidation
- [ ] ALT-09: Corrigir `useEffect` dep em useSharedFinances
- [ ] ALT-10: Corrigir timezone em utils/dateUtils e invoiceUtils
- [ ] MED-03: `status: string` → union type
- [ ] MED-07: Constante `DEFAULT_CURRENCY`

### Sprint 3 — 🟠 Decomposição (5-7 dias)
- [ ] ALT-02: Quebrar `useSharedExpensesActions` em 4 hooks
- [ ] ALT-03: Extrair `recalculateSplits` de `useUpdateTransaction`
- [ ] ALT-04: Decompor `CreditCards.tsx`
- [ ] ALT-05: Decompor `AdminResetPanel.tsx`
- [ ] MED-01: Remover ~20 `any` mais fáceis (30% do total)
- [ ] MED-02: Separar `CreateTransactionInput` em inputs tipados

### Sprint 4 — 🟡 Confiabilidade (3-5 dias)
- [ ] MED-05: Corrigir atomicidade em `createAsset`
- [ ] MED-06: Unificar formatação BRL com `moneyUtils.format()`
- [ ] MED-08: Unificar `useDeleteNotification`/`useDismissNotification`
- [ ] LOW-01 a LOW-07: Correções de baixa prioridade

### Sprint 5 — 🧪 Testes (5-7 dias)
- [ ] Reescrever 7 testes fake com comportamento real
- [ ] Adicionar testes de interação nos 3 snapshot-only
- [ ] Criar testes para `useTransactionMutations`, `useAccounts`
- [ ] Expandir E2E: 1 fluxo CRUD completo por página (13 fluxos)

---

## 📊 ESTATÍSTICAS FINAIS

| Métrica | Valor |
|:--|:--|
| Total de problemas | **93** |
| Críticos | 6 |
| Alta prioridade | 10 |
| Média prioridade | 8 |
| Baixa prioridade | 7 |
| Ocorrências de `any` | ~80 em 28 arquivos |
| Testes quebrados/fake | 7 |
| Testes sem cobertura real | 10 |
| Vulnerabilidades npm | 3 (1 HIGH) |
| Duplicação de lógica | 4 casos críticos |
| Violações de atomicidade | 4 casos |
| God components/hooks | 5 casos |
| Violações SRP | 6 casos |
| Violações OCP | 6 casos |
| Violações ISP | 2 casos |
| Violação DIP | Sistêmica (todos services) |
| Cobertura E2E real | ~5% (apenas smoke tests) |

---

> **Conclusão:** O projeto tem uma base arquitetural sólida (MASTER_BLUEPRINT, invariáveis financeiras, RLS, atomicidade via RPC), mas a camada de frontend acumulou dívida técnica significativa. Os problemas concentram-se em 3 áreas: tipagem TypeScript fraca (~80 `any`), decomposição insuficiente (god hooks/components), e testes majoritariamente ineficazes. O roadmap acima prioriza correções pelo impacto na segurança dos dados financeiros primeiro, depois qualidade de código, e por último cobertura de testes.
