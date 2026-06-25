# HANDOFF.md — Passagem de Sessão: Seu Bolso Inteligente

> Este documento deve ser lido no INÍCIO de toda nova sessão de IA.
> Atualizar no FINAL de cada sessão antes de encerrar.
> Última atualização: 2026-06-25

---

## ESTADO ATUAL DA SESSÃO

**Branch ativa:** `claude/compassionate-mendel-6zyijq`
**Última ação:** Implementação de todos os fixes críticos de segurança e arquitetura

---

## O QUE FOI FEITO NESTA SESSÃO

1. **Auditoria técnica E2E completa** — 5 passos (15 fluxos, 9 vulnerabilidades, matriz de risco)

2. **Documentos de gestão de sessão criados:** `MASTER_BLUEPRINT.md`, `CHECKLIST.md`, `HANDOFF.md`

3. **[SEC-01] Mock Auth bypass removido de produção**
   - `src/contexts/AuthContext.tsx:24` — gate com `import.meta.env.DEV`

4. **[SEC-02] PIN hashing via pgcrypto**
   - Migration: `app_pin_hash` column + `verify_pin` / `set_pin` / `clear_pin` RPCs
   - `PinWrapper.tsx` — verificação via RPC, lockout após 5 tentativas (60s)
   - `SecuritySettings.tsx` — salva PIN via RPC (nunca plaintext)

5. **[ARC-01] Transação simples + splits: atomicidade garantida**
   - Migration: RPC `create_transaction_with_splits(p_transaction, p_splits)` — SECURITY DEFINER
   - `useCreateTransaction.ts` — usa RPC quando há splits, INSERT direto quando não há

6. **[ARC-02] Parcelamentos: atomicidade garantida**
   - Migration: RPC `create_installment_series(p_transactions)` — splits embutidos em cada tx
   - `useCreateTransaction.ts` — resolve membros ANTES do insert, embute splits, chama RPC

7. **[SEC-03] Content-Security-Policy adicionado**
   - `vercel.json` — CSP cobrindo Supabase, BCB, BrAPI, Yahoo Finance, blobs

8. **Arquivos deletados** (outdated rules, por solicitação):
   - `.kiro/steering/elite-agency-rules.md`, `design-system.md`, `.agents/AGENTS.md`, `requirements.md`

---

## PRÓXIMAS AÇÕES RECOMENDADAS (por prioridade)

### 1. SEC-05 — OAuth redirect em Vercel Preview URLs (config Supabase, sem código)
- No painel Supabase → Authentication → URL Configuration → Allowed Redirect URLs
- Adicionar: `https://*.vercel.app/**` e `https://*.vercel.app/`

### 2. RLS-01 — Cross-family cartão compartilhado
- Requer policy com `SECURITY DEFINER` para evitar recursão infinita
- Mencionado no CLAUDE_HANDOFF.md como pendente

### 3. ARC-03 — AbortController em rpcWithRetry
- Arquivo: `src/utils/rpcWithRetry.ts`
- `Promise.race` não cancela a request original; adicionar `AbortController`

### 4. FEAT-01 — Relatório mensal por email
- Edge Function + Resend/SendGrid
- pg_cron trigger no último dia do mês

---

## CONTEXTO TÉCNICO CRÍTICO PARA A PRÓXIMA SESSÃO

### Arquivos mais sensíveis
- `src/contexts/AuthContext.tsx` — Mock Auth bypass na linha 24
- `src/components/auth/PinWrapper.tsx` — PIN plaintext client-side
- `src/utils/rpcWithRetry.ts` — Promise.race leak
- `src/services/validationService.ts` — 436 linhas, validação só client-side
- `vercel.json` — headers de segurança, falta CSP

### RPCs que não devem ser reescritas no frontend
- `settle_split()` — já é atômica, não mexer
- `unsettle_with_reversal()` — audit trail imutável, não mexer
- `get_shared_invoice_data()` — lógica complexa de agregação no banco

### Padrões obrigatórios
- `Decimal.js` para qualquer cálculo com dinheiro
- `date-fns` para qualquer aritmética de data (nunca `new Date()`)
- `rpcWithRetry()` para RPCs críticas (não chamar `.rpc()` diretamente)
- Soft delete: `deleted_at = NOW()` (nunca `DELETE FROM`)

---

## VULNERABILIDADES CRÍTICAS ABERTAS

| ID | Local | Descrição | Status |
|---|---|---|---|
| SEC-05 | AuthContext.tsx:85 | OAuth quebra em Vercel Preview URLs | 🟡 Config Supabase |
| RLS-01 | migrations | RLS cross-family cartão compartilhado | 🟡 Pendente |
| ARC-03 | rpcWithRetry.ts | Promise.race leak (conexões zumbi) | 🟡 Backlog |

> Vulnerabilidades SEC-01, SEC-02, SEC-03, ARC-01, ARC-02 foram corrigidas nesta sessão ✅

---

## PENDÊNCIAS NÃO TÉCNICAS

- [ ] RLS cross-family para cartão compartilhado (mencionado no CLAUDE_HANDOFF.md como pendente)
- [ ] Relatório mensal por email (Edge Function + Resend)
- [ ] Wildcard de redirect no Supabase Auth para Vercel Preview URLs

---

## COMO ATUALIZAR ESTE DOCUMENTO

No final de cada sessão, atualize:
1. **Data** no cabeçalho
2. **"O que foi feito"** com bullet points das mudanças
3. **"Próximas ações"** reordenando por prioridade atual
4. **"Vulnerabilidades abertas"** removendo as corrigidas
5. **Branch ativa** se mudou

Depois: `git add HANDOFF.md CHECKLIST.md && git commit -m "chore: update session handoff" && git push`
