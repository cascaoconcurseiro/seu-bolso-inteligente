# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: 2026-06-30 — Pós-Auditoria de Qualidade de Código (21 fases)

---

## 🔴 CRÍTICO — Código (Auditoria 21 Fases 2026-06-30)

- [ ] **[CQ-01]** `CreateTransactionInput` propriedade duplicada (`splits` + `transaction_splits`) — `hooks/transactions/types.ts:74,83`
- [ ] **[CQ-02]** `console.error` direto em `CategorySettings.tsx:57` — usar `logger.error`
- [ ] **[CQ-03]** Testes `rpcWithRetry` totalmente desabilitados (`.skip`) — 2 arquivos
- [ ] **[CQ-04]** `useCreateAccount` sem atomicidade — criar RPC `create_account_with_balance`
- [ ] **[CQ-05]** `contributeToGoal` sem atomicidade — criar RPC `contribute_to_goal`
- [ ] **[CQ-06]** `deleteGoal` usa `LIKE '%meta%'` para cascata — adicionar `goal_id` FK

## 🟠 ALTA PRIORIDADE — Código

- [ ] **[CQ-07]** Unificar 3 definições de `Transaction` (types.ts + validationService + settlementValidation)
- [ ] **[CQ-08]** Quebrar `useSharedExpensesActions` (40 props) em 4 hooks menores
- [ ] **[CQ-09]** Extrair `recalculateSplits` de `useUpdateTransaction` (120 linhas)
- [ ] **[CQ-10]** Decompor `CreditCards.tsx` (720 linhas)
- [ ] **[CQ-11]** Decompor `AdminResetPanel.tsx` (800+ linhas, `CONFIRM_WORD` morta)
- [ ] **[CQ-12]** Extrair `applyTransactionFilters` (lógica duplicada em Transactions.tsx)
- [ ] **[CQ-13]** Extrair month names para constante (duplicado 3x)
- [ ] **[CQ-14]** `Promise.all` → `Promise.allSettled` em `queryInvalidation.ts`
- [ ] **[CQ-15]** Corrigir `useEffect` dep instável em `useSharedFinances`
- [ ] **[CQ-16]** Corrigir timezone em `utils/dateUtils.ts` e `lib/invoiceUtils.ts`

## 🟡 MÉDIA PRIORIDADE — Código

- [ ] **[CQ-17]** Remover ~80 `any` do código de produção (28 arquivos)
- [ ] **[CQ-18]** Separar `CreateTransactionInput` em inputs tipados (ISP)
- [ ] **[CQ-19]** `status: string` → `'CONFIRMED' | 'PENDING' | 'CANCELLED'`
- [ ] **[CQ-20]** `recurrence_day?: number` → branded type 1-31
- [ ] **[CQ-21]** Corrigir atomicidade em `createAsset`
- [ ] **[CQ-22]** Unificar formatação BRL com `moneyUtils.format()`
- [ ] **[CQ-23]** Criar constante `DEFAULT_CURRENCY`

## 🔵 BAIXA PRIORIDADE — Código

- [ ] **[CQ-24]** Unificar `useDeleteNotification`/`useDismissNotification`
- [ ] **[CQ-25]** Remover API dupla de `TransactionModal`
- [ ] **[CQ-26]** Corrigir toast duplicado em `useCreateTrip`
- [ ] **[CQ-27]** Mover `localStorage.setItem` de `queryFn` para `onSuccess`
- [ ] **[CQ-28]** `batchRpcWithRetry`: `Promise.all` → `Promise.allSettled`

## 🧪 TESTES

- [ ] **[TST-01]** Reescrever 7 testes fake (useTransactions, useSettlement, settlementValidation, invoiceUtils, rpcWithRetry ×2, money.spec)
- [ ] **[TST-02]** Adicionar testes de comportamento nos 3 snapshot-only
- [ ] **[TST-03]** Criar testes para mutations (useTransactionMutations, useAccounts)
- [ ] **[TST-04]** Expandir E2E: 1 fluxo CRUD completo por página

## ✅ INFRA — Concluído (Auditoria Anterior)

- [x] **[INFRA-01..07]** Sentry, CI/CD, env vars — configurados
- [x] **[INFRA-14]** `console.error` → `logger.error` em CategorySettings
- [x] **[AUD-08..18]** Segurança: JWT, CORS, CSP, rate limits, CRON_SECRET

## ⚠️ INFRA — Pendente

- [ ] **[INFRA-04]** Criar projeto Supabase de staging
- [ ] **[INFRA-05]** Adicionar `https://*.vercel.app/**` no Supabase Auth Redirect URLs
- [ ] **[INFRA-08]** Configurar PgBouncer
- [ ] **[INFRA-20]** Criptografia de IndexedDB

