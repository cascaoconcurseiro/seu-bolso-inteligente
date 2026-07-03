# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-07-03

---

## O que foi feito nesta sessão (03/07)

### Correções de produção (3 commits)

1. **PostgREST RPC routing** — 52 SECURITY DEFINER functions receberam `GRANT EXECUTE ON ... TO anon` para aparecerem no schema cache do PostgREST. `clear_error_logs()` excluída (sem auth check).
   - `20260703010000_fix_postgrest_rpc_routing_grant_anon_execute.sql`

2. **Trigger órfã `trg_create_ledger_on_split`** — causa raiz do 404 em `create_installment_series`. A trigger referenciava `financial_ledger` (tabela dropada na Fase 1). Dropada junto com 3 funções órfãs.
   - `20260703020000_drop_financial_ledger_orphans_trigger_and_functions.sql`

3. **6 bugs silenciosos encontrados pelo smoke test de integração (38 cenários)**:
   - `create_account_with_balance`: variáveis TEXT usadas em colunas DATE (falha com `search_path=''`)
   - `search_transactions`: return type `text` vs enum `transaction_type`
   - `recalculate_all_balances`: referenciava coluna `deleted` (não existe, é `deleted_at`)
   - `submit_error_report`: inseria em `error_reports` (não existe, é `error_logs`)
   - `set_pin` / `verify_pin`: `gen_salt()` / `crypt()` sem prefix `extensions.`
   - `soft_delete_account`: trigger `prevent_delete_if_has_transactions` bloqueava porque transações eram deletadas DEPOIS da conta (invertida a ordem)
   - `20260703030000_fix_smoke_test_bugs_6_functions.sql`

### Correções de frontend

- **SplitModal em viagens**: `handleDividirClick` agora abre SplitModal (não QuickSplit) quando há trip selecionada. Criado `tripFilteredMembers` para filtrar apenas participantes da viagem.
  - `AdvancedOptions.tsx`, `useTransactionForm.ts`, `TransactionForm.tsx`

- **competence_date**: 1 transação corrigida manualmente (Cabelo 19/jun → competence jun, não jul). Trigger verificada correta para todos os 3 cartões.

### Smoke test de integração (database-level)

Simulou 38 operações que o frontend faz, com usuário teste:
- Contas: criar (CHECKING/SAVINGS/CREDIT_CARD), saldo inicial, soft delete, check dependencies
- Transações: criar, editar, soft delete (NONE/ALL cascade), restore
- Parcelas: `create_installment_series` (simples e compartilhada)
- Compartilhadas: `create_transaction_with_splits`, família, membros
- Transferências: `transfer_between_accounts`, `withdraw_from_account`
- Cartão crédito: competence_date antes/depois do closing day
- RPCs de dashboard: 8 relatórios testados (summary, projection, evolution, etc.)
- Viagens, metas, contribuições, PIN, error report, search
- **Resultado final: 38/38 PASS** (após corrigir os 6 bugs)

## Próximo passo concreto

- O sistema backend está estável. Todas as funções que o frontend usa foram testadas.
- Possíveis próximos passos:
  1. Testar o app no browser para verificar todos os fluxos do usuário (golden path)
  2. Retomar o projeto iOS (Fase 0 — Descoberta & Auditoria)
  3. Qualquer nova feature/bugfix que o usuário solicitar

## Bloqueios

- Nenhum bloqueio técnico. Sistema operacional.
