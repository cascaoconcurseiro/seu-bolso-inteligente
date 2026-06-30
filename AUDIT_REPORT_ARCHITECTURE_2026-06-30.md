# AUDITORIA DE ARQUITETURA — Seu Bolso Inteligente

> **Data:** 2026-06-30
> **Auditor:** Github Copilot (Arquiteto de Software Enterprise)
> **Metodologia:** Análise estrutural completa do código-fonte, documentação, migrations e Edge Functions
> **Score Final:** 62/100

---

## SUMÁRIO EXECUTIVO

O projeto tem fundamentos sólidos — invariáveis financeiras bem definidas, stack moderna, RLS ativo, atomicidade em RPCs críticas. Porém a arquitetura de frontend carece de disciplina: arquivos enormes (30+ acima de 200 linhas), separação de responsabilidades inconsistente, hooks dentro de pastas de componentes, diretório `lib/` com múltiplas personalidades, e uso excessivo de `any`. A arquitetura é **Layered + Feature-Based Híbrida**, sem enforcement consistente.

---

## FASE 1 — ARQUITETURA IDENTIFICADA

**Classificação: Layered + Feature-Based Híbrida (não pura)**

| Camada         | Localização         | Estado                            |
| -------------- | ------------------- | --------------------------------- |
| View/Pages     | `src/pages/`        | ✅ Bem definida, lazy loading      |
| Componentes    | `src/components/`   | ⚠️ Feature-based mas inconsistente |
| Hooks (lógica) | `src/hooks/`        | ⚠️ Alguns hooks em `components/`   |
| Contextos      | `src/contexts/`     | ✅ 4 contextos, enxutos            |
| Serviços       | `src/services/`     | ⚠️ Mistura domain + infra          |
| Utilitários    | `src/utils/`        | ⚠️ Duplicação com `lib/`           |
| Biblioteca     | `src/lib/`          | 🔴 Sem identidade clara            |
| Tipos          | `src/types/`        | ✅ Bem separado                    |
| Store          | `src/store/`        | ✅ Zustand isolado                 |
| Integrações    | `src/integrations/` | ✅ Supabase client + tipos         |
| Config         | `src/config/`       | ✅ Só navegação                    |
| Estilos        | `src/styles/`       | ✅ Isolado                         |

**Problema:** Não há arquitetura nomeada/documentada. MASTER_BLUEPRINT.md cobre DB, não frontend.

**Recomendação:** Adotar explicitamente Feature-Based Architecture. Documentar no MASTER_BLUEPRINT.md.

---

## FASE 2 — ESTRUTURA DO PROJETO

### ✅ Acertos
- Lazy loading em todas as páginas (React.lazy + Suspense)
- Separação clara entre UI primitives e componentes de domínio
- Edge Functions organizadas por função, migrations cronológicas

### 🔴 Problemas Críticos

| ID     | Problema                             | Evidência                                                                                                                                                            |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STR-01 | `src/lib/` sem identidade            | queryClient, dateUtils, categoryKeywords, banks, avatars, brokers, cryptoAssets, defaultCategories, dialog-variants, utils, settlementValidation.test — mistura tudo |
| STR-02 | `dateUtils` duplicado                | `src/lib/dateUtils.ts` (493 linhas) e `src/utils/dateUtils.ts`                                                                                                       |
| STR-03 | Hooks em `components/`               | `useInvestmentIR.tsx`, `useAccountingDRE.tsx`, `useAdminActions.ts`, `useAccountingExport.ts`                                                                        |
| STR-04 | `useTransactions.ts` re-export vazio | 30 linhas só com `export * from`                                                                                                                                     |

### 📊 Arquivos Gigantes (>500 linhas)

| Arquivo                       | Linhas |
| ----------------------------- | ------ |
| `AdminResetPanel.tsx`         | 955    |
| `investmentExport.ts`         | 835    |
| `HelpSettings.tsx`            | 800    |
| `notificationGenerator.ts`    | 789    |
| `useTransactionForm.ts`       | 779    |
| `CreditCards.tsx`             | 766    |
| `CreditCardDetailView.tsx`    | 753    |
| `banks.ts`                    | 752    |
| `notificationService.ts`      | 744    |
| `useSharedExpensesActions.ts` | 736    |
| `TripSummaryTab.tsx`          | 669    |

**30+ arquivos > 200 linhas** — regra do próprio projeto violada.

---

## FASE 3 — RESPONSABILIDADES (SRP)

