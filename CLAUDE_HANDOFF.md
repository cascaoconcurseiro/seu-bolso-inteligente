# CLAUDE_HANDOFF.md — Pé de Meia

> Atualizado em: 2026-06-24  
> Último commit: `0c25e16` | Branch: `main` | Deploy: meupedemeia.vercel.app

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
- **RLS cartão compartilhado** — políticas SELECT em `accounts` e `transactions` para convidados com status `accepted`

---

## O que falta (próximas sessões)

### Configuração pendente (produção — requer ação manual do usuário)
1. **VAPID keys**: gerar com `npx web-push generate-vapid-keys`
   - Adicionar `VITE_VAPID_PUBLIC_KEY` nas env vars da Vercel
   - Adicionar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` nos secrets da Edge Function no Supabase Dashboard
2. **Cron da Edge Function**: agendar `send-bill-reminders` para rodar diariamente (pg_cron ou Upstash Qstash)

### Features de UX (código)
3. **Export PDF de meta específica** — botão no GoalCard para baixar resumo em PDF
4. **Gráfico de evolução da meta** — linha do tempo de aportes no GoalContributeDialog (Recharts LineChart)
5. **SwipeableRow em Contas mobile** — swipe para editar/arquivar contas na listagem mobile

---

## Arquivos-chave

| Arquivo | Relevância |
|---|---|
| `src/sw.ts` | Service Worker customizado (push + precache + NetworkFirst Supabase) |
| `src/components/search/GlobalSearch.tsx` | Dialog de busca global (Ctrl+K) |
| `src/components/ui/SwipeableRow.tsx` | Componente genérico de swipe |
| `src/components/goals/GoalMilestonesPanel.tsx` | Marcos de progresso |
| `src/components/goals/GoalCard.tsx` | Toggle de milestones |
| `src/hooks/useGoalMilestones.ts` | CRUD de milestones |
| `src/hooks/usePushNotifications.ts` | Registro/remoção de push subscription |
| `src/hooks/useFamilyConsolidated.ts` | Visão consolidada do casal |
| `src/hooks/useTripMembers.ts` | guest_name, display_name, useAddGuestTripMember |
| `src/components/layout/AppLayout.tsx` | Botão busca + atalho Ctrl+K + GlobalSearch |
| `src/components/settings/PreferencesSettings.tsx` | Toggle notificações push |
| `src/pages/GoalsAndInvestments.tsx` | SwipeableRow em metas |
| `src/pages/Dashboard.tsx` | Toggle Modo Casal, FamilyBalancePanel |
| `src/hooks/useFamily.ts` | member_type, useSharedContacts, useConvert* |
| `src/pages/Family.tsx` | Seção "Contatos de Despesa" |

---

## Banco de dados — mudanças recentes

| Migration | O que fez |
|---|---|
| `member_type_column` | Coluna `member_type TEXT DEFAULT 'family'` em family_members |
| `performance_indexes` | 4 índices novos (notifications, push_sub, milestones, family_type) |
| `shared_credit_card_rls` | Políticas SELECT em accounts e transactions para convidados aceitos |

---

## Convenções do projeto
- Toasts: `sonner` (`toast.success`, `toast.error`)
- Formatação de moeda: `moneyUtils.format(value, currency)` de `@/utils/money`
- Datas: `format(date, 'dd/MM/yyyy', { locale: ptBR })`
- TanStack Query: sempre `queryClient.invalidateQueries` no `onSuccess`
- Soft delete: `.update({ deleted_at: new Date().toISOString() })`
