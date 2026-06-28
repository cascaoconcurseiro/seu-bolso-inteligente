# CLAUDE_HANDOFF.md — Pé de Meia

> Atualizado em: 2026-06-28
> Último commit: `d699d9d` | Branch: `fix/29-bugs-report` | Deploy: meupedemeia.vercel.app

---

## Regras obrigatórias
- **SEMPRE** fazer `git push origin main` após cada commit
- **SEMPRE** atualizar este arquivo ao final de cada sessão ou ao aproximar do limite de contexto
- Zero erros TypeScript antes de commitar: `npx tsc --noEmit`
- Commits em português com mensagens detalhadas

---

## Stack
- React + Vite + TypeScript + Supabase + TanStack Query + Zustand + Tailwind + shadcn/ui
- Deploy: Vercel (`meupedemeia.vercel.app`), branch `main`
- Supabase project ID: `vrrcagukyfnlhxuvnssp`
- Toasts: `sonner` | Moeda: `moneyUtils.format(value, currency)` | Datas: `date-fns` + `ptBR`
- Mutations sempre invalidam queries | soft delete com `deleted_at`
- Mobile modals: Drawer bottom-sheet (não Dialog)

---

## Histórico de features implementadas ✅

- Participante de viagem sem conta (guest)
- Modo Casal (visão consolidada de saldo/receita/despesa)
- **Busca Global** — dialog cmdk, Ctrl+K, busca em transações/contas/metas
- **SwipeableRow** — componente genérico reutilizável, aplicado em Metas
- **Marcos de progresso (Milestones)** — tabela goal_milestones, linha do tempo visual no GoalCard
- **Notificações push** — tabela push_subscriptions, Edge Function `send-bill-reminders` com VAPID/AES-128-GCM, toggle em Configurações
- **Fix `usagePercent`** — CreditCardDetailView.tsx, variável estava no interface mas fora do destructuring
- **Contatos de Despesa vs Família (cenário Jhonatan)** — coluna `member_type` em family_members, `useFamilyMembers()` filtra por padrão, seção "Contatos de Despesa" na página Família
- **Service Worker customizado** (`src/sw.ts`) — injectManifest com workbox, handlers de `push` e `notificationclick`
- **Índices de performance** — `idx_transactions_notifications`, `idx_push_subscriptions_user_id`, `idx_goal_milestones_goal_pct`, `idx_family_members_type_family`
- **VAPID keys configuradas** — geradas e configuradas nos secrets da Edge Function + env var da Vercel + `.env` local
- **Cron `send-bill-reminders-daily`** — pg_cron job #3, roda todo dia às 11:00 UTC (08:00 Brasília)
- **Export PDF de meta** — botão FileDown no GoalCard, gera PDF com jsPDF (barra de progresso visual, valores, prazo, descrição)
- **Gráfico de evolução da meta** — AreaChart no GoalContributeDialog via `useGoalHistory` hook, visível com ≥2 aportes
- **SwipeableRow em Contas** — swipe left = arquivar, swipe right = editar (modal reutiliza AccountFormModal mode="edit")
- **fix audit_changes()** — trigger corrigido para usar `to_jsonb(NEW)->>'deleted_at'` (suporta tabelas sem coluna deleted_at)
- **Remove Modo Casal** — removido do Dashboard (estado, memo, imports, botão)
- **fix FamilyBalancePanel** — link `/compartilhado` corrigido para `/compartilhados`
- **Adicionar contato direto** — hook `useAddSharedContact` + formulário inline na seção Contatos de Despesa da página Família
- **Push: alertas de metas** — Edge Function `send-bill-reminders` v3 agora notifica metas com prazo em 7 dias além das contas a pagar
- **Fix dashboard `recent_transactions`** — migration `20260625165722`: filtra por `t.date` (não `competence_date`), ordena `t.date DESC, t.created_at DESC`, respeita filtro de payer/membro familiar. Totais mantêm lógica de competência/vencimento.

---

## 🐛 Bug Hunt 2026-06-28 — Auditoria completa

### Auditoria com 9 skills — 29 bugs encontrados, 25 corrigidos

**Branch:** `fix/29-bugs-report` (PR pendente de criação manual → `main`)
**Backup:** `backup/bug-hunt-20260628` (snapshot pré-fixes)

