# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: 2026-06-30 — Pós-Auditoria 20 Fases (NOTA: 76.0/100)

---

## 🔴 CRÍTICO — Fazer Agora

- [ ] **[BAL-01]** Corrigir 4 contas com saldo divergente (saldo != soma transações)
  - Visa Platinium: diff=-60.060,00 | Nubank CC: diff=-35.324,68 | Azul infinite: diff=-7.761,48 | Carrefour: diff=-500,00
  - Investigar `trigger_sync_account_balance` — verificar filtro `deleted_at IS NULL`
  - Rodar `SELECT recalculate_account_balance(<id>)` para cada conta
  - Ver `AUDIT_REPORT_COMPLETE.md` Fase 6.1

---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [ ] **[IDX-01]** Criar índices FK faltantes (2)
  - `admin_users(granted_by)`, `settlement_reversals(payment_transaction_id)`

- [ ] **[DUP-01]** Resolver 2 grupos de contas duplicadas (mesmo nome + user)
  - Soft-delete duplicada, migrar transações para ativa

- [ ] **[ARC-05]** PDF export via Web Worker
  - Problema: jsPDF bloqueia main thread → UI freeze em relatórios grandes
  - Esforço: M (requer testes de UI)

- [ ] **[SEC-08]** Criptografar cache IndexedDB
  - Dados financeiros em IndexedDB sem criptografia em dispositivos compartilhados
  - Esforço: M

---

## 🟡 BACKLOG TÉCNICO — Próximas Sprints

- [ ] **[TYP-01]** Regenerar types.ts (6 tabelas ausentes: credit_card_closing_overrides, error_logs, pin_attempts, transaction_auto_share_rules, shared_credit_cards, admin_users)
  - Rodar: `supabase gen types typescript > src/integrations/supabase/types.ts`

- [ ] **[FUT-01]** Auditar 11 transações com data futura (>30 dias)
  - Verificar se são parcelamentos válidos ou erro de competence_date

- [ ] **[FEAT-01]** Relatório mensal por email
  - Via Edge Function + Resend/SendGrid
  - Esforço: M

- [ ] **[CLEAN-01]** Avaliar remoção de colunas mortas
  - `transactions.reconciled`, `reconciled_at`, `reconciled_by`
  - `accounts.deleted` (boolean, redundante com is_active)
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