| ID     | Arquivo                                     | Problema                                                         |
| ------ | ------------------------------------------- | ---------------------------------------------------------------- |
| SRP-01 | `CreditCardDetailView.tsx` (753 linhas)     | Faturas, gráficos, simulador, pagamento, edição, arquivamento    |
| SRP-02 | `TripSummaryTab.tsx` (669 linhas)           | Resumo, gráficos, despesas, splits, settlements                  |
| SRP-03 | `AdminResetPanel.tsx` (955 linhas)          | Monólito: queries, mutations, UI, diálogos, formulários          |
| SRP-05 | `useTransactionForm.ts` (779 linhas)        | God Hook: validação, submissão, splits, parcelamento, categorias |
| SRP-06 | `CategoryPredictionService.ts` (538 linhas) | ML, cache, fallback keywords                                     |
| MIX-01 | `Dashboard.tsx`                             | Regras de shared expenses inline no useMemo                      |
| MIX-02 | `AppLayout.tsx`                             | Injeção de categorias padrão inline                              |

---

## FASE 4 — SOLID

- **SRP:** 6+ violações (FASE 3). `useTransactionForm.ts` é "God Hook"
- **OCP:** ✅ RPCs estendidas via migrations. ⚠️ notification services difíceis de estender
- **LSP:** ✅ Componentes Radix. Sem herança significativa
- **ISP:** ⚠️ `TransactionFormState` com 45 campos em uma interface
- **DIP:** ❌ Hooks importam `supabase` diretamente, sem abstração

---

## FASE 5 — DRY: Duplicações

| ID     | Duplicação                                                                           |
| ------ | ------------------------------------------------------------------------------------ |
| DRY-01 | `dateUtils` em `lib/` e `utils/`                                                     |
| DRY-02 | `notificationGenerator` + `notificationService` (789 + 744 linhas)                   |
| DRY-03 | `parseToDecimal` em `moneyUtils` e `SafeFinancialCalculator`                         |
| DRY-04 | `activeTrip` em `Dashboard.tsx` e `TransactionForm.tsx`                              |
| DRY-06 | Keywords de categorias em `lib/categoryKeywords.ts` e `services/ai/localMappings.ts` |
| DRY-07 | `usagePercent` em `CreditCardDetailView` e `useCreditCardsDashboard`                 |

---

## FASE 6 — KISS: Complexidade Desnecessária

- `useTransactions.ts` — camada intermediária sem valor
- `rpcWithRetry.ts` — 3 níveis de abstração (Supabase já tem retry)
- `moneyUtils` + `SafeFinancialCalculator` — dupla camada Decimal.js
- `dialog-variants.ts` — 1 linha de CSS em arquivo dedicado

---

## FASE 7 — ACOPLAMENTO

- **Sem dependências circulares** ✅
- **`App.tsx`**: 14 rotas hardcoded com wrappers repetidos
- **`AppLayout.tsx`**: 30+ imports, acoplado a 8 domínios
- **Hooks → Supabase**: acoplamento direto sem abstração
- **Dashboard → useFamilyMembers**: acoplamento cross-domain para filtro

---

## FASE 8 — COESÃO

| ID     | Problema                                                                            |
| ------ | ----------------------------------------------------------------------------------- |
| COH-01 | `src/lib/` — 13 arquivos sem relação entre si                                       |
| COH-02 | `useFamily.ts` (547 linhas) — CRUD família + membros + convites + perfis + contatos |
| COH-03 | `useSharedExpensesActions.ts` (736 linhas) — CRUD + settle + unsettle + múltiplos   |
| COH-04 | `AppLayout.tsx` — layout + navegação + temas + busca + onboarding + categorias      |

---

## FASE 9 — COMPONENTIZAÇÃO

### ✅ Bem Projetados
`GoalCard`, `GoalMilestonesPanel`, `SwipeableRow`, `PullToRefresh`, `RippleEffect`, `DashboardHero`, `DashboardRecentActivity`

### 🔴 Problemáticos (>500 linhas)
`AdminResetPanel` (955), `CreditCardDetailView` (753), `TripSummaryTab` (669), `TripExpensesTab` (573), `SharedTripCard` (572), `TransactionForm` (554), `AssetTransactionDialog` (522), `SharedExpenseCard` (505)

---

## FASE 10 — HOOKS

### ✅ Bem Projetados
`useDashboardData` (RPC otimizada), `useGlobalRealtime` (retry inteligente), `usePullToRefresh`, `useGoalMilestones`

### 🔴 Problemáticos
`useTransactionForm` (779 linhas, God Hook), `useSharedExpensesActions` (736), `useFamily` (547), `useAccounts` (548), `useCreateTransaction` (551), `useAdminActions` (556, em pasta errada)

---

## FASE 11 — CONTEXTS

**Sem problemas.** AuthContext, MonthContext, PrivacyContext, TransactionModalContext — todos enxutos e bem definidos.

---

## FASE 12 — GERENCIAMENTO DE ESTADO

- ✅ TanStack Query v5 + Zustand + Context API
- ⚠️ `TransactionFormState` (Zustand) — 45 campos, deveria ser fatiada
- ⚠️ Cache IndexedDB sem criptografia (SEC-08 pendente)

