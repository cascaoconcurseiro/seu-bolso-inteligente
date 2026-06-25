# Claude Handoff — Pé de Meia (seu-bolso-inteligente)

> Atualizado em: 2026-06-24
> Último commit: `3bdaf96` | Branch: `main` | Deploy: meupedemeia.vercel.app

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
| `f019f01` | Divisão Rápida (N pessoas, sem membros de família) |
| `e0ccd78` | FamilyBalancePanel no Dashboard (dívidas entre membros) |
| `fa9b688` | Travel Mode — banner sugerindo vincular à viagem ativa |
| `f61d716` | Swipe gestures: left=deletar, right=editar em TransactionItem |
| `83a1ceb` | Participante de viagem sem conta no app (guest) + migration DB |
| `3bdaf96` | Modo Casal completo — RPC + hook + toggle no Dashboard |

---

## Estado atual — o que foi implementado (COMPLETO)

### Auditoria original (fases 1-3) ✅
- GoalCard, CreditCardDetailView, busca histórica, edição de categorias
- useBillsDue, useUpdateRecurringSeries, InstallmentSimulator
- DashboardLowBalanceAlert, CategoryTrend, CashFlowProjection
- Keywords expandidas, Cartão Padrão, Auto-Compartilhamento por Regras

### Features extras desta sessão ✅
- **Conta/cartão padrão no form**: lê do perfil, pré-seleciona na abertura
- **Divisão Rápida**: painel inline para N pessoas sem ser família
- **FamilyBalancePanel**: widget no Dashboard com saldo de dívidas
- **Travel Mode**: banner de viagem ativa ao criar despesa
- **Swipe gestures**: left=delete, right=edit em TransactionItem
- **Guests em viagens**: migration `trip_members.user_id` nullable + `guest_name`; aba "Convidado" no AddParticipantDialog
- **Modo Casal**: RPC `get_family_consolidated_summary` + hook `useFamilyConsolidated` + toggle no Dashboard

---

## O que pode ser feito a seguir (próximas sessões)

### Features de UX (média complexidade)
1. **Swipe em outras listas**: AccountBalanceCard, GoalCard, SharedExpenseCard usam apenas botões. Extrair `SwipeableRow` genérico de `TransactionItem` e reutilizar nessas listas.
2. **Busca global**: barra de pesquisa que encontra transações, contas, metas e categorias de uma vez (tipo Spotlight). Pode ser um Cmdk dialog.
3. **Export CSV/PDF de relatórios**: nas telas de Relatórios/Transações, botão "Exportar" que gera arquivo local.

### Features de conteúdo (baixa complexidade)
4. **Onboarding melhorado**: wizard de 3 passos ao criar conta (adicionar conta, categoria padrão, orçamento mensal).
5. **Metas com milestone**: dividir uma meta em sub-metas/marcos com % de progresso visual.
6. **Notificações push reais**: configurar Supabase Edge Function para enviar web push quando vencimento de conta se aproxima (já há `enable_notification` nas transações).

### Backend / Database
7. **RLS cross-family para contas compartilhadas de cartão**: hoje o `shared_credit_card` já existe no schema mas a visibilidade do saldo do parceiro depende de RLS manual.
8. **Índices de performance**: verificar `EXPLAIN ANALYZE` nas queries mais pesadas (transações com splits, shared balances).

---

## Arquivos-chave

| Arquivo | Relevância |
|---|---|
| `src/components/transactions/form/useTransactionForm.ts` | Inicialização com conta/cartão padrão do perfil |
| `src/components/transactions/form/AdvancedOptions.tsx` | Divisão Rápida (N pessoas inline) |
| `src/components/transactions/TransactionForm.tsx` | Banner de viagem ativa, Swipe gestures |
| `src/components/transactions/TransactionItem.tsx` | Swipe left/right |
| `src/components/dashboard/FamilyBalancePanel.tsx` | Painel de dívidas entre membros |
| `src/components/trips/AddParticipantDialog.tsx` | Aba "Convidado" (guest sem conta) |
| `src/hooks/useTripMembers.ts` | guest_name, display_name, useAddGuestTripMember |
| `src/hooks/useFamilyConsolidated.ts` | Hook de visão consolidada do casal |
| `src/pages/Dashboard.tsx` | Toggle Modo Casal, FamilyBalancePanel inserido |
| `src/hooks/useUserProfile.ts` | default_account_id, default_credit_card_id, low_balance_threshold |
| `src/components/settings/PreferencesSettings.tsx` | Seletores de conta/cartão padrão + alerta de saldo baixo |

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
