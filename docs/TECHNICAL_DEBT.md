# Technical Debt — Database Migrations

> Última atualização: 2026-07-01
> Migrações de captura: `20260702150000`, `20260702150100`

## Objetos existentes no Supabase mas SEM migration

Os itens abaixo existem no banco de produção (criados via SQL Editor / Dashboard) mas não estavam capturados em arquivos de migration. As migrations `20260702150000` (RPCs) e `20260702150100` (tabelas) agora os capturam com `CREATE OR REPLACE` / `CREATE TABLE IF NOT EXISTS`.

### RPCs capturadas (`20260702150000`)

| RPC                                 | Frontend                                |
| ----------------------------------- | --------------------------------------- |
| `transfer_between_accounts`         | `src/hooks/useTransfer.ts`              |
| `delete_installment_series`         | `src/hooks/useSharedExpensesActions.ts` |
| `withdraw_from_account`             | `src/hooks/useWithdrawal.ts`            |
| `fn_respond_family_invitation`      | `src/hooks/useFamilyInvitations.ts`     |
| `migrate_transactions_to_account`   | `src/hooks/useAccountManagement.ts`     |
| `clear_error_logs`                  | `src/hooks/useAdminActions.ts`          |
| `assign_default_account_to_orphans` | `src/hooks/useAccountManagement.ts`     |

### Tabelas capturadas (`20260702150100`)

| Tabela                         | Frontend                                          |
| ------------------------------ | ------------------------------------------------- |
| `asset_transactions`           | `useAssets.ts`, `AssetTransactionDialog.tsx`      |
| `transaction_auto_share_rules` | `useAutoShareRules.ts`, `useCreateTransaction.ts` |
| `notification_preferences`     | `useNotifications.ts`, `notificationService.ts`   |

---

## Objetos NÃO capturados (criados via Dashboard, sem risco imediato)

Estes existem via Supabase Dashboard (schema inicial do projeto). As migrations os referenciam e modificam, mas não há um `CREATE TABLE` inicial:

- `accounts`, `transactions`, `categories`, `budgets`
- `profiles`, `families`, `family_members`, `family_invitations`
- `trip_members`, `trip_invitations`, `trip_participants`, `trip_itinerary`, `trip_exchange_purchases`
- `notifications`

**Risco:** Se precisar recriar o banco do zero, essas tabelas precisam ser criadas via Dashboard primeiro, depois as migrations podem ser aplicadas.

---

## ENUMs não capturados

Criados via Dashboard, referenciados por migrations sem `CREATE TYPE`:

- `transaction_domain` — valores: `PERSONAL`, `BUSINESS`, `FAMILY`, `TRIP`
- `trip_status` — valores: `PLANNING`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- `account_type` — extendido em `20260521000000_add_global_account.sql`

---

## Nota para o Claude

Se for implementar features novas que toquem nessas tabelas/RPCs:
1. As tabelas base NÃO têm `CREATE TABLE` em migration — modifique-as com `ALTER TABLE` apenas
2. Os ENUMs existem no Postgres mas sem migration — use `ALTER TYPE` para adicionar valores
3. As RPCs agora têm migration — use `CREATE OR REPLACE` para modificá-las
4. Se precisar recriar o banco: crie as tabelas base pelo Dashboard primeiro, depois rode as migrations
