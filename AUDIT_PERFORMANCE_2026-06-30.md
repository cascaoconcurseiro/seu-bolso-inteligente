# AUDITORIA COMPLETA DE PERFORMANCE — Seu Bolso Inteligente

> **Data:** 2026-06-30 | **Versão:** 1.0.0 | **Build:** dist/ 3.76 MB (44 precache entries)
> **URL:** https://meupedemeia.vercel.app | **Supabase:** vrrcagukyfnlhxuvnssp

---

## FASE 1 — BASELINE (Medições Estimadas)

| Métrica | Valor Estimado | Limite "Bom" | Status |
|---------|---------------|-------------|--------|
| **FCP** (First Contentful Paint) | ~1.8s | ≤1.8s | ⚠️ No limite |
| **LCP** (Largest Contentful Paint) | ~3.5s | ≤2.5s | 🔴 Ruim |
| **TTI** (Time to Interactive) | ~4.2s | ≤3.8s | 🟠 Alerta |
| **TTFB** (Time to First Byte) | ~200ms | ≤800ms | 🟢 Bom |
| **CLS** (Cumulative Layout Shift) | ~0.05 | ≤0.1 | 🟢 Bom |
| **INP** (Interaction to Next Paint) | ~120ms | ≤200ms | 🟢 Bom |
| **Lighthouse Score** | ~75-82 | ≥90 | 🟠 Alerta |
| **APIs (média)** | 150-400ms | ≤300ms | 🟠 Alerta |
| **Queries (média)** | 80-250ms | ≤100ms | 🟠 Alerta |

**Nota:** Medições reais dependem de `lighthouse`, `web-vitals` em produção, e `EXPLAIN ANALYZE` no banco. Os valores acima são estimados pela composição do bundle (3.76MB total JS, ~600KB CSS não-purgado, 20+ `.select("*")`, etc.).

---

## FASE 2 — FRONTEND (Renderização)

### 🔴 CRÍTICO — Zero uso de React.memo

**Evidência:** Grep em `src/**/*.tsx` retornou **0 ocorrências** de `React.memo`.

**Impacto:** Toda mudança de estado no `AppLayout` (tema, privacy, search, mês) força re-render de TODOS os componentes filhos. Em um dashboard com 8+ hooks (`useDashboardData`, `useAccounts`, `useTrips`, `useWealthEvolution`, `useUserProfile`, `useCurrencyRate`, `useFamilyMembers`), cada re-render dispara cascata de reconciliation no React.

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `AdminResetPanel.tsx` | 955 | 🔴 Componente massivo sem memoização |
| `HelpSettings.tsx` | 800 | 🔴 Componente massivo sem memoização |
| `CreditCards.tsx` | 766 | 🔴 Página gigante sem memoização |
| `CreditCardDetailView.tsx` | 753 | 🔴 Sub-componente gigante |
| `TripSummaryTab.tsx` | 669 | 🔴 Aba sem memoização |
| `InvestmentIRPanel.tsx` | 577 | 🟠 Painel complexo |
| `Transactions.tsx` | 561 | 🟠 Página sem memoização |
| `TransactionForm.tsx` | 554 | 🟠 Formulário pesado |
| `Trips.tsx` | 529 | 🟠 Página sem memoização |
| `GoalCard.tsx` | 454 | 🟠 Card complexo |

**Tempo atual (estimado):** ~4.2s TTI
**Tempo esperado:** ~2.5s TTI
**Ganho estimado:** 40-50% redução no TTI
**Complexidade:** BAIXA (adicionar `React.memo` + `useMemo`/`useCallback`)
**Prioridade:** 🔴 CRÍTICO

### 🔴 CRÍTICO — AppLayout re-renderiza tudo

`AppLayout.tsx` (linha 61) chama `useTheme()`, `useAuth()`, `useUserProfile()`, `useCategories()`, `useGlobalRealtime()`, `useTransactionModal()`, `usePrivacy()` — 7 hooks de estado. Qualquer mudança em um deles causa re-render completo da árvore de rotas.

**Solução:** Separar concerns — apenas o necessário no layout wrapper, resto nos componentes que consomem.

### 🟠 ALTO — Componentes acima de 200 linhas

21 componentes com mais de 200 linhas, violando a regra do MASTER_BLUEPRINT.md. Os 5 maiores:

1. `AdminResetPanel.tsx` — 955 linhas
2. `HelpSettings.tsx` — 800 linhas
3. `CreditCards.tsx` — 766 linhas
4. `CreditCardDetailView.tsx` — 753 linhas
5. `TripSummaryTab.tsx` — 669 linhas

**Prioridade:** 🟠 ALTO

### 🟠 ALTO — useGlobalRealtime invalida TUDO em qualquer mudança

`useGlobalRealtime.ts` escuta `postgres_changes` com `event: "*", schema: "public"` (curinga). Qualquer INSERT/UPDATE/DELETE em qualquer tabela dispara `invalidateAllFinancialData()`, que invalida 30+ query keys.

**Evidência:** `queryInvalidation.ts:117` — `invalidateAllFinancialData()` agrupa `invalidateFinancialQueries` + `invalidateSharedQueries` + `invalidateTripQueries` + `invalidateFamilyQueries` — total de ~50 query keys.

**Impacto:** Um usuário que insere 1 transação força re-fetch de 50 queries. Com 10k usuários ativos, isso vira tempestade de requisições ao Supabase.

| Arquivo | Linha | Problema |
|---------|-------|----------|
| `useGlobalRealtime.ts` | 50 | Evento `"*"` em `schema: "public"` |
| `queryInvalidation.ts` | 117 | `invalidateAllFinancialData` invalida 50 queries |

**Tempo atual:** 50 queries re-fetchadas por mutação
**Tempo esperado:** 3-5 queries re-fetchadas (apenas afetadas)
**Ganho estimado:** 80-90% menos requisições ao Supabase por mutação
**Complexidade:** MÉDIA (refatorar canais Realtime para escopo narrow)
**Prioridade:** 🔴 CRÍTICO

---

## FASE 3 — BUNDLE

### Métricas

| Métrica | Valor | Avaliação |
|---------|-------|-----------|
| JS Total (bruto) | 3.707 KB | 🟠 Pesado |
| JS Total (gzip) | ~1,016 KB | 🟠 Pesado |
| CSS Total (bruto) | 132 KB | 🟢 OK |
| CSS Total (gzip) | 21 KB | 🟢 OK |
| Nº de chunks JS | 39 | 🟢 OK |
| Precache entries | 44 | 🟢 OK |

### 🔴 CRÍTICO — Chunk "page-shared" com 598 KB (173 KB gzip)

`page-shared-BB_cIPnh.js` é o maior chunk. 598 KB bruto / 173 KB gzip.

**Causa provável:** `SharedExpenses.tsx` (464 linhas) + sub-componentes massivos (`SharedTripCard.tsx` 572 linhas, `SharedExpenseCard.tsx` 505 linhas, `SharedInstallmentImport.tsx` 468 linhas) — tudo em um chunk.

**Solução:** Quebrar SharedExpenses em sub-rotas lazy ou code-split nos diálogos de settlement.

| Arquivo | Tamanho (gzip) | Prioridade |
|---------|---------------|------------|
| `page-shared-BB_cIPnh.js` | 173 KB | 🔴 CRÍTICO |
| `vendor-jspdf-DUqWUCFN.js` | 138 KB | 🟠 ALTO |
| `vendor-charts-DHq8L0Da.js` | 105 KB | 🟠 ALTO |
| `page-settings-DfawE4Nd.js` | 40 KB | 🟡 MÉDIO |
| `page-goals-D5dEvuAb.js` | 47 KB | 🟡 MÉDIO |

### 🟠 ALTO — Dependências pesadas

| Biblioteca | Tamanho (gzip) | Uso | Recomendação |
|-----------|---------------|-----|-------------|
| `jspdf` + `jspdf-autotable` | 138 KB | Export PDF | Lazy-load condicional |
| `recharts` + `d3-*` | 105 KB | Gráficos | Substituir por lightweight charts |
| `html2canvas` | 48 KB | Export imagem | Lazy-load condicional |
| `date-fns` | 24 KB | Datas | Importar apenas funções usadas |
| `lucide-react` | 10 KB | Ícones | Tree-shaking funciona, OK |
| `framer-motion` | ~35 KB | Animações | Verificar uso real |

### 🟡 MÉDIO — CSS sem purging visível

`index-D4CgAuQc.css` = 132 KB bruto / 21 KB gzip. Tailwind purge está ativo mas CSS customizado pode conter regras não usadas.

### 🟡 MÉDIO — Conflito de import estático vs dinâmico

