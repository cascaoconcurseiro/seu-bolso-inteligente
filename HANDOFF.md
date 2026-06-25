# HANDOFF.md — Passagem de Sessão: Seu Bolso Inteligente

> Este documento deve ser lido no INÍCIO de toda nova sessão de IA.
> Atualizar no FINAL de cada sessão antes de encerrar.
> Última atualização: 2026-06-25

---

## ESTADO ATUAL DA SESSÃO

**Branch ativa:** `claude/compassionate-mendel-6zyijq`
**Última ação:** Auditoria técnica E2E completa (5 passos) + criação dos docs de gestão de sessão

---

## O QUE FOI FEITO NESTA SESSÃO

1. **Auditoria técnica E2E completa** — 5 passos:
   - Passo 1: 15 fluxos E2E mapeados com pontos críticos
   - Passo 2: 5 cenários de concorrência/race conditions auditados
   - Passo 3: Matriz de error handling por fluxo + análise do rpcWithRetry
   - Passo 4: 9 vulnerabilidades de segurança classificadas por severidade
   - Passo 5: Matriz de risco consolidada + pontos fortes + ranking de fixes

2. **Arquivos deletados** (por solicitação do usuário — não eram mais seguidos):
   - `.kiro/steering/elite-agency-rules.md`
   - `.kiro/steering/design-system.md`
   - `.agents/AGENTS.md`
   - `.kiro/specs/seu-bolso-inteligente-critical-fixes/requirements.md`

3. **Documentos criados** (gestão de sessão):
   - `MASTER_BLUEPRINT.md` — mapa arquitetural completo
   - `CHECKLIST.md` — kanban de tarefas em markdown
   - `HANDOFF.md` — este documento

---

## PRÓXIMAS AÇÕES RECOMENDADAS (por prioridade)

### 1. Fix IMEDIATO — 5 minutos (SEC-01)
```typescript
// src/contexts/AuthContext.tsx:24
// ANTES:
const isMockAuth = localStorage.getItem('PLAYWRIGHT_MOCK_AUTH') === 'true';
// DEPOIS:
const isMockAuth = import.meta.env.DEV && localStorage.getItem('PLAYWRIGHT_MOCK_AUTH') === 'true';
```

### 2. Fix IMEDIATO — 5 minutos (SEC-03)
Adicionar em `vercel.json` dentro do array de headers:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.bcb.gov.br; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:"
}
```

### 3. Fix MÉDIO (ARC-01 + ARC-02) — RPCs atômicas
- Criar RPC `create_shared_transaction()` para transações compartilhadas
- Criar RPC `create_installment_series()` para parcelamentos
- Ambas com `BEGIN/COMMIT/ROLLBACK`

### 4. Fix MÉDIO (SEC-02) — PIN seguro
- Criar RPC `verify_pin(p_pin_hash TEXT) RETURNS BOOLEAN`
- Hash com `pgcrypto.crypt()` no banco
- Rate limit: max 5 tentativas por hora por usuário
- Remover `app_pin` plaintext do `profiles`

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

| ID | Local | Descrição | Fix |
|---|---|---|---|
| SEC-01 | AuthContext.tsx:24 | Mock Auth em produção | `import.meta.env.DEV &&` |
| SEC-02 | PinWrapper.tsx | PIN plaintext + sem rate limit | RPC bcrypt |
| ARC-01 | hooks/useSharedExpenses | N inserts sem atomicidade | RPC atômica |
| ARC-02 | hooks/transactions/* | Parcelamento sem rollback | RPC atômica |

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