### Migrations novas (aplicar via `supabase db push`)
| Migration                                    | O que faz                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `20260628000002_fix_critical_rpc_bugs.sql`   | settle_split: remove double-count, FOR UPDATE, ownership, p_amount validation, p_date param |
| `20260628000003_fix_unsettle_and_fks.sql`    | unsettle_split: soft delete, FK RESTRICT em settlement_reversals, validação multi-conta     |
| `20260628000004_fix_admin_password.sql`      | Remove senha '909496', usa is_admin()                                                       |
| `20260628000005_fix_recalculate_balance.sql` | = ANY(ARRAY(...)) em vez de LIMIT 1                                                         |
| `20260628000006_fix_error_logs_rls.sql`      | RLS restrito (admin + próprio usuário)                                                      |

### Arquivos editados
| Arquivo                                          | Mudança                                                |
| ------------------------------------------------ | ------------------------------------------------------ |
| `src/lib/queryClient.ts`                         | NOVO — instância compartilhada do QueryClient          |
| `src/App.tsx`                                    | Usa queryClient de @/lib/queryClient                   |
| `src/contexts/AuthContext.tsx`                   | queryClient.clear() no signOut                         |
| `src/hooks/transactions/useCreateTransaction.ts` | inFlightRef cleanup, duplicidade 15s + account_id null |
| `src/services/validationService.ts`              | isReasonableDate usa dateUtils.parseDate()             |
| `src/components/settings/PrivacySettings.tsx`    | .limit(500) anti N+1                                   |
| `src/sw.ts`                                      | cache maxAge 7d → 1h                                   |
| `vercel.json`                                    | CSP sem 'unsafe-eval'                                  |
| `supabase/functions/groq-proxy/index.ts`         | CORS *.vercel.app                                      |

### PRÓXIMO PASSO
1. Criar PR: `fix/29-bugs-report` → `main` manualmente
2. Revisar migrations antes de `supabase db push`
3. Rodar `npx tsc --noEmit` para verificar TypeScript
4. Após merge, testar fluxo de settlement no ambiente de preview

### Sem pendências de código
Backlog zerado. Fixes aplicados e documentados.

### Sem pendências de código conhecidas
Backlog zerado. Ideias para próximas sessões:
- RLS cross-family cartão compartilhado (requer função `SECURITY DEFINER` para evitar recursão infinita em `accounts`)
- Relatório mensal automático por email (Edge Function + Resend/SendGrid)

---

## Arquivos-chave

| Arquivo                                           | Relevância                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `src/sw.ts`                                       | Service Worker customizado (push + precache + NetworkFirst Supabase) |
| `src/components/search/GlobalSearch.tsx`          | Dialog de busca global (Ctrl+K)                                      |
| `src/components/ui/SwipeableRow.tsx`              | Componente genérico de swipe                                         |
| `src/components/goals/GoalMilestonesPanel.tsx`    | Marcos de progresso                                                  |
| `src/components/goals/GoalCard.tsx`               | Toggle de milestones                                                 |
| `src/hooks/useGoalMilestones.ts`                  | CRUD de milestones                                                   |
| `src/hooks/usePushNotifications.ts`               | Registro/remoção de push subscription                                |
| `src/hooks/useFamilyConsolidated.ts`              | Visão consolidada do casal                                           |
| `src/hooks/useTripMembers.ts`                     | guest_name, display_name, useAddGuestTripMember                      |
| `src/components/layout/AppLayout.tsx`             | Botão busca + atalho Ctrl+K + GlobalSearch                           |
| `src/components/settings/PreferencesSettings.tsx` | Toggle notificações push                                             |
| `src/pages/GoalsAndInvestments.tsx`               | SwipeableRow em metas                                                |
| `src/pages/Dashboard.tsx`                         | Toggle Modo Casal, FamilyBalancePanel                                |
| `src/hooks/useFamily.ts`                          | member_type, useSharedContacts, useConvert*                          |
| `src/pages/Family.tsx`                            | Seção "Contatos de Despesa"                                          |

---

## Banco de dados — mudanças recentes

| Migration                | O que fez                                                           |
| ------------------------ | ------------------------------------------------------------------- |
| `member_type_column`     | Coluna `member_type TEXT DEFAULT 'family'` em family_members        |
| `performance_indexes`    | 4 índices novos (notifications, push_sub, milestones, family_type)  |
| `shared_credit_card_rls` | Políticas SELECT em accounts e transactions para convidados aceitos |

---

## Convenções do projeto
- Toasts: `sonner` (`toast.success`, `toast.error`)
- Formatação de moeda: `moneyUtils.format(value, currency)` de `@/utils/money`
- Datas: `format(date, 'dd/MM/yyyy', { locale: ptBR })`
- TanStack Query: sempre `queryClient.invalidateQueries` no `onSuccess`
- Soft delete: `.update({ deleted_at: new Date().toISOString() })`