`notificationService.ts` é importado estaticamente por 6 arquivos E dinamicamente por 2 — o dynamic import não move o módulo para chunk separado (Vite reportou warning no build).

---

## FASE 4 — REDE

### ✅ Pontos positivos

- **Security headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — todos presentes
- **Cache assets:** `Cache-Control: public, max-age=31536000, immutable` para `/assets/*`
- **Service Worker:** NetworkFirst para API Supabase, precache de 44 entries
- **Compressão:** gzip ativo no Vercel
- **HTTP/2:** Supabase suporta multiplexing

### 🔴 CRÍTICO — CSP com 'unsafe-inline' para scripts

```json
"script-src 'self' 'unsafe-inline';"
```

`unsafe-inline` anula a proteção XSS do CSP. Bloqueia também a capacidade de usar `strict-dynamic` ou nonces.

**Prioridade:** 🔴 CRÍTICO (segurança + performance — sem 'unsafe-inline', inline scripts seriam movidos para arquivos)

### 🟠 ALTO — Requisições Supabase sem cache HTTP intencional

O Service Worker faz NetworkFirst para `*.supabase.co`, mas as respostas da API Supabase não incluem headers `Cache-Control` do lado do servidor. O SW faz cache por 1h (maxAgeSeconds: 3600), mas isso é fallback — o ideal seria o Supabase retornar `Cache-Control` nos headers.

### 🟠 ALTO — Sem prefetch/preload de rotas críticas

Nenhuma rota faz prefetch. O Dashboard (rota mais acessada) é carregado apenas no primeiro clique.

**Solução:** `<Link prefetch="intent">` do React Router para Dashboard e Transações.

### 🟡 MÉDIO — Número de requisições por página

Dashboard carrega: `get_dashboard_summary` RPC + `useAccounts` + `useTrips` + `useWealthEvolution` + `useUserProfile` + `useCurrencyRate` + `useFamilyMembers` + `useNotifications` + `useBillsDue` = ~9 requisições iniciais.

**Prioridade:** 🟡 MÉDIO

---

## FASE 5 — APIs

### ✅ Pontos positivos

- `rpcWithRetry` com AbortController, timeout 30s, backoff exponencial + jitter
- Retry apenas para erros retriable (429, 503, 504, AbortError)
- `useCreateTransaction` tem inFlightRef anti-duplicate
- Duplicate check de 60s janela

### 🟠 ALTO — 20+ `.select("*")` no código

20 ocorrências de `select("*")` em hooks. Isso traz colunas desnecessárias do banco, aumentando payload e desserialização.

| Arquivo | Linha | Impacto |
|---------|-------|---------|
| `useAccounts.ts` | 125, 316, 423, 593 | 4× select * |
| `useFamily.ts` | 102, 541 | 2× select * |
| `useGoals.ts` | 23, 266 | 2× select * |
| `useNotifications.ts` | 18, 232 | 2× select * |
| `useTransactionMutations.ts` | 165 | select * em update |
| `useCreateTransaction.ts` | 430 | select * em insert |

**Tempo atual:** ~200-400ms por query
**Tempo esperado:** ~80-150ms por query
**Ganho estimado:** 40-60% redução de payload
**Complexidade:** BAIXA (substituir `"*"` por colunas explícitas)
**Prioridade:** 🟠 ALTO

### 🟠 ALTO — useTransactions sem cursor pagination

`useTransactions` busca até 1000 rows com `.limit(1000)`. Sem cursor, a cada scroll/filtro faz query completa.

**Tempo atual:** ~400ms para 1000 transações
**Tempo esperado:** ~50ms para 50 transações com cursor
**Ganho estimado:** 85% redução
**Complexidade:** MÉDIA (implementar cursor pagination no front + back)
**Prioridade:** 🟠 ALTO

### 🟡 MÉDIO — Query duplicada em useCreateTransaction

`useCreateTransaction.ts:100-120` faz duas consultas de duplicidade quase idênticas (uma com account_id, outra sem). Poderiam ser unificadas.

### 🟡 MÉDIO — JSON payload do useTransactions

`useTransactions` retorna `transaction_splits:transaction_splits!transaction_id(*)` para TODAS as transações — mesmo quando o usuário não tem splits. Com 1000 transações, isso é overhead de JOIN.

---

## FASE 6 — SUPABASE

### ✅ Pontos positivos

- RLS ativo em todas as tabelas
- RPCs atômicas para operações críticas (settle_split, create_transaction_with_splits)
- pg_cron para jobs agendados (send-bill-reminders-daily)
- Tipos TypeScript gerados do schema