---

## FASE 13 — APIs

- ✅ Ponto único: `supabase` client. `rpcWithRetry` com AbortController
- ⚠️ `supabase.rpc` tipado como `any`. Sem tratamento centralizado de erros
- ⚠️ Edge Functions sem versionamento

---

## FASE 14 — ROTAS

- ✅ Lazy loading + ProtectedRoute + PinWrapper
- ⚠️ 14 rotas com JSX idêntico copiado em `App.tsx`
- ⚠️ Sem nested routes (todas flat)

---

## FASE 15 — TYPESCRIPT

- ✅ Strict Mode, tipos Supabase gerados
- 🔴 20+ `any` em produção (calculators: 6, hooks: 15+)
- `as any` casts em `useDashboard`, `useFinancialSummary`, `useTransactionMutations`

---

## FASE 16 — PADRÕES DE DESIGN

Repository (implícito), Observer (Realtime), Factory (Supabase), Strategy (Workbox), Adapter (localforage), Singleton (queryClient), Command (RPCs). **Falta:** Repository Pattern explícito, Result/Either Pattern.

---

## FASE 17 — ESCALABILIDADE

| Usuários | Status                                          |
| -------- | ----------------------------------------------- |
| 10-100   | ✅ Confortável                                   |
| 1.000    | ✅ Viável                                        |
| 10.000   | ⚠️ Atenção: 10k canais Realtime                  |
| 100.000  | 🔴 Problemático: Realtime não escala linearmente |
| 1M       | 🔴 Inviável sem redesign                         |

**Gargalos:** `useGlobalRealtime()` (1 canal/usuário), RPC `get_dashboard_summary`, Edge Function sem batching.

---

## FASE 18 — MANUTENIBILIDADE

| Critério     | Nota |
| ------------ | ---- |
| Legibilidade | 7/10 |
| Organização  | 5/10 |
| Complexidade | 6/10 |
| Onboarding   | 5/10 |
| Documentação | 7/10 |

---

## FASE 19 — DÍVIDA TÉCNICA

Pendente: SEC-08 (IndexedDB crypto), ARC-05 (PDF Web Worker), RLS-01 (cross-family), FEAT-01 (email mensal).

---

## FASE 20 — SCORE: 62/100

| Categoria        | Nota |
| ---------------- | ---- |
| Estrutura        | 6/10 |
| Organização      | 6/10 |
| Arquitetura      | 5/10 |
| Camadas          | 7/10 |
| Dependências     | 7/10 |
| Componentização  | 5/10 |
| Hooks            | 6/10 |
| Contextos        | 9/10 |
| Estado           | 8/10 |
| TypeScript       | 5/10 |
| Segurança        | 8/10 |
| Documentação     | 8/10 |
| Escalabilidade   | 5/10 |
| Manutenibilidade | 5/10 |

---

## PLANO DE REFATORAÇÃO

### 🔴 Sprint 1 (1-2 semanas)
1. Unificar `dateUtils` — deletar `lib/dateUtils.ts`
2. Reorganizar `lib/` → `data/`, `config/`, `utils/`
3. Mover hooks de `components/` para `hooks/`
4. Remover `useTransactions.ts` re-export

### 🟠 Sprint 2 (2-3 semanas)
5. Quebrar `AdminResetPanel` (955 linhas)
6. Quebrar `CreditCardDetailView` (753 linhas)
7. Quebrar `TripSummaryTab` (669 linhas)
8. Unificar `moneyUtils` + `SafeFinancialCalculator`
9. Resolver duplicação notificationGenerator/notificationService

### 🟡 Sprint 3 (3-4 semanas)
10. Eliminar `any` types
11. Refatorar `useTransactionForm` (779 linhas)
12. Refatorar rotas com factory pattern
13. Separar `useFamily` em hooks independentes

### 🔵 Sprint 4 (4-6 semanas)
14. Repository Pattern para Supabase
15. Feature-Based Architecture (`features/`)
16. Cache layer para RPCs
17. Paginação na Edge Function

---

## ARQUITETURA IDEAL (Target)

```
src/
├── features/{auth,dashboard,transactions,accounts,credit-cards,...}/
├── components/ui/           # Design system
├── hooks/                   # Cross-feature hooks
├── contexts/                # Global contexts
├── services/                # Domain services
├── repositories/            # Data access (Supabase)
├── utils/                   # Pure utilities
├── types/                   # Shared types
├── config/                  # App configuration
├── data/                    # Static data
└── integrations/            # External clients
```

---

> **Conclusão:** Backend excelente (RLS, RPCs atômicas, invariáveis). Frontend acumulou dívida por crescimento rápido sem enforcement. O plano de 4 sprints elevaria o score de 62 para 85+.
