# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: **2026-07-01 — Pós-Auditoria Completa** ✅

---

## ✅ CONCLUÍDO — Auditoria 01/07/2026 (7 migrations)

### 🔴 CRÍTICO — Corrigido
- [x] **[BAL-01]** `update_account_balance_on_insert()` recriada + trigger `trg_update_balance_insert`
- [x] **[BAL-02]** `update_account_balance_on_delete()` recriada + trigger `trg_update_balance_delete`
- [x] **[BAL-03]** Todos os saldos recalculados via `recalculate_account_balance()`
- [x] **[BAL-04]** `trigger_sync_account_balance` removido (double-counting com BAL-01)
- [x] **[BAL-05]** `financial_ledger` dropada com CASCADE

### 🟠 IMPORTANTE — Corrigido
- [x] **[CLEAN-01]** `calculate_account_balance()` no-param órfã dropada
- [x] **[CLEAN-02]** `is_family_member` → consolidado em `is_family_member_v2` (5 políticas RLS)
- [x] **[CLEAN-03]** `trigger_set_updated_at` → migrado para `update_updated_at_column`
- [x] **[CLEAN-04]** `reconciled_*` columns (3) dropadas + view transactions_ssot recriada
- [x] **[CLEAN-05]** `accounts.deleted` column dropada
- [x] **[CLEAN-06]** 6 funções órfãs dropadas (auditoria anterior)
- [x] **[CLEAN-07]** `cleanup_old_audit_logs()` dropada
- [x] **[CLEAN-08]** `handle_updated_at` dropada
- [x] **[IDX-01]** 4 índices novos + 4 órfãos do financial_ledger removidos + 1 duplicado
- [x] **[RLS-01]** `settlement_reversals` agora com RLS (SELECT, INSERT, ALL)
- [x] **[RLS-02]** 5 políticas RLS atualadas para `is_family_member_v2`
- [x] **[RLS-03]** 35 tabelas verificadas — todas com RLS ✅
- [x] **[TRIG-01]** `error_logs` trigger corrigido (`update_updated_at_column`)
- [x] **[TYP-01]** types.ts regenerado (x2, pós-drop de colunas)
- [x] **[CRON-01]** Cron jobs consolidados: 4 ativos, 1 redundante removido
- [x] **[OVERLOAD-01]** `get_admin_error_logs(text)` removido

---

## 🔴 CRÍTICO — Fazer Agora

- [ ] **[BAL-06]** Revalidar 4 contas com saldo divergente (auditoria anterior)
  - Visa Platinium: diff=-60.060 | Nubank CC: diff=-35.324 | Azul infinite: diff=-7.761 | Carrefour: diff=-500
  - Migration 20260702000000 já recalculou todos os saldos — provavelmente resolvido
  - **Ação:** rodar `SELECT recalculate_account_balance(id)` para cada conta e comparar

---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [ ] **[BASELINE]** Criar migration baseline (19 tabelas SQL Editor sem CREATE TABLE)
  - Bloqueio: requer Docker (`supabase db dump`)
  - Schema definitions capturados via RPC em schema_full.json (referência)
- [ ] **[ERROR_LOG]** Atualizar migration `20260527135500` com schema real do `error_logs`
  - Já documentado como comment na migration `20260701235900`
- [ ] **[DUP-01]** Resolver 2 grupos de contas duplicadas

---

## 🟡 BACKLOG TÉCNICO

- [ ] **[ARC-05]** PDF export via Web Worker (frontend)
- [ ] **[SEC-08]** Criptografar cache IndexedDB (frontend)
- [ ] **[FUT-01]** Auditar 11 transações com data futura (>30 dias)
- [ ] **[FEAT-01]** Relatório mensal por email (Edge Function + Resend)
- [ ] **[CONC-01]** Teste de concorrência real (pgbench em staging)
- [ ] **[PROF-01]** Remover `profiles.app_pin` (plaintext residual, já migrado para `app_pin_hash`)
- [x] **[AUD-07]** ~~financial_ledger dropado~~ ✅ DONE
- [x] **[AUD-08]** Auditoria 20 fases concluída → `AUDIT_REPORT_COMPLETE.md` ✅ DONE (2026-06-30)

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