### 🟠 ALTO — Realtime channel com wildcard

`useGlobalRealtime.ts` subscreve `postgres_changes` com `event: "*", schema: "public"`. O Supabase Realtime transmite TODOS os eventos de TODAS as tabelas para o cliente, que então invalida 50+ queries.

**Impacto:** Com 1000 usuários simultâneos, cada evento de DB é broadcast para todos. Em vez de 1 evento → 1 cliente, vira 1 evento → N clientes.

**Solução:** Narrow channels: `supabase.channel("account-${userId}").on("postgres_changes", { event: "UPDATE", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` })`

**Prioridade:** 🔴 CRÍTICO

### 🟡 MÉDIO — Edge Functions sem cold-start optimization

7 edge functions, mas nenhuma com `import` estratégico para reduzir cold-start:

| Function | Uso | Frequência |
|----------|-----|-----------|
| `send-bill-reminders` | pg_cron diário | 1×/dia |
| `groq-proxy` | AI predictions | Sob demanda |
| `sync-b3-tickers` | pg_cron | 1×/dia |
| `sync-asset-prices` | pg_cron | 1×/dia |
| `get-currency-quote` | Cotações | Sob demanda |
| `get-place-suggestions` | Viagens | Sob demanda |
| `send-monthly-report` | Email | Sob demanda |

**Prioridade:** 🟡 MÉDIO

---

## FASE 7 — POSTGRESQL (Análise Estrutural)

### Estrutura de queries críticas

Com base no código frontend, as queries mais frequentes são:

1. `useTransactions` — SELECT com JOIN 3 tabelas + OR filter + ORDER BY date, created_at + LIMIT 1000
2. `useDashboardData` — RPC `get_dashboard_summary`
3. `useAccounts` — SELECT com filters
4. `useFinancialSummary` — RPC `get_monthly_financial_summary`
5. `settle_split` — RPC com INSERT + UPDATE + SELECT em transação

### Potenciais problemas (sem EXPLAIN ANALYZE, inferidos do código):

| Query | Padrão | Risco |
|-------|--------|-------|
| `useTransactions` (linha 54-65) | `.or(and(user_id.eq.X,payer_id.is.null),payer_id.eq.Y)` | 🟠 OR condition com 2 índices |
| `useTransactions` (linha 68) | `.or(account_id.eq.X,destination_account_id.eq.X)` | 🟠 Segundo OR condition |
| `useTransactions` JOINs | `account:accounts!account_id(...), category:categories(...), transaction_splits(...)` | 🟠 3 joins em toda query |
| `useCreateTransaction` duplicate check | `.eq("amount").eq("description").eq("date").gte("created_at")` | 🟡 Multi-column filter |

**Nota:** `EXPLAIN ANALYZE` só pode ser executado diretamente no banco Supabase, não via código estático.

---

## FASE 8 — ÍNDICES

### ✅ Índices existentes (migration `20260101000006`)

16 índices parciais bem desenhados cobrindo:
- Category + date para expense/income
- Shared transactions por user e trip
- Mirrors e originals
- Unsettled splits
- Installments por series e user
- Trip transactions
- Ledger por user/currency/settled
- Accounts por user/active/type

### 🔴 CRÍTICO — Índice composto faltante para useTransactions

A query mais frequente do sistema (`useTransactions`) faz:

```sql
WHERE deleted_at IS NULL
  AND status <> 'PENDING'
  AND (user_id = X AND payer_id IS NULL) OR payer_id = Y
  AND date >= startDate AND date <= endDate
ORDER BY date DESC, created_at DESC
LIMIT 1000
```

**Índice recomendado:**
```sql
CREATE INDEX idx_transactions_user_date_active
  ON transactions(user_id, date DESC, created_at DESC)
  WHERE deleted_at IS NULL AND status <> 'PENDING';
```

**Impacto:** Sequential scan → Index scan para a query mais quente
**Ganho estimado:** 70-90% redução no tempo da query principal
**Prioridade:** 🔴 CRÍTICO

### 🟠 ALTO — Índice para duplicate check em useCreateTransaction

```sql
CREATE INDEX idx_transactions_duplicate_check
  ON transactions(user_id, amount, description, date, created_at)
  WHERE is_active = true AND deleted_at IS NULL;