- [x] **[SEC-07]** ~~service_role em sync-b3-tickers~~ ✅ ACEITÁVEL
  - Cron job escreve em tabela pública de referência (sem dados de usuário)
  - Uso de service_role é justificado; sem mudança necessária

- [ ] **[SEC-08]** Criptografar cache IndexedDB
  - Dados financeiros em IndexedDB sem criptografia em dispositivos compartilhados
  - Esforço: M

- [ ] **[FEAT-01]** Relatório mensal por email
  - Mencionado em `CLAUDE_HANDOFF.md` como pendente
  - Via Edge Function + Resend/SendGrid
  - Esforço: M

---

## ✅ CONCLUÍDO

- [x] **[TASK-1.1]** Remover todos os `console.log` (apenas `logger.ts` permanece)
- [x] **[TASK-1.2]** Fixes de timezone com date-fns
- [x] **[TASK-1.3]** Validação de `payer_id`
- [x] **[FEAT-02]** Push notifications (VAPID + pg_cron)
- [x] **[FEAT-03]** Goal milestones + alertas 7 dias antes
- [x] **[FEAT-04]** SwipeableRow para mobile
- [x] **[FEAT-05]** Global search (Ctrl+K, cmdk)
- [x] **[FEAT-06]** `member_type` em `family_members` (família vs contatos)
- [x] **[FEAT-07]** Participantes guest em trips
- [x] **[FEAT-08]** Export PDF para metas
- [x] **[DOC-01]** Criar MASTER_BLUEPRINT.md
- [x] **[DOC-02]** Criar CHECKLIST.md
- [x] **[DOC-03]** Criar HANDOFF.md
- [x] **[AUD-01]** Auditoria técnica E2E completa (Passos 1-5)

---

## 🐛 BUG HUNT 2026-06-28 — Auditoria com 9 skills

### 🔴 CRÍTICOS (5) — Corrigidos
- [x] **[B-01]** `settle_split`: double-count no saldo (trigger + UPDATE manual)
- [x] **[B-02]** `settle_split`: race condition sem FOR UPDATE
- [x] **[B-03]** `settlement_reversals`: FK ON DELETE CASCADE → RESTRICT
- [x] **[B-04]** Senha hardcoded `909496` → `is_admin()` JWT-based
- [x] **[B-05]** `settle_split`: adicionada verificação de ownership (auth.uid)

### 🟠 ALTOS (8) — Corrigidos
- [x] **[B-06]** `unsettle_split`: DELETE físico → soft delete (deleted_at)
- [x] **[B-07]** CSP: removido `unsafe-eval` do vercel.json
- [x] **[B-08]** `settle_split`: CURRENT_DATE → parâmetro p_date
- [x] **[B-09]** `isReasonableDate`: dateUtils.parseDate() em vez de new Date()
- [x] **[B-22]** `settle_multiple_splits`: removido p_user_id arbitrário
- [x] **[B-11]** `settle_split`: validação de p_amount > 0 e = split.amount
- [x] **[B-12]** `settle_multiple`: validação cross-account
- [x] **[B-24]** `settlement_reversals`: FK RESTRICT (idem B-03)

### 🟡 MÉDIOS (12) — Corrigidos
- [x] **[B-10]** AuthContext: queryClient.clear() no signOut
- [x] **[B-14]** rpcWithRetry: risco documentado (limitação HTTP, idempotência server-side mitiga)
- [x] **[B-15]** recalculate_account_balance: = ANY(ARRAY(...)) em vez de LIMIT 1
- [x] **[B-16]** useCreateTransaction: inFlightRef reset no unmount
- [x] **[B-17]** useCreateTransaction: duplicidade check 15s + account_id null
- [x] **[B-25]** PrivacySettings: .limit(500) anti N+1
- [x] **[B-26]** groq-proxy: CORS para *.vercel.app
- [x] **[B-27]** send-bill-reminders: já remove subscriptions 404/410 ✅
- [x] **[B-28]** sw.ts: cache maxAge 7d → 1h

### 🔵 BAIXOS (4) — Corrigidos
- [x] **[B-18]** Inconsistência settle_split vs settle_multiple — resolvido via migrations
- [x] **[B-19]** isValidDate: new Date(year,month,0) — baixo risco, mantido
- [x] **[B-20]** error_logs: RLS restrito (is_admin + próprio usuário)
- [x] **[B-29]** Duplicado de B-15
- [x] **[B-30]** Duplicado de B-18

---

## 🔍 AUDITORIA DE PRODUTO 2026-06-30 — Achados (20 fases)

