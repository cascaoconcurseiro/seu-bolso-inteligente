# Claude Handoff — Pé de Meia (seu-bolso-inteligente)

> Atualizado em: 2026-06-24
> Último commit: `ea9faee` | Branch: `main` | Deploy: meupedemeia.vercel.app

---

## Stack
React + Vite + TypeScript + Supabase + TanStack Query + Zustand + Tailwind + shadcn/ui  
Supabase project: `vrrcagukyfnlhxuvnssp`

---

## Regras da sessão (aplicar sempre)
- **Push automático**: sempre `git push origin main` após cada commit
- **Handoff atualizado**: atualizar este arquivo após cada bloco de features ou ao se aproximar do limite de contexto

---

## Histórico de commits desta sprint

| Commit | Feature |
|---|---|
| `e9b8ae8` | Conta/Cartão Padrão pré-selecionado no TransactionForm |
| `f019f01` | Divisão Rápida inline |
| `e0ccd78` | FamilyBalancePanel no Dashboard |
| `fa9b688` | Travel Mode — banner de viagem ativa |
| `f61d716` | Swipe gestures em TransactionItem |
| `83a1ceb` | Participante de viagem sem conta (guest) + migration DB |
| `3bdaf96` | Modo Casal completo — RPC + hook + toggle |
| `56acd2e` | Fix: duplicate profile declaration (build fix) |
| `7a99029` | Busca Global tipo Spotlight (Ctrl+K) |
| `e6f91a6` | SwipeableRow genérico + swipe em Metas |
| `55c5451` | Marcos de progresso em Metas (milestones) |
| `ea9faee` | Notificações push reais (Edge Function + VAPID) |

---

## O que foi implementado (COMPLETO)

### Auditoria original (fases 1-3) ✅
- GoalCard, CreditCardDetailView, busca histórica, edição de categorias
- useBillsDue, useUpdateRecurringSeries, InstallmentSimulator
- DashboardLowBalanceAlert, CategoryTrend, CashFlowProjection
- Keywords expandidas, Cartão Padrão, Auto-Compartilhamento por Regras

### Features desta sprint ✅
- Conta/cartão padrão pré-selecionado no form
- Divisão Rápida (N pessoas, sem família)
- FamilyBalancePanel (dívidas entre membros no Dashboard)
- Travel Mode (banner sugerindo vincular à viagem ativa)
- Swipe left/right em TransactionItem
- Participante de viagem sem conta (guest)
- Modo Casal (visão consolidada de saldo/receita/despesa)
- **Busca Global** — dialog cmdk, Ctrl+K, busca em transações/contas/metas
- **SwipeableRow** — componente genérico reutilizável, aplicado em Metas
- **Marcos de progresso (Milestones)** — tabela goal_milestones, linha do tempo visual no GoalCard
- **Notificações push reais** — tabela push_subscriptions, Edge Function `send-bill-reminders` com VAPID/AES-128-GCM, toggle em Configurações

---

## O que pode ser feito a seguir (próximas sessões)

### Configuração pendente (produção)
1. **VAPID keys**: gerar par de chaves VAPID (ex: `npx web-push generate-vapid-keys`), adicionar `VITE_VAPID_PUBLIC_KEY` no .env da Vercel e `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` nos secrets da Edge Function no Supabase Dashboard.
2. **Service Worker**: o `usePushNotifications` usa `navigator.serviceWorker.ready` — verificar se o SW do vite-plugin-pwa está registrado e tem `pushnotificationclick` handler para abrir o app ao clicar na notificação.
3. **Cron da Edge Function**: agendar `send-bill-reminders` para rodar diariamente (ex: pg_cron ou webhook externo).

### Features de UX
4. **SwipeableRow em Contas (listagem mobile)**: na versão mobile as contas aparecem em cards, mas em listas menores dentro de modais/sheets poderia ter swipe.
5. **Export PDF de meta específica**: botão no GoalCard para baixar um resumo da meta em PDF.
6. **Gráfico de evolução da meta**: linha do tempo de aportes no GoalContributeDialog.

### Backend / Database
7. **RLS cross-family para contas compartilhadas de cartão**: shared_credit_card já existe no schema mas visibilidade do saldo do parceiro depende de RLS manual.
8. **Índices de performance**: verificar EXPLAIN ANALYZE nas queries mais pesadas.
9. **Service Worker push handler**: adicionar evento `push` e `notificationclick` no SW para mostrar/abrir notificação recebida.

---

## Arquivos-chave

| Arquivo | Relevância |
|---|---|
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

---

## Convenções do projeto
- Toasts: `sonner` (`toast.success`, `toast.error`)
- Formatação de moeda: `moneyUtils.format(value, currency)` de `@/utils/money`
- Datas: sempre `date-fns` + `ptBR` locale
- Mutations: sempre invalidar queries com `invalidateFinancialQueries(queryClient)`
- Soft delete: `deleted_at` column (nunca DELETE direto)
- Padrão de modal mobile: Drawer bottom-sheet (não Dialog) para telas pequenas
- Commits em português, mensagem detalhada
- Push automático após cada commit (`git push origin main`)
- Zero erros TypeScript antes de commitar (`npx tsc --noEmit`)
