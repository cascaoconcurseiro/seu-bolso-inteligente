# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: **2026-07-02 — Fix exclusão de transações + hardening** ✅

---

## ✅ CONCLUÍDO — Sessão 02/07/2026 (5 migrations)

### 🔴 Bug de exclusão de transações — RESOLVIDO
- [x] **[DEL-01]** RPC `soft_delete_transaction` criada — validação server-side (permissão dono/criador/admin-editor, liquidação, acertos em splits, cascata NONE/NEXT/ALL, espelhos) e **erro explícito se 0 linhas** (antes: UPDATE com `.eq(user_id)` falhava em silêncio e a transação "voltava")
- [x] **[DEL-02]** 4 RPCs SECURITY DEFINER vazavam transações soft-deletadas (bypassavam RLS): `get_shared_invoice_data`, `get_monthly_financial_summary`, `get_shared_expense_summary_by_person`, `get_wealth_evolution` — filtro `deleted_at IS NULL` server-side
- [x] **[DEL-03]** Frontend `useDeleteTransaction` migrado para a RPC

### 🟠 Verificações e limpeza
- [x] **[BAL-06]** 3 contas revalidadas (Visa Platinium, Carrefour, Azul infinite): saldo armazenado = recalculado ✅ ("Nubank CC" não existe mais — eram contas de usuários diferentes, não duplicatas)
- [x] **[DUP-01]** 2 duplicatas reais soft-deletadas (Wise - Conta Global e Minha Carteira, ambas 0 transações/saldo 0)
- [x] **[PROF-01]** `profiles.app_pin` (plaintext) dropada; `set_pin`/`clear_pin` atualizadas
- [x] **[FUT-01]** 11 transações futuras auditadas: são parcelas legítimas (Hotel 12x, AirBNB 5x) — nada a corrigir
- [x] **[SEC-ADV]** Hardening por advisors: search_path fixado em todas as funções próprias, EXECUTE revogado de `anon`/`public` em todas as SECURITY DEFINER (28 expostas), triggers não-chamáveis via REST
- [x] **[TYP-02]** types.ts regenerado (soft_delete_transaction + app_pin removida)

### 📋 Advisors restantes (não-bloqueantes, decisão consciente de adiar)
- [ ] **[PERF-ADV]** 5 combos de políticas RLS permissivas múltiplas (transactions UPDATE, error_logs SELECT, shared_credit_cards SELECT/UPDATE, transaction_splits SELECT, trip_invitations UPDATE) — consolidar exige cuidado, semântica de permissão em uso
- [ ] **[AUTH-ADV]** Habilitar leaked password protection + mais opções de MFA (config no dashboard Supabase, não é SQL)
- [ ] **[EXT-ADV]** pg_trgm no schema public (mover é arriscado, baixo valor)

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

## 🟠 ALTA PRIORIDADE — Esta Semana

- [ ] **[BASELINE]** Criar migration baseline (19 tabelas SQL Editor sem CREATE TABLE)
  - Bloqueio: requer Docker (`supabase db dump`)
  - Schema definitions capturados via RPC em schema_full.json (referência)
- [ ] **[ERROR_LOG]** Atualizar migration `20260527135500` com schema real do `error_logs`
  - Já documentado como comment na migration `20260701235900`

---

## 🟡 BACKLOG TÉCNICO

- [ ] **[ARC-05]** PDF export via Web Worker (frontend)
- [ ] **[SEC-08]** Criptografar cache IndexedDB (frontend)
- [ ] **[FEAT-01]** Relatório mensal por email (Edge Function + Resend)
- [ ] **[CONC-01]** Teste de concorrência real (pgbench em staging)
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