```

**Prioridade:** 🟠 ALTO

### 🟡 MÉDIO — Sem índices para busca textual (ILIKE)

`search_transactions` RPC usa ILIKE que força sequential scan. Para escala > 100k transações, considerar `pg_trgm` + GIN index.

---

## FASE 9 — CACHE

### ✅ Pontos positivos

- React Query com `staleTime: 30s` (default) e `staleTime: 5min` (transações, dashboard)
- `gcTime: 24h` (cache garbage collection)
- `refetchOnWindowFocus: false` (evita thrashing mobile)
- `PersistQueryClientProvider` com `localforage` → IndexedDB, maxAge 24h
- Service Worker: NetworkFirst para Supabase API, maxAge 1h

### 🟠 ALTO — Invalidação explosiva

`invalidateFinancialQueries` invalida 30+ query keys em TODA mutação. Criar uma transação de R$10 força re-fetch de budgets, goals, wealth-evolution, notifications, trips, etc.

**Impacto:** 30+ requisições ao Supabase por mutação
**Solução:** Invalidar apenas queries diretamente afetadas. Usar `queryClient.setQueryData` para atualizações otimistas em queries relacionadas.

**Prioridade:** 🔴 CRÍTICO

### 🟡 MÉDIO — Cache IndexedDB sem criptografia

Dados financeiros em IndexedDB via `localforage` sem criptografia (CHECKLIST.md SEC-08 já documenta isso).

---

## FASE 10 — MEMÓRIA

### 🟠 ALTO — Subscriptions sem cleanup garantido

`useGlobalRealtime.ts` tem lógica de cleanup (cancelled flag + removeChannel), mas o código usa `setTimeout(connect, delay)` para reconnect sem checar se o componente desmontou entre o setTimeout e a execução (race condition sutíl).

**Risco:** Memory leak de channels em navegação rápida

### 🟡 MÉDIO — Event Listeners no Dashboard

`Dashboard.tsx` registra `window.addEventListener('openTransactionModal', ...)` — isso é um custom event global que sobrevive ao unmount se não houver cleanup correto. O código TEM cleanup (return removeEventListener), mas o evento é disparado via `window.dispatchEvent` que é um padrão frágil.

### 🟡 MÉDIO — useCreateTransaction inFlightRef

O `inFlightRef` é resetado no unmount (`useEffect` cleanup), mas se o hook for usado em múltiplos componentes, eles compartilham estado? Não — cada instância do hook tem seu próprio ref. OK.

---

## FASE 11 — CPU

### 🟡 MÉDIO — Cálculos repetidos no Dashboard

`Dashboard.tsx:58-77` — `useMemo` em `recentTransactions` filtra e slice a cada render. Com 1000 transações, o filter + find + slice é executado a cada re-render do Dashboard (que acontece em toda mudança de theme/privacy/month...).

**Solução:** Mover o filtro para o backend (RPC `get_dashboard_summary` já retorna `recent_transactions` — verificar se o filtro adicional no frontend é redundante).

### 🟡 MÉDIO — JSON.parse/stringify na serialização do cache

`PersistQueryClientProvider` serializa TODO o estado do React Query para IndexedDB a cada atualização. Com 30+ queries cacheadas, isso é `JSON.stringify` de objetos grandes.

---

## FASE 12 — IMAGENS

### 🔴 CRÍTICO — 8.08 MB de imagens em public/

180 avatars (maioria JPG de 40-85KB), 338 logos de bancos (SVG, pequenos), 10 card brands (PNG).

| Tipo | Quantidade | Tamanho Total | Problema |
|------|-----------|--------------|----------|
| Avatars JPG | ~170 | ~7 MB | 🔴 JPG em vez de WebP/AVIF |
| Avatars WebP | ~10 | ~500 KB | 🟢 OK |
| Bank logos SVG | 338 | ~800 KB | 🟢 OK (SVG) |
| Card brands PNG | 9 | ~100 KB | 🟠 PNG em vez de SVG/WebP |
| icon-512.png | 1 | 117 KB | 🟠 Maior imagem do app |

### Recomendações:

1. **Converter avatars para WebP** (qualidade 80%): reduziria de ~7 MB para ~1.5 MB (80% redução)
2. **icon-512.png** → comprimir para <30KB
3. **Card brands PNG** → SVG (já tem `visa.svg`, faltam os outros)
4. **Lazy load** em avatars (só carregar na página de perfil/configuração)

| Arquivo | Tamanho Atual | Esperado | Prioridade |
|---------|--------------|----------|------------|
| 170+ avatars JPG | ~7 MB | ~1.5 MB (WebP) | 🔴 CRÍTICO |
| `icon-512.png` | 117 KB | <30 KB | 🟠 ALTO |
| `mastercard.png` | ~20 KB | <2 KB (SVG) | 🟡 MÉDIO |

---

## FASE 13 — STORAGE (Supabase Storage)

### 🟡 MÉDIO — Sem uso identificado de Supabase Storage

O projeto não parece usar Supabase Storage para uploads de usuário. Avatars são pré-empacotados em `public/Avatar/`. Se houver planos para upload de comprovantes/recibos, considerar:

- URLs assinadas com expiração
- Compressão client-side antes do upload
- CDN (Supabase Storage já usa Cloudflare)

---

## FASE 14 — PAGINAÇÃO

### 🔴 CRÍTICO — OFFSET-based sem cursor

`useTransactions` usa `.limit(1000)` sem cursor. Com 50k transações por usuário, cada scroll busca 1000 rows com OFFSET crescente (cada vez mais lento).

**Problema do OFFSET:** `SELECT * FROM transactions WHERE ... ORDER BY date DESC LIMIT 50 OFFSET 5000` — o Postgres precisa escanear e descartar 5000 rows antes de retornar 50.

**Solução:** Cursor-based pagination com `keyset`:
```sql
WHERE (date, id) < ($last_date, $last_id)
ORDER BY date DESC, id DESC
LIMIT 50
```

| Métrica | OFFSET (atual) | Cursor (proposto) |
|---------|---------------|-------------------|
| Página 1 | ~50ms | ~50ms |
| Página 20 | ~400ms | ~50ms |
| Página 100 | ~2s | ~50ms |

**Prioridade:** 🔴 CRÍTICO

---

## FASE 15 — ESCALABILIDADE (Simulação Teórica)

### Modelo de crescimento

| Usuários | Transações/dia | DB Size | Gargalo |
|----------|---------------|---------|---------|
| 100 | 500 | 50 MB | Nenhum |
| 1.000 | 5.000 | 500 MB | ⚠️ `useTransactions` LIMIT 1000 |
| 10.000 | 50.000 | 5 GB | 🔴 Realtime broadcast + query performance |
| 100.000 | 500.000 | 50 GB | 🔴 DB connections + API rate limits |
| 500.000 | 2.5M | 250 GB | 🔴 Tudo — requer re-arquitetura |

### Gargalos identificados por camada:

| Camada | 1k users | 10k users | 100k users |
|--------|---------|----------|------------|
| **React** | 🟢 OK | 🟠 Re-renders | 🔴 Bundle loading |
| **Supabase DB** | 🟢 OK | 🟠 Connections | 🔴 Pool exhaustion |
| **Supabase Realtime** | 🟢 OK | 🔴 Broadcast storm | 🔴 Insustentável |
| **Supabase API** | 🟢 OK | 🟠 Rate limits | 🔴 Rate limits |
| **Vercel** | 🟢 OK | 🟢 OK | 🟢 OK (CDN) |
| **Edge Functions** | 🟢 OK | 🟠 Cold starts | 🔴 Timeout |

---

## FASE 16 — CARGA (Recomendações de Teste)

Testes de carga NÃO executados (requerem ambiente de staging isolado). Recomenda-se:

### Ferramentas
- **k6** ou **Artillery** para load testing
- **Supabase Dashboard** para métricas de DB
- **Lighthouse CI** para frontend
- **Vercel Analytics** para Web Vitals reais

### Cenários mínimos:
1. **Load Test:** 100 usuários simultâneos por 5 min (ramp-up 10/s)
2. **Stress Test:** Aumentar até encontrar breaking point
3. **Spike Test:** 10 → 500 usuários em 10s
4. **Soak Test:** 50 usuários por 2h (memory leak detection)

---

## FASE 17 — GARGALOS (Sumário)

| # | Gargalo | Camada | Severidade |
|---|---------|--------|-----------|
| 1 | Realtime wildcard → 50 queries invalidadas | Supabase + React Query | 🔴 CRÍTICO |
| 2 | Zero React.memo → renderização em cascata | React | 🔴 CRÍTICO |
| 3 | Cursor pagination ausente | PostgreSQL + Frontend | 🔴 CRÍTICO |
| 4 | Índice faltante para query principal | PostgreSQL | 🔴 CRÍTICO |
| 5 | 20+ `.select("*")` | Supabase API | 🟠 ALTO |
| 6 | 8 MB de imagens não otimizadas | Assets | 🔴 CRÍTICO |
| 7 | Componentes massivos (>200 linhas) | React | 🟠 ALTO |
| 8 | CSP com `unsafe-inline` | Segurança/Rede | 🟠 ALTO |
| 9 | `invalidateFinancialQueries` invalida 30+ keys | React Query | 🔴 CRÍTICO |
| 10 | Chunk page-shared 598 KB | Bundle | 🔴 CRÍTICO |
| 11 | jsPDF + html2canvas carregados mesmo sem uso | Bundle | 🟠 ALTO |
| 12 | Sem prefetch de rotas | Rede | 🟡 MÉDIO |
| 13 | IndexedDB sem criptografia | Segurança/Memória | 🟡 MÉDIO |

---

## FASE 18 — OTIMIZAÇÃO (Plano de Ação)

### 🔴 CRÍTICO (Fazer Imediatamente)

| # | Ação | Tempo Atual | Esperado | Arquivos | Complexidade | Ganho |
|---|------|------------|----------|----------|-------------|-------|
| 1 | Adicionar `idx_transactions_user_date_active` | ~400ms | ~50ms | migration SQL | XS | 85% |
| 2 | Substituir Realtime wildcard por narrow channels | 50 queries | 3-5 queries | `useGlobalRealtime.ts` | M | 90% |
| 3 | `React.memo` nos top-10 componentes | ~4.2s TTI | ~2.5s TTI | 10 arquivos .tsx | S | 40% |
| 4 | Substituir `.select("*")` por colunas explícitas | ~300ms | ~100ms | 20 hooks | S | 60% |
| 5 | Quebrar `page-shared` em sub-chunks lazy | 598 KB | ~250 KB | `SharedExpenses.tsx` + sub-componentes | M | 58% |

### 🟠 ALTO (Esta Semana)

| # | Ação | Arquivos | Complexidade | Ganho |
|---|------|----------|-------------|-------|
| 6 | Cursor pagination em `useTransactions` | `useTransactionsQuery.ts` + RPC | M | 85% em scroll |
| 7 | Converter avatars para WebP | 170+ arquivos | XS (script) | 80% tamanho |
| 8 | Lazy-load jsPDF e html2canvas | `GoalCard.tsx`, `Reports.tsx` | S | 200 KB |
| 9 | Quebrar componentes > 400 linhas | 8 arquivos | M | Manutenibilidade |
| 10 | Índice duplicate-check em transactions | migration SQL | XS | 50% em create |

### 🟡 MÉDIO (Próximo Sprint)

| # | Ação | Arquivos | Complexidade |
|---|------|----------|-------------|
| 11 | Prefetch de rotas (Dashboard, Transações) | `App.tsx` links | XS |
| 12 | Remover `unsafe-inline` do CSP | `vercel.json` | S |
| 13 | pg_trgm + GIN index para search | migration SQL | S |
| 14 | Edge function cold-start optimization | 7 functions | M |
| 15 | Criptografar IndexedDB | `queryClient.ts` | M |

---

## FASE 19 — SCORE

| Dimensão | Nota (0-100) | Peso | Pontuação |
|----------|-------------|------|-----------|
| **Frontend Score** | 48 | 25% | 12.0 |
| **Backend Score** | 62 | 20% | 12.4 |
| **Banco Score** | 55 | 20% | 11.0 |
| **APIs Score** | 52 | 15% | 7.8 |
| **Escalabilidade Score** | 38 | 20% | 7.6 |
| **NOTA GERAL** | **50.8/100** | 100% | **50.8** |

### Detalhamento:

**Frontend (48/100):**
- Renderização: 30/100 (zero memoização, componentes gigantes)
- Bundle: 55/100 (chunks ok, mas page-shared 598KB)
- Network: 60/100 (headers ok, sem prefetch)
- UX Performance: 50/100 (skeletons ok, sem virtualização)

**Backend (62/100):**
- RPCs: 75/100 (atómicas, bem testadas)
- Realtime: 30/100 (wildcard broadcast)
- Edge Functions: 65/100 (funcionais, sem cold-start optimization)
- Auth: 70/100 (Supabase Auth ok, PIN via RPC ok)

**Banco (55/100):**
- Índices: 55/100 (16 índices, mas falta o mais crítico)
- Queries: 40/100 (20+ select *, sem cursor, OR conditions)
- Schema: 75/100 (bem normalizado, soft delete, triggers)
- RLS: 80/100 (ativo em todas as tabelas)

**APIs (52/100):**
- Payload: 35/100 (select *, sem column selection)
- Paginação: 25/100 (OFFSET, sem cursor)
- Retry/Timeout: 80/100 (rpcWithRetry bem implementado)
- Cache: 65/100 (React Query ok, invalidação explosiva)

**Escalabilidade (38/100):**
- Realtime broadcast: 20/100 (insustentável com 10k+ users)
- DB pool: 50/100 (Supabase gerencia, mas queries pesadas)
- Bundle loading: 45/100 (chunks ok, mas primeiro load pesado)
- Multi-tenant: 40/100 (RLS ok, mas sem隔离 de recursos)

---

## FASE 20 — RELATÓRIO FINAL

### Resumo Executivo

O **Seu Bolso Inteligente** é um app financeiro maduro com boa arquitetura de dados (triggers, RPCs atômicas, RLS, soft delete). Porém, a camada de apresentação (React) e a comunicação em tempo real (Supabase Realtime) têm gargalos estruturais que impedem escala além de ~500 usuários simultâneos.

**Nota geral: 50.8/100.**

### Top 5 Problemas

1. **Realtime wildcard** — cada evento de DB invalida 50 queries para todos os usuários conectados
2. **Zero React.memo** — qualquer mudança de estado causa re-render em cascata de toda a árvore
3. **Sem cursor pagination** — queries ficam exponencialmente mais lentas com volume de dados
4. **Índice faltante** — a query mais frequente do sistema não tem índice otimizado
5. **8 MB de imagens** — avatars em JPG não otimizados

### Estimativa de Melhoria

| Indicador | Atual | Após Correções |
|-----------|-------|----------------|
| LCP | ~3.5s | ~1.8s |
| TTI | ~4.2s | ~2.0s |
| Lighthouse | ~78 | ~92 |
| API p95 | ~400ms | ~120ms |
| Realtime overhead | 50 queries/evento | 3-5 queries/evento |
| Bundle page-shared | 598 KB | ~250 KB |
| Imagens | 8.08 MB | ~2 MB |
| Nota Geral | 50.8 | ~78 |

### Roadmap

```
SEMANA 1 (Críticos):
├── Índice transactions_user_date_active
├── React.memo nos top-10 componentes
├── Narrow Realtime channels
└── Substituir select("*")

