# MASTER_BLUEPRINT.md — Mapa do Projeto: Seu Bolso Inteligente

> Este documento é a fonte única de verdade arquitetural do projeto. Leia antes de qualquer implementação.
> Última atualização: 2026-07-15 (auditoria ao vivo — banco de produção via Supabase MCP + código + CI)

---

## 1. IDENTIDADE DO PROJETO

- **Nome:** Seu Bolso Inteligente (alias: meupedemeia)
- **URL Produção:** https://meupedemeia.vercel.app
- **Repositório:** cascaoconcurseiro/seu-bolso-inteligente
- **Branch de desenvolvimento:** `claude/compassionate-mendel-6zyijq`
- **Supabase Project ID:** `vrrcagukyfnlhxuvnssp`

---

## 2. STACK TECNOLÓGICA

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript (Strict) + Vite |
| Estilização | Tailwind CSS + Glassmorphism Dark Mode |
| Componentes | Radix UI primitives + shadcn/ui |
| Estado servidor | TanStack React Query v5 (staleTime: 2min, gcTime: 24h) |
| Estado cliente | Zustand |
| Cache persistido | LocalForage → IndexedDB |
| Formulários | Zod schemas (12-layer validation) |
| Datas | date-fns (nunca `new Date()` para aritmética) |
| Financeiro | Decimal.js (nunca float para cálculos) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + RLS) |
| Deploy | Vercel (SPA, rewrites para index.html) |

---

## 3. INVARIÁVEIS ABSOLUTAS (nunca violar)

### 3.1 Financeiro
- **SSOT de Saldo:** o saldo de conta é SEMPRE calculado via trigger PostgreSQL (soma de transações), com cobertura em INSERT, UPDATE e DELETE de `transactions` (o gap de UPDATE foi fechado em 2026-07-01, migration `20260702084014` — antes disso, editar uma transação não recalculava o saldo). Nunca atualize `accounts.balance` diretamente. Função oficial única: `recalculate_account_balance(p_account_id)` — qualquer outra função de "saldo de conta" é órfã/depreciada.
- **Decimal.js:** toda operação matemática financeira usa `Decimal.js` ou inteiros em centavos. Nunca `0.1 + 0.2`.
- **competence_date:** sempre `YYYY-MM-01` (primeiro do mês). Nunca a data real da transação para agrupamento contábil.
- **Soft Delete:** nunca delete dados financeiros. Use `deleted_at = NOW()` + `is_active = false`.

### 3.2 Atomicidade
- Operações que tocam múltiplas tabelas DEVEM usar RPCs com `BEGIN/COMMIT/ROLLBACK`.
- Nunca faça N inserts sequenciais no frontend para operações que precisam ser atômicas.

### 3.3 Datas
- Use sempre `date-fns`: `parseISO()`, `format()`, `startOfMonth()`.
- Nunca `new Date(dateString)` para aritmética de datas (resulta em bugs de timezone).
- `closing_day` e `due_day` são inteiros (dia do mês), não timestamps.

### 3.4 Segurança
- RLS ativo em TODAS as tabelas. Nunca acesse dados sem `auth.uid()` no contexto.
- RPCs críticas usam `SECURITY DEFINER` + verificação interna de `auth.uid()`, identidade derivada exclusivamente de `auth.uid()` (nunca `p_user_id` do cliente) — API v2 completa desde 13/07.
- PIN nunca armazenado em plaintext — **confirmado resolvido**: `profiles.app_pin` foi dropada (`drop_plaintext_app_pin_column`), só existe `app_pin_hash` (bcrypt via `set_pin`/`verify_pin`/`clear_pin`).

---

## 4. TABELAS PRINCIPAIS

| Tabela | Descrição | Soft Delete |
|---|---|---|
| `profiles` | Dados do usuário, `app_pin_hash` (bcrypt) | ❌ |
| `accounts` | Contas bancárias, saldo calculado via trigger | `deleted_at` |
| `transactions` | Transações financeiras, coração do sistema | `deleted_at` |
| `categories` | Categorias hierárquicas (pai/filho) | `deleted_at` |
| `credit_cards` | Cartões, `closing_day`, `due_day` | `deleted_at` |
| `credit_card_invoices` | Faturas por `competence_date` | - |
| `family_members` | Família + contatos de gasto compartilhado (`member_type`) | `deleted_at` |
| `expense_splits` | Splits de despesa compartilhada | - |
| `settlement_reversals` | Audit trail imutável de reversões | IMUTÁVEL |
| `goals` | Metas financeiras | `deleted_at` |
| `goal_milestones` | Marcos de metas (alerta 7 dias antes) | - |
| `trips` | Viagens com suporte multi-moeda | `deleted_at` |
| `budgets` | Orçamentos mensais por categoria | - |
| `assets` | Investimentos (B3, etc.) | `deleted_at` |
| `push_subscriptions` | Subscrições VAPID para push notifications | - |
| `error_logs` | Erros capturados pelo ErrorBoundary | IMUTÁVEL |

---

## 5. RPCs CRÍTICAS (Stored Procedures)

### `settle_split(p_split_id, p_account_id, p_amount)`
- Atomic: marca split como `settled`, cria transação INCOME, atualiza saldo via trigger
- Idempotente: segunda chamada retorna erro
- SECURITY DEFINER + verifica `auth.uid()`

