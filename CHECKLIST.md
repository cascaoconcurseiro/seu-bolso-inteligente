# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: 2026-06-25

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

- [ ] **[ARC-03]** Adicionar `AbortController` em `rpcWithRetry`
  - Problema: `Promise.race` não cancela a requisição original (conexões zumbi)
  - Arquivo: `src/utils/rpcWithRetry.ts`
  - Esforço: S

- [ ] **[ARC-04]** Global search via full-text PostgreSQL
  - Problema: busca limitada a 1000 transações em cache
  - Fix: RPC `search_transactions(p_query TEXT)` com `tsvector`
  - Esforço: S

- [ ] **[ARC-05]** PDF export via Web Worker
  - Problema: geração bloqueia main thread → UI freeze
  - Esforço: S

- [ ] **[SEC-06]** CHECK constraints no PostgreSQL para validações críticas
  - `CHECK (amount > 0)` em transactions
  - `CHECK (competence_date = date_trunc('month', competence_date))` 
  - Esforço: S

- [ ] **[SEC-07]** Revisar uso de `service_role` em `sync-b3-tickers`
  - Verificar se policy específica resolve sem bypass total de RLS
  - Esforço: S

- [ ] **[SEC-08]** Criptografar cache IndexedDB
  - Dados financeiros em IndexedDB sem criptografia
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