### 🔴 CRÍTICO — Produto

- [ ] **[PROD-01]** Relatório mensal por email não funciona — domínio Resend não verificado
  - `send-monthly-report` Edge Function funcional, mas emails retornam 403
  - Fix: verificar domínio ou usar `onboarding@resend.dev` como fallback
  - Esforço: XS (config)

- [ ] **[PROD-02]** SafeFinancialCalculator retorna `number` em vez de `Decimal`
  - Métodos `add()`, `subtract()` perdem precisão decimal
  - Refatorar para retornar `Decimal` — quebra compatibilidade com callers
  - Esforço: M

- [ ] **[PROD-03]** Sem sincronização bancária automática (Open Banking)
  - Principal gap competitivo vs YNAB, Mobills, Nubank, Inter
  - Usuário precisa digitar tudo manualmente
  - Esforço: L

### 🟠 ALTA — Produto

- [ ] **[PROD-04]** PDF export bloqueia UI main thread (jsPDF)
  - ARC-05: migrar para Web Worker
  - Esforço: M

- [ ] **[PROD-05]** Limite do cartão de crédito não validado
  - Usuário pode gastar além do limite sem alerta
  - Esforço: S

- [ ] **[PROD-06]** Sem alertas de orçamento estourado
  - Orçamento sem notificação perde função principal de controle
  - Adicionar push + destaque visual em 80% e 100%
  - Esforço: S

- [ ] **[PROD-07]** Sem projeção de fluxo de caixa futuro
  - Dashboard mostra apenas passado/presente
  - Criar projeção baseada em transações agendadas + médias
  - Esforço: M

- [ ] **[PROD-08]** Transferência entre contas sem atomicidade
  - Duas operações separadas — risco em caso de falha parcial
  - Criar RPC atômica `transfer_between_accounts`
  - Esforço: S

### 🟡 MÉDIA — Produto

- [ ] **[PROD-09]** Centralizar formatação de moeda — remover `formatCurrency` locais
  - Múltiplas implementações inconsistentes. Padronizar `moneyUtils.format()`
  - Esforço: XS

- [ ] **[PROD-10]** Acessibilidade: `aria-label` em cards interativos (GoalCard, AccountCard)
  - Esforço: XS

- [ ] **[PROD-11]** Acessibilidade: alternativas textuais para gráficos Recharts
  - Esforço: S

- [ ] **[PROD-12]** `useCreateTransaction` com 600+ linhas — quebrar em hooks menores
  - Extrair: `useTransactionValidation`, `useTransactionSplits`, `useAutoShare`
  - Esforço: M

- [ ] **[PROD-13]** Comparação "mês atual vs mês anterior" no Dashboard
  - Métrica básica de saúde financeira ausente
  - Esforço: S

- [ ] **[PROD-14]** Tooltip "Ctrl+K para buscar" visível no header
  - Busca global não é descoberta naturalmente
  - Esforço: XS

### 🔵 BAIXA — Produto

- [ ] **[PROD-15]** Simuladores apenas 2 tipos (Renda Fixa + IPCA)
  - Adicionar: juros compostos, aposentadoria, comparação de investimentos
  - Esforço: M

- [ ] **[PROD-16]** Onboarding não guia criação de conta bancária
  - Usuário novo precisa descobrir sozinho o próximo passo
  - Esforço: S

- [ ] **[PROD-17]** Terminologia confusa: "Compartilhado" vs "Compartilhar", "Próximas" vs "Agendadas"
  - Esforço: XS

- [ ] **[PROD-18]** Sem consolidação multi-moeda automática no Dashboard
  - Usuário precisa selecionar moeda manualmente
  - Esforço: M

### ✅ PROD — Constatado como correto na auditoria

- [x] **[PROD-OK-01]** SSOT de saldo via trigger PostgreSQL — robusto
- [x] **[PROD-OK-02]** Soft delete em todas tabelas financeiras — sem perda de dados
- [x] **[PROD-OK-03]** RPCs atômicas para splits, parcelamentos, liquidações
- [x] **[PROD-OK-04]** Audit trail imutável em settlement_reversals
- [x] **[PROD-OK-05]** CHECK constraints financeiras (amount > 0, competence_date = first)
- [x] **[PROD-OK-06]** PIN com bcrypt via RPC — segurança superior
- [x] **[PROD-OK-07]** RLS ativo em todas as tabelas
- [x] **[PROD-OK-08]** Gastos compartilhados com liquidação atômica — diferencial real
- [x] **[PROD-OK-09]** Viagens multi-moeda com guest — único no mercado
- [x] **[PROD-OK-10]** IRPF integrado com B3 — valor real para investidores