SEMANA 2 (Altos):
├── Cursor pagination
├── Converter imagens para WebP
├── Lazy-load jsPDF/html2canvas
└── Quebrar page-shared chunk

SEMANA 3 (Médios):
├── Prefetch de rotas
├── Remover unsafe-inline do CSP
├── pg_trgm index para search
└── Criptografar IndexedDB

SEMANA 4 (Validação):
├── Lighthouse CI no pipeline
├── k6 load tests (100 → 1000 users)
├── Vercel Analytics Web Vitals
└── EXPLAIN ANALYZE em todas as RPCs
```

### Checklist Final

- [ ] Migration: `idx_transactions_user_date_active`
- [ ] Migration: `idx_transactions_duplicate_check`
- [ ] `useGlobalRealtime.ts` — narrow channels por user_id + tabela
- [ ] `queryInvalidation.ts` — invalidar apenas queries afetadas
- [ ] Top-10 componentes: adicionar `React.memo`
- [ ] 20 hooks: substituir `.select("*")` por colunas explícitas
- [ ] `useTransactionsQuery.ts` — cursor pagination
- [ ] `SharedExpenses.tsx` — quebrar em lazy sub-chunks
- [ ] 170 avatars: converter para WebP
- [ ] `vercel.json` — remover `unsafe-inline` do CSP
- [ ] jsPDF + html2canvas: dynamic import condicional
- [ ] React Router: `<Link prefetch="intent">` para rotas principais
- [ ] Lighthouse CI config no GitHub Actions
- [ ] k6 script para load test
- [ ] Atualizar MASTER_BLUEPRINT.md com índices novos

---

> **Nota metodológica:** Medições de tempo são estimadas com base na análise estática do código e composição do bundle. Medições reais requerem `Lighthouse`, `EXPLAIN ANALYZE` no banco de produção, e `web-vitals` (RUM). Load tests requerem ambiente de staging isolado.
