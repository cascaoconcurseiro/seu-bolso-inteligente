# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: **2026-07-01 — Pós-Auditoria Completa de Banco** ⭐

---

## ✅ CONCLUÍDO — Auditoria 01/07/2026 (4 migrations)

### 🔴 CRÍTICO — Corrigido
- [x] **[BAL-01]** `update_account_balance_on_insert()` recriada + trigger `trg_update_balance_insert`
- [x] **[BAL-02]** `update_account_balance_on_delete()` recriada + trigger `trg_update_balance_delete`
- [x] **[BAL-03]** Todos os saldos recalculados via `recalculate_account_balance()`
- [x] **[BAL-04]** `trigger_sync_account_balance` removido (double-counting com BAL-01)
- [x] **[BAL-05]** `financial_ledger` dropada com CASCADE (migration anterior falhou silenciosamente)

### 🟠 IMPORTANTE — Corrigido
- [x] **[CLEAN-01]** `calculate_account_balance()` no-param órfã dropada
- [x] **[CLEAN-02]** `is_family_member` → consolidado em `is_family_member_v2` (5 políticas RLS atualizadas)
- [x] **[CLEAN-03]** `trigger_set_updated_at` → migrado para `update_updated_at_column` (2 triggers)
- [x] **[CLEAN-04]** `handle_updated_at` já dropada pela auditoria anterior
- [x] **[CLEAN-05]** `fn_trg_family_invitation_notification` dropada ✓
- [x] **[CLEAN-06]** `validate_competence_date` dropada ✓
- [x] **[CLEAN-07]** `create_mirrored_transaction_for_split` dropada ✓
- [x] **[CLEAN-08]** `update_mirrored_transactions_on_transaction_update` dropada ✓
- [x] **[CLEAN-09]** `cleanup_old_audit_logs()` (no-param) dropada ✓
- [x] **[CRON-01]** Cron job `monthly-audit-log-cleanup` (já existia, mantido)
- [x] **[CRON-02]** Cron job `weekly_audit_log_cleanup` removido (redundante)

### 🟡 PENDENTES ANTIGOS — Corrigidos
- [x] **[IDX-01]** Índices FK faltantes criados: `trip_exchange_purchases`, `credit_card_closing_overrides`, `notification_preferences`, `asset_transactions`
- [x] **[IDX-02]** Índice `budgets.user_id` (já existia no remote)
- [x] **[IDX-03]** Índice `trip_checklist.trip_id` (já existia no remote)
- [x] **[IDX-04]** Índices órfãos do `financial_ledger` removidos (4)
- [x] **[IDX-05]** Índice duplicado `idx_family_members_status_active` removido
- [x] **[RLS-01]** `settlement_reversals` agora tem políticas RLS (SELECT, INSERT, ALL)
- [x] **[RLS-02]** `families` — política "Users can view their families" recriada com `is_family_member_v2`
- [x] **[RLS-03]** Verificação completa: **todas as 35 tabelas** têm RLS enabled ✅
- [x] **[SEC-01]** `search_path` seguro em todas as funções SECURITY DEFINER recriadas

---

## 🔴 CRÍTICO — Fazer Agora

- [ ] **[BAL-06]** Verificar 4 contas com saldo divergente reportadas na auditoria anterior
  - Visa Platinium: diff=-60.060,00 | Nubank CC: diff=-35.324,68 | Azul infinite: diff=-7.761,48 | Carrefour: diff=-500,00
  - A correção do BAL-01/02/03 pode ter resolvido — revalidar

---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [ ] **[DUP-01]** Resolver 2 grupos de contas duplicadas (mesmo nome + user)
  - Soft-delete duplicada, migrar transações para ativa

- [ ] **[ARC-05]** PDF export via Web Worker
  - Problema: jsPDF bloqueia main thread → UI freeze em relatórios grandes
  - Esforço: M (requer testes de UI)

- [ ] **[SEC-08]** Criptografar cache IndexedDB
  - Dados financeiros em IndexedDB sem criptografia em dispositivos compartilhados
  - Esforço: M

---

## 🟡 BACKLOG TÉCNICO

- [ ] **[BASELINE]** Criar migration baseline com schema das 19 tabelas criadas via SQL Editor
  - Tabelas: accounts, transactions, profiles, categories, budgets, families, family_members, family_invitations, trips, trip_members, trip_invitations, trip_checklist, trip_itinerary, trip_exchange_purchases, notifications, notification_preferences, asset_transactions, transaction_auto_share_rules, transaction_splits
  - Rodar: `supabase db dump --schema public` (requer Docker) e extrair CREATE TABLE

- [ ] **[ERROR_LOG]** Sincronizar migration `20260527135500` com schema real do `error_logs`
  - Migration diz: error_name, error_message, component_stack, user_message
  - Remote real: error_type, message, stack, url, file, line, col, user_agent, app_version, extra
  - O remote está correto (matching frontend types.ts)

- [ ] **[TYP-01]** Regenerar types.ts
  - Rodar: `npx supabase gen types typescript > src/integrations/supabase/types.ts`

- [ ] **[FUT-01]** Auditar 11 transações com data futura (>30 dias)
  - Verificar se são parcelamentos válidos ou erro de competence_date

- [ ] **[FEAT-01]** Relatório mensal por email
  - Via Edge Function + Resend/SendGrid

- [ ] **[CLEAN-10]** Avaliar remoção de colunas mortas
  - `transactions.reconciled`, `reconciled_at`, `reconciled_by`
  - `accounts.deleted` (boolean, redundante com is_active)

---

## 📊 MÉTRICAS DO BANCO (01/07/2026)

| Métrica | Valor |
|---------|-------|
| Tabelas | 35 (todas com RLS ✅) |
| Políticas RLS | ~100+ |
| Funções | ~85 (0 órfãs ✅) |
| Triggers | ~52 em 18 tabelas |
| Índices | ~110+ |
| Cron jobs | 4 ativos (daily_yields, send-bill-reminders, send-monthly-report, monthly-audit-log-cleanup) |
| Tabelas sem migration | 19 (SQL Editor) |
| Migrations total | 214 |
  - `profiles.app_pin` (plaintext residual, já migrado para app_pin_hash)

- [ ] **[CONC-01]** Teste de concorrência real (pgbench em staging)
  - Simular 2 usuários liquidando o mesmo split
  - Simular transferência simultânea

---

## ✅ CONCLUÍDO

- [x] **[CRIT-04]** ~~create_account_with_balance RPC atômica~~ ✅ DONE (2026-06-30)
- [x] **[CRIT-05]** ~~contribute_to_goal RPC atômica~~ ✅ DONE (2026-06-30)
- [x] **[CRIT-06]** ~~goal_id FK em transactions~~ ✅ DONE (2026-06-30)
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
