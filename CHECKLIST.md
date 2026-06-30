# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: 2026-06-30 — Pós-Auditoria Completa

---

## 🔴 CRÍTICO — Fazer Agora (Bloqueadores de Segurança)

- [x] **[SEC-01]** ~~Remover Mock Auth de produção~~ ✅ DONE
  - `AuthContext.tsx:24` — gate com `import.meta.env.DEV`

- [x] **[SEC-02]** ~~PIN: mover verificação para RPC com bcrypt~~ ✅ DONE
  - Migration: `pgcrypto` + `app_pin_hash` column + `verify_pin` / `set_pin` / `clear_pin` RPCs
  - Frontend: `PinWrapper.tsx` — RPC call + lockout 5 tentativas / 60s
  - Frontend: `SecuritySettings.tsx` — `set_pin` / `clear_pin` RPCs

- [x] **[ARC-01]** ~~Transações compartilhadas: atomicidade via RPC~~ ✅ DONE
  - Migration: `create_transaction_with_splits(p_transaction, p_splits)` RPC
  - Frontend: `useCreateTransaction.ts` — usa RPC atômica quando há splits

- [x] **[ARC-02]** ~~Parcelamentos: atomicidade via RPC~~ ✅ DONE
  - Migration: `create_installment_series(p_transactions)` RPC com splits embutidos
  - Frontend: `useCreateTransaction.ts` — usa RPC atômica para todos os parcelamentos

- [x] **[AUD-02]** ~~types.ts desatualizado (+4 tabelas, +2 colunas ausentes)~~ ✅ DONE
  - `error_logs`, `goal_milestones`, `push_subscriptions`, `settlement_reversals`, `member_type`, `app_pin_hash`

- [x] **[AUD-03]** ~~error_reports duplicado com error_logs~~ ✅ DONE — droppado (vazio)
- [x] **[AUD-04]** ~~View active_family_members sem member_type~~ ✅ DONE — view recriada
- [x] **[AUD-05]** ~~accountTypeLabels sem CREDIT_CARD e GLOBAL_ACCOUNT~~ ✅ DONE — 3 arquivos corrigidos
- [x] **[AUD-06]** ~~RLS ausente em goal_milestones e push_subscriptions~~ ✅ DONE — policies criadas
- [ ] **[AUD-07]** Investigar `financial_ledger` (252 rows) — migrar dados e dropar tabela

---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [x] **[SEC-03]** ~~Adicionar Content-Security-Policy em `vercel.json`~~ ✅ DONE
  - CSP adicionado cobrindo supabase, bcb.gov.br, brapi.dev

- [ ] **[SEC-05]** Fixar OAuth redirect em Vercel Preview URLs (config Supabase, sem código)
  - Problema: `window.location.origin` em `AuthContext.tsx:85` falha em previews
  - Fix: cadastrar wildcard `https://*.vercel.app/**` no Supabase Auth → Allowed Redirect URLs
  - Esforço: XS (config Supabase, sem código)

- [ ] **[RLS-01]** Confirmar e implementar RLS cross-family para cartão compartilhado
  - Mencionado em `CLAUDE_HANDOFF.md` como pendente
  - Requer `SECURITY DEFINER` para evitar recursão
  - Esforço: S

---

## 🟡 BACKLOG TÉCNICO — Próximas Sprints

- [x] **[ARC-03]** ~~AbortController em rpcWithRetry~~ ✅ DONE
  - `rpcWithRetry.ts` — substituído `Promise.race` por `AbortController` + `.abortSignal()`
  - Requests verdadeiramente cancelados no timeout, sem conexões zumbi

- [x] **[ARC-04]** ~~Global search server-side~~ ✅ DONE
  - Migration: `search_transactions(p_query, p_limit)` RPC com ILIKE
  - `GlobalSearch.tsx` — cache-first + fallback server com debounce 400ms

- [ ] **[ARC-05]** PDF export via Web Worker
  - Problema: jsPDF bloqueia main thread → UI freeze em relatórios grandes
  - Esforço: M (requer testes de UI)

- [x] **[SEC-06]** ~~CHECK constraints no PostgreSQL~~ ✅ DONE
  - `amount > 0`, `competence_date = first of month`, `description not empty`
  - Installment numbers válidos, split percentage 0-100, goals target > 0

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