### `unsettle_with_reversal(p_split_id, p_reversal_reason)`
- Atomic: cria registro imutável em `settlement_reversals`, desmarca split, deleta INCOME tx, reverte saldo
- Idempotente: segunda chamada retorna erro
- Audit trail nunca deletável

### `get_shared_invoice_data(p_family_member_id, p_month)`
- Agrega splits e transações compartilhadas para o mês
- Não é idempotente (leitura apenas)

### `rpcWithRetry(fn, params, options?)`
- Wrapper frontend: 3 tentativas, backoff exponencial + 10% jitter, timeout 30s
- Não retenta: 401, 403, 400
- **Confirmado resolvido**: usa `AbortController` real, wired via `.abortSignal()` no builder do Supabase, com `clearTimeout` em `finally` — sem leak de conexão zumbi (verificado em `src/utils/rpcWithRetry.ts`).

### `delete_user_account()` — LGPD
- Expurgo físico do usuário (`DELETE FROM auth.users`) + `SET NULL` em colunas onde o usuário é só ator/criador de registro alheio (família/viagem compartilhada).
- Confirmado ao vivo: presente em produção, `SECURITY DEFINER`, grants `authenticated` + `service_role`, `search_path=''`.

### RPCs `_v2` (API autenticada v2)
- `create_transaction_with_splits_v2`, `create_installment_series_v2`, `get_current_shared_debts_v2`, `get_trip_participant_balances_v2` e mais uma dezena — todas escopadas por `auth.uid()`, sem `p_user_id` do cliente. Assinaturas legadas revogadas de `authenticated`.

---

## 6. FLUXOS E2E CRÍTICOS

1. **Auth:** Supabase OAuth Google + Email/Password + PIN local (PinWrapper)
2. **Dashboard:** React Query cache → Supabase, saldo via SSOT trigger
3. **Transação simples:** Form → 12-layer Zod → insert → trigger atualiza saldo
4. **Transação compartilhada:** Form → `create_transaction_with_splits_v2()` RPC ✅ atômico (confirmado resolvido; correção de tipo `idempotency_key` text aplicada em 13/07)
5. **Parcelamento:** Form → `create_installment_series_v2()` RPC ✅ atômico (mesma correção)
6. **Liquidar split:** Form → `settle_split()` RPC ✅ atômico
7. **Reverter liquidação:** Form → `unsettle_with_reversal()` RPC ✅ atômico + audit
8. **Fatura de cartão:** Agrupamento por `competence_date` YYYY-MM-01
9. **Metas:** Progress tracking + pg_cron para alertas 7 dias antes do prazo
10. **Push Notifications:** VAPID + AES-128-GCM + pg_cron + Edge Functions

---

## 7. VULNERABILIDADES CONHECIDAS (pendentes de fix)

| ID | Vulnerabilidade | Severidade |
|---|---|---|
| SEC-01 | `PLAYWRIGHT_MOCK_AUTH` bypass em produção (AuthContext.tsx:24) | 🔴 CRÍTICA |
| SEC-02 | PIN plaintext em `profiles.app_pin` + bypass client-side | 🔴 CRÍTICA |
| ARC-01 | Transações compartilhadas sem atomicidade (N inserts) | 🔴 CRÍTICA |
| ARC-02 | Parcelamentos sem rollback (N inserts) | 🔴 CRÍTICA |
| SEC-03 | Ausência de Content-Security-Policy em vercel.json | 🟠 ALTA |
| SEC-04 | JWT tokens em localStorage (vulnerável a XSS) | 🟠 ALTA |

---

## 8. ESTRUTURA DE DIRETÓRIOS

```
src/
├── components/     # UI isolada. >200 linhas → quebrar em sub-componentes
│   ├── auth/       # PinWrapper, AppLock
│   ├── modals/     # QuickAddModal, OFXImportModal
│   ├── transactions/
│   ├── shared/     # Settlement dialogs
│   ├── goals/
│   ├── trips/
│   └── ui/         # Radix + shadcn primitives
├── pages/          # Telas orquestradoras
├── contexts/       # AuthContext, MonthContext, etc.
├── hooks/          # Lógica de negócio reutilizável
├── services/       # validationService, settlementValidation
├── utils/          # rpcWithRetry, dateUtils, logger, SafeFinancialCalculator
└── integrations/
    └── supabase/   # client.ts, tipos gerados
supabase/
├── migrations/     # 154 migrations (nunca editar as antigas)
└── functions/      # Edge Functions (sync-b3-tickers, etc.)
```

---

## 9. REGRAS DE DESENVOLVIMENTO

1. DRY absoluto: lógica repetida → extrair para `hooks/` ou `utils/`
2. Sem prop drilling além de 2 níveis → usar Context ou Zustand
3. Componentes > 200 linhas → quebrar
4. Todos os formulários: `disabled={isLoading}` durante chamadas de rede
5. Sem `float` para cálculos financeiros
6. Sem `new Date()` para aritmética de datas
7. Sem deletes físicos em tabelas financeiras
8. Commits em branch de desenvolvimento, nunca direto em `main`
