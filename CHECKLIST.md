# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.
> Última atualização: 2026-06-25

---

## 🔴 CRÍTICO — Fazer Agora (Bloqueadores de Segurança)

- [ ] **[SEC-01]** Remover Mock Auth de produção
  - Arquivo: `src/contexts/AuthContext.tsx:24`
  - Fix: `if (import.meta.env.DEV && localStorage.getItem('PLAYWRIGHT_MOCK_AUTH') === 'true')`
  - Esforço: XS (1 linha)

- [ ] **[SEC-02]** PIN: mover verificação para RPC com bcrypt
  - Arquivo: `src/components/auth/PinWrapper.tsx`
  - Fix: criar RPC `verify_pin(p_pin_hash TEXT) RETURNS BOOLEAN` com rate limit no DB
  - Remover `profiles.app_pin` plaintext; migrar para hash
  - Esforço: M (1-2 dias)

- [ ] **[ARC-01]** Transações compartilhadas: atomicidade via RPC
  - Problema: N inserts sequenciais sem rollback
  - Fix: criar RPC `create_shared_transaction(...)` com `BEGIN/COMMIT/ROLLBACK`
  - Esforço: M

- [ ] **[ARC-02]** Parcelamentos: atomicidade via RPC
  - Problema: N inserts sequenciais sem rollback
  - Fix: criar RPC `create_installment_series(...)` com `BEGIN/COMMIT/ROLLBACK`
  - Esforço: M

---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [ ] **[SEC-03]** Adicionar Content-Security-Policy em `vercel.json`
  - Valor sugerido: `default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'`
  - Esforço: XS

- [ ] **[SEC-05]** Fixar OAuth redirect em Vercel Preview URLs
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
