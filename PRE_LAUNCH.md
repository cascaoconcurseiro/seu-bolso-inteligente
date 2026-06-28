# PRE_LAUNCH.md — Checklist Pré-Lançamento
> 28 Jun 2026 — Branch: fix/29-bugs-report

## 🔴 Bloqueadores (resolver antes do lançamento)

### 1. ✅ RESEND_API_KEY — CONFIGURADO
Key configurada como secret no Supabase. Edge Function `send-monthly-report` funcional.

### 2. 🟡 Verificar domínio no Resend
Acessar https://resend.com/domains e adicionar `meupedemeia.vercel.app`.
Como é subdomínio da Vercel, usar a opção de verificação por email (enviar para o email do proprietário).
Até verificar, os emails NÃO serão entregues (erro 403).

Alternativa: usar um domínio próprio configurado na Vercel.
Alternativa 2: mudar o `from` na Edge Function para `onboarding@resend.dev` (modo teste — só envia para o email da conta Resend).

### 3. 🟡 OAuth Redirect em Vercel Previews
Acessar Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
Adicionar: `https://*.vercel.app/**`
Sem isso, login via Google/OAuth falha em preview deploys.

## 🟠 Recomendações (primeiro sprint pós-lançamento)

### 4. PgBouncer / Supabase Pro
Free Tier: 50 conexões simultâneas. Se espera >50 usuários ativos:
- Upgrade para Pro ($25/mês) — 500 conexões
- Ou configurar PgBouncer no Supabase Dashboard → Database → Connection Pooling

### 5. SafeFinancialCalculator retornar Decimal
Métodos como `add()`, `subtract()` retornam `number`, perdendo precisão do Decimal.
Refatorar para retornar `Decimal` — quebra compatibilidade, requer atualizar todos callers.
Arquivo: `src/services/SafeFinancialCalculator.ts`

### 6. useCreateTransaction — quebrar em hooks menores
Arquivo com 600+ linhas. Extrair:
- `useTransactionValidation` — validação Zod + regras de negócio
- `useTransactionSplits` — auto-complete de splits
- `useAutoShare` — regras de auto-share
Manter `useCreateTransaction` como orquestrador.

### 7. Acessibilidade
- [x] `aria-label` no SwipeableRow (botão "Mais ações")
- [ ] `aria-label` em cards interativos (GoalCard, AccountCard)
- [ ] `focus:ring` visível em elementos navegáveis por teclado
- [ ] Testes com axe-core (ferramenta já instalada em devDependencies)
- [ ] Alternativas textuais para gráficos Recharts

### 8. Testes
- [ ] Testes E2E para fluxo de settlement (liquidar + reverter)
- [ ] Testes de acessibilidade com `@axe-core/playwright`
- [ ] Testes unitários para `SafeFinancialCalculator`

## ✅ Já resolvido nesta sessão
- 29 bugs (auditoria completa com 9 skills)
- 8 migrations aplicadas no Supabase
- RESEND_API_KEY configurada
- pg_cron job `send-monthly-report-job` ativo
- CSP sem `unsafe-eval`
- `settle_split` double-count, race condition, ownership
- `unsettle_split` soft delete
- Senha admin hardcoded removida
- `settlement_reversals` FK RESTRICT
- `error_logs` RLS restrito
- `queryClient.clear()` no logout
- `inFlightRef` cleanup
- Duplicidade check melhorado
- CORS groq-proxy para *.vercel.app
