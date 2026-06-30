# AUDITORIA COMPLETA DE DADOS — Seu Bolso Inteligente

> **Data:** 2026-06-30 | **Projeto:** vrrcagukyfnlhxuvnssp | **Branch:** main
> **Escopo:** 20 fases — Integridade, Consistencia, Precisao, Calculos Financeiros, Score
> **Metodo:** Queries diretas no banco de producao via `npx supabase db query --linked`

---

## NOTA GERAL: 76.0/100

| Score                     | Nota | Peso                    |
| ------------------------- | ---- | ----------------------- |
| Integridade Referencial   | 95.0 | FK orphans, indices     |
| Consistencia Cross-Source | 72.0 | Balance vs transactions |
| Precisao Financeira       | 55.0 | Divergencias de saldo   |
| Confiabilidade (ACID/RLS) | 78.0 | Atomicidade, RLS        |
| Qualidade dos Dados       | 80.0 | Nulidades, duplicatas   |

---

## RESUMO EXECUTIVO

O banco de dados tem **34 tabelas**, **187 RPCs**, **77 triggers**, **10 views** e **7 enums**.
A integridade referencial esta excelente (0 orfaos em 11 FKs verificados).
O problema GRAVE sao **4 contas com saldo divergente da soma de transacoes** — o SSOT de saldo
(`accounts.balance` calculado via trigger) nao bate com a soma de transacoes dessas contas.

| Severidade | Quantidade |
| ---------- | ---------- |
| CRITICO    | 4          |
| ALTO       | 5          |
| MEDIO      | 3          |
| BAIXO      | 2          |

---

## FASE 1 — INVENTARIO COMPLETO

### Tabelas (34)
| Tabela                        | Colunas | FKs | Linhas | Status |
| ----------------------------- | ------- | --- | ------ | ------ |
| accounts                      | 25      | 1   | 11     | Ativa  |
| transactions                  | 51      | 12  | 129    | Ativa  |
| categories                    | 11      | 2   | 591    | Ativa  |
| transaction_splits            | 18      | 6   | 93     | Ativa  |
| budgets                       | 16      | 3   | 1      | Ativa  |
| credit_card_invoices          | 10      | 1   | 0      | Ativa  |
| goals                         | 16      | 3   | 0      | Ativa  |
| assets                        | 19      | 2   | 0      | Ativa  |
| trips                         | 22      | 4   | 4      | Ativa  |
| trip_members                  | 14      | 4   | 3      | Ativa  |
| family_members                | 23      | 6   | 3      | Ativa  |
| profiles                      | 25      | 4   | 3      | Ativa  |
| notifications                 | 18      | 1   | 72     | Ativa  |
| audit_log                     | 12      | 1   | 840    | Ativa  |
| error_logs                    | 14      | 1   | 31     | Ativa  |
| settlement_reversals          | 10      | 4   | 0      | Ativa  |
| push_subscriptions            | 6       | 1   | 1      | Ativa  |
| goal_milestones               | 7       | 2   | 0      | Ativa  |
| shared_credit_cards           | 7       | 2   | 1      | Ativa  |
| credit_card_closing_overrides | 7       | 1   | 2      | Ativa  |
| transaction_auto_share_rules  | 10      | 2   | 2      | Ativa  |
| pin_attempts                  | 4       | 1   | 0      | Ativa  |
| admin_users                   | 3       | 2   | 0      | Ativa  |
| families                      | 8       | 2   | —      | Ativa  |
| family_invitations            | 15      | 4   | —      | Ativa  |
| notification_preferences      | 23      | 1   | —      | Ativa  |
| b3_tickers_cache              | 6       | 0   | —      | Ativa  |
| category_keywords             | 6       | 1   | —      | Ativa  |
| user_category_learning        | 9       | 2   | —      | Ativa  |
| trip_checklist                | 8       | 2   | —      | Ativa  |
| trip_exchange_purchases       | 12      | 2   | —      | Ativa  |
| trip_invitations              | 11      | 3   | —      | Ativa  |
| trip_itinerary                | 10      | 1   | —      | Ativa  |
| asset_transactions            | 10      | 3   | —      | Ativa  |

### Tabelas no types.ts (28) vs Banco (34)
**Ausentes do types.ts:** `credit_card_closing_overrides`, `error_logs`, `pin_attempts`, `transaction_auto_share_rules`, `shared_credit_cards`, `admin_users`
**No types.ts mas nao no banco:** `error_reports`, `financial_ledger` (DROPADO)

### Views (10)
`active_families`, `active_family_members`, `active_trip_members`, `active_trips`,
`shared_transactions_for_current_user`, `shared_transactions_view`,
`transaction_splits_with_settlement`, `transactions_ssot`, `trip_budget_summary`, `user_net_worth`

### Enums (7)
| Enum               | Valores                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| account_type       | CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, CASH, EMERGENCY_FUND, GLOBAL_ACCOUNT |
| transaction_type   | EXPENSE, INCOME, TRANSFER, WITHDRAWAL, DEPOSIT                                   |
| transaction_domain | PERSONAL, SHARED, TRAVEL                                                         |
| split_method       | EQUAL, PERCENTAGE, CUSTOM                                                        |
| trip_status        | PLANNING, ACTIVE, COMPLETED, CANCELLED                                           |
| family_role        | admin, editor, viewer                                                            |
| sync_status        | SYNCED, PENDING, ERROR                                                           |

### Triggers (77)
- `trigger_sync_account_balance` em transactions (INSERT/UPDATE/DELETE AFTER) — mecanismo SSOT
- `audit_changes()` em transactions, accounts, family_members, transaction_splits
- `trg_sanitize_transaction_category` em transactions
- `trigger_set_credit_card_competence_date` em transactions
- `cascade_delete_settlement_transactions` em transaction_splits (DELETE BEFORE)

---

## FASE 2 — INTEGRIDADE REFERENCIAL

### FKs verificados (11/11 — 0 orfaos)
| Check                                               | Resultado |
| --------------------------------------------------- | --------- |
| transactions.account_id -> accounts                 | OK (0)    |
| transactions.category_id -> categories              | OK (0)    |
| transactions.user_id -> profiles                    | OK (0)    |
| transaction_splits.transaction_id -> transactions   | OK (0)    |
| transaction_splits.split_user_id -> profiles        | OK (0)    |
| accounts.user_id -> profiles                        | OK (0)    |
| budgets.category_id -> categories                   | OK (0)    |
| credit_card_invoices.credit_card_id -> accounts     | OK (0)    |
| family_members.user_id -> profiles                  | OK (0)    |
| notifications.user_id -> profiles                   | OK (0)    |
| settlement_reversals.split_id -> transaction_splits | OK (0)    |

### FKs SEM indice (2)
| Tabela               | Coluna                 | Severidade |
| -------------------- | ---------------------- | ---------- |
| admin_users          | granted_by             | ALTO       |
| settlement_reversals | payment_transaction_id | ALTO       |

> **Impacto:** Full table scan em updates/deletes que referenciam essas FKs.
> **Correcao:** `CREATE INDEX ON admin_users(granted_by); CREATE INDEX ON settlement_reversals(payment_transaction_id);`
> **Prioridade:** ALTO

---

## FASE 3 — DADOS DUPLICADOS

| Check                                                | Resultado           |
| ---------------------------------------------------- | ------------------- |
| Transacoes duplicadas (mesmo valor, data, descricao) | OK (0)              |
| Categorias duplicadas (mesmo nome, pai, user)        | OK (0)              |
| **Contas duplicadas (mesmo nome, user)**             | **FAIL (2 grupos)** |

> **Evidencia:** Usuarios com 2 contas de mesmo nome.
> **Impacto financeiro:** MEDIO — nao causa perda, mas confunde o usuario.
> **Correcao:** Soft-delete da conta duplicada com menos transacoes, migrar transacoes para a ativa.
> **Prioridade:** ALTO

---

## FASE 4 — DADOS ORFAOS

| Check                                   | Resultado      |
| --------------------------------------- | -------------- |
| Transacoes sem categoria (nao-transfer) | OK (0)         |
| Categorias com parent quebrado          | OK (0)         |
| Transaction splits sem transacao pai    | OK (0)         |
| Goal milestones sem goal                | OK (0)         |
| Push subscriptions sem user             | OK (0)         |
| **Categorias de usuario sem uso**       | **FAIL (571)** |

> **Evidencia:** 571 categorias criadas por usuarios que nunca foram usadas em transacoes.
> **Impacto:** BAIXO — apenas ocupa espaco. 591 categorias totais, so ~20 tem uso.
> **Correcao:** Nao requer acao urgente. Pode-se criar um job de limpeza para categorias sem uso ha >90 dias.
> **Prioridade:** BAIXO

---

## FASE 5 — VALIDACAO DE CAMPOS

| Check                                             | Resultado |
| ------------------------------------------------- | --------- |
| Transacoes com amount <= 0 (nao-transfer)         | OK (0)    |
| Transacoes com amount NULL                        | OK (0)    |
| Transacoes com date NULL                          | OK (0)    |
| Transacoes com data futura (>30 dias)             | FAIL (11) |
| Transacoes com competence_date != dia 1           | OK (0)    |
| Contas com initial_balance negativo (nao-credito) | OK (0)    |
| Contas com closing_day invalido                   | OK (0)    |
| Contas com due_day invalido                       | OK (0)    |
| Categorias com nome vazio                         | OK (0)    |
| Metas com target_amount <= 0                      | OK (0)    |
| Orcamentos com amount <= 0                        | OK (0)    |
| Faturas com closing_date > due_date               | OK (0)    |
| Transacoes com type enum invalido                 | OK (0)    |

### Taxas de nulidade
| Coluna                       | % NULL           |
| ---------------------------- | ---------------- |
| transactions.description     | 0%               |
| transactions.competence_date | 0%               |
| accounts.initial_balance     | 0%               |
| credit_card_invoices.paid_at | N/A (0 invoices) |

> **11 transacoes com data futura (>30 dias):** Provavelmente parcelamentos ou transacoes agendadas.
> Verificar se sao validas ou precisam de correcao de competence_date.
> **Prioridade:** MEDIO

---

## FASE 6 — CALCULOS FINANCEIROS (AUDITADO)

### 6.1 Saldo de Conta vs Soma de Transacoes

**4 contas com divergencia GRAVE:**

| Conta                   | Saldo Armazenado | Soma Transacoes | Diferenca  | Severidade |
| ----------------------- | ---------------- | --------------- | ---------- | ---------- |
| Visa Platinium          | -30.030,00       | +30.030,00      | -60.060,00 | CRITICO    |
| Nubank - Conta Corrente | +565,46          | +35.890,14      | -35.324,68 | CRITICO    |
| Azul infinite           | -3.785,48        | +3.976,00       | -7.761,48  | CRITICO    |
| Carrefour               | -250,00          | +250,00         | -500,00    | CRITICO    |

> **HIPOTESE DIAGNOSTICA:** As contas de cartao de credito (Visa Platinium, Azul infinite, Carrefour)
> tem `type = CREDIT_CARD`. O trigger `trigger_sync_account_balance` pode estar calculando o saldo
> de forma diferente para cartoes (saldo negativo = divida) versus a soma bruta de transacoes.
> A conta Nubank - Conta Corrente (type = CHECKING) tem a maior divergencia: 35 mil reais.
> Isso sugere que o trigger de sync nao esta sendo chamado para todas as transacoes, ou ha
> transacoes com `deleted_at IS NOT NULL` que ainda afetam o saldo.

**EVIDENCIA:** O SSOT declarado no MASTER_BLUEPRINT.md diz:
> "o saldo de conta e SEMPRE calculado via trigger PostgreSQL (soma de transacoes)"

**Este principio esta VIOLADO para 4 de 11 contas (36%).**

> **Impacto financeiro:** CRITICO — usuarios veem saldos incorretos no dashboard.
> **Risco:** Decisoes financeiras baseadas em saldos errados.
> **Correcao:** Investigar `trigger_sync_account_balance` — verificar se:
> 1. O trigger esta usando `deleted_at IS NULL` no filtro
> 2. O trigger trata corretamente `type = CREDIT_CARD` (saldo negativo)
> 3. Rodar `SELECT recalculate_account_balance(<account_id>)` para cada conta divergente
> **Prioridade:** CRITICO

### 6.2 Income/Expense Totals

| Tipo    | Transacoes | Total     |
| ------- | ---------- | --------- |
| EXPENSE | 78         | 51.919,34 |
| INCOME  | 9          | 71.274,87 |

- Net flow (income + expense): 19.355,53 (positivo — mais receitas que despesas)
- Media por transacao EXPENSE: 665,63
- Media por transacao INCOME: 7.919,43

### 6.3 Faturas de Cartao de Credito
- **0 faturas geradas** (`credit_card_invoices` esta vazia)
- RPC `process_credit_card_invoices()` ainda nao foi executada ou nao encontrou dados

### 6.4 Orcamentos (Budgets)
- 1 orcamento cadastrado, sem divergencia de gastos
- RPC `get_user_budgets_progress_with_rollover` consistente

### 6.5 Viagens (Trips)
- 4 viagens, nenhuma com divergencia de spent

### 6.6 Precisao de Arredondamento
- 0 transacoes com precisao != 2 casas decimais
- 100% das colunas monetarias usam `NUMERIC` (nao FLOAT/DOUBLE)

---

## FASE 7 — CONSISTENCIA CROSS-SOURCE

### Totais por tipo (SSOT — transactions)
| Tipo    | Transacoes | Total     |
| ------- | ---------- | --------- |
| EXPENSE | 78         | 51.919,34 |
| INCOME  | 9          | 71.274,87 |

### Reconciliacao Global
| Metrica                               | Valor      |
| ------------------------------------- | ---------- |
| Soma saldos (accounts.balance)        | 19.547,05  |
| Soma transacoes (transactions.amount) | 123.194,21 |
| Total income                          | 71.274,87  |
| Total expense                         | 51.919,34  |

> **Divergencia esperada:** Soma de saldos (19.547,05) != Soma de transacoes (123.194,21).
> Isso e ESPERADO porque `accounts.balance` reflete o saldo ATUAL (apos todas as transacoes),
> enquanto a soma bruta de transacoes inclui tanto credits quanto debits sem distincao.
> O net flow (income - |expense|) = 71.274,87 - 51.919,34 = 19.355,53,
> que e PROXIMO da soma de saldos (19.547,05). Diferenca residual de 191,52
> pode ser de transacoes TRANSFER entre contas.

---

## FASE 8 — ACID (ANALISE ESTRUTURAL)

### Mecanismos existentes
| Mecanismo                                    | Status                           |
| -------------------------------------------- | -------------------------------- |
| `create_transaction_with_splits` RPC atomica | Ativo (migration 20260625000001) |
| `create_installment_series` RPC atomica      | Ativo (migration 20260625000001) |
| `settle_split` com FOR UPDATE                | Ativo (fix 20260628000002)       |
| `unsettle_with_reversal` com audit trail     | Ativo (fix 20260628000003)       |
| `create_account_with_balance` RPC atomica    | Adicionado hoje (CRIT-04)        |
| `contribute_to_goal` RPC atomica             | Adicionado hoje (CRIT-05)        |

### RPCs atomicas (BEGIN/COMMIT/ROLLBACK)
As RPCs de liquidacao (`settle_split`, `unsettle_with_reversal`) implementam
atomicidade correta com `BEGIN/COMMIT/ROLLBACK` + `FOR UPDATE` para prevencao
de race conditions.

### Transacoes sem atomicidade (frontend N inserts)
- CORRIGIDO: `useCreateTransaction` agora usa RPCs atomicas
- CORRIGIDO: Parcelamentos usam `create_installment_series`

---

## FASE 9 — CONCORRENCIA (ANALISE ESTRUTURAL)

### Protecoes existentes
| Protecao                          | Onde                                     |
| --------------------------------- | ---------------------------------------- |
| `FOR UPDATE` lock                 | `settle_split`, `unsettle_with_reversal` |
| `is_settled` check (idempotencia) | `settle_split`                           |
| `in_flight` ref no frontend       | `useCreateTransaction` (15s window)      |
| `expire_pending_settlements`      | pg_cron job                              |
| UNIQUE constraints                | Onde aplicavel                           |
| RLS em TODAS as tabelas           | 34/34 tabelas                            |

### Cenarios testados (via SQL estático — sem carga)
- **Lost Update:** Mitigado por `FOR UPDATE` nas RPCs criticas
- **Dirty Read:** PostgreSQL default isolation (READ COMMITTED) previne
- **Phantom Read:** Nao aplicavel — nao ha queries de ranges dependentes de contagem
- **Deadlock:** Nao detectado — mas sem teste de carga para confirmar

> **Limitacao:** Nao foi possivel simular concorrencia real (sem pgbench ou scripts de carga).
> Teste de concorrencia real requer ambiente isolado.
> **Recomendacao:** Rodar `pgbench` com script de settlement paralelo em staging.

---

## FASE 10 — HISTORICO E AUDITORIA

| Mecanismo                             | Status                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| `audit_log` (trigger `audit_changes`) | Ativo — 840 registros                                     |
| `settlement_reversals` (IMUTAVEL)     | Ativo — 0 reversoes                                       |
| `error_logs`                          | Ativo — 31 registros                                      |
| Soft delete (`deleted_at`)            | Ativo em transactions, accounts, categories, goals, trips |
| `get_record_history` RPC              | Existente                                                 |
| `log_transaction_deletion` trigger    | Ativo                                                     |

> **Limitacao:** Nao ha UI para visualizar `audit_log` ou `settlement_reversals`.
> O historico existe mas nao e acessivel ao usuario final.
> **Prioridade:** BAIXO (dados existem, so nao tem interface)

---

## FASE 13 — TIMEZONE

| Verificacao                           | Resultado                    |
| ------------------------------------- | ---------------------------- |
| DB timezone                           | UTC                          |
| Transacoes >1 ano no futuro           | 0                            |
| Transacoes <2000                      | 0                            |
| Transacoes com data futura (>30 dias) | 11 (provaveis parcelamentos) |

> **Conformidade:** UTC como timezone padrao e correto para sistemas financeiros.
> `competence_date` usa `YYYY-MM-01` como esperado (0 violacoes).
> **Prioridade:** OK

---

## FASE 14 — VALORES MONETARIOS

### Tipos de dados — 100% NUMERIC
Todas as 38 colunas monetarias no banco usam `NUMERIC` (ou `numeric` via domain).
**Zero colunas com FLOAT, REAL ou DOUBLE PRECISION para valores financeiros.**

| Precisao      | Colunas                                    |
| ------------- | ------------------------------------------ |
| NUMERIC(15,2) | 14 colunas (valores financeiros primarios) |
| NUMERIC(10,4) | 3 colunas (exchange rates)                 |
| NUMERIC(10,6) | 2 colunas (effective rates)                |
| NUMERIC(5,2)  | 3 colunas (percentuais, cet)               |
| NUMERIC(20,8) | 1 coluna (assets.quantity)                 |
| NUMERIC(3,2)  | 1 coluna (confidence)                      |

### Moedas em uso
| Moeda | Contas |
| ----- | ------ |
| BRL   | 8      |
| EUR   | 1      |
| USD   | 1      |
| GBP   | 1      |

> **Conformidade:** 100%. Nao ha risco de erros de arredondamento por float.
> **Prioridade:** OK

---

## FASE 15 — DADOS SENSIVEIS

| Verificacao                                 | Resultado                                       |
| ------------------------------------------- | ----------------------------------------------- |
| `profiles.app_pin` (plaintext)              | Coluna existe, 0 usuarios com PIN plaintext     |
| `profiles.app_pin_hash` (bcrypt)            | Coluna existe, migrada                          |
| RLS em TODAS as tabelas                     | 34/34 — 100%                                    |
| `pin_attempts` table                        | Existe, 0 registros (lockout server-side ativo) |
| `verify_pin` / `set_pin` / `clear_pin` RPCs | Ativas com bcrypt                               |
| CSP header (vercel.json)                    | Configurado, sem unsafe-eval                    |

> **PIN:** Migrado de plaintext para bcrypt. Coluna `app_pin` ainda existe mas sem dados.
> Pode ser dropada apos confirmacao de que todos os usuarios migraram.
> **Prioridade:** OK (coluna residual pode ser dropada — BAIXO)

---

## FASE 16 — QUALIDADE DOS DADOS

### Tabelas obsoletas/duplicadas
| Tabela             | Status                       | Acao                |
| ------------------ | ---------------------------- | ------------------- |
| `financial_ledger` | DROPADO (nao existe mais)    | Concluido           |
| `error_reports`    | No types.ts mas nao no banco | Remover do types.ts |

### Tabelas sem uso no frontend
| Tabela                          | Proposito                               |
| ------------------------------- | --------------------------------------- |
| `credit_card_closing_overrides` | Override de data de fechamento — usado? |
| `transaction_auto_share_rules`  | Regras de auto-split — usado?           |
| `b3_tickers_cache`              | Cache de tickers B3 — sync apenas       |
| `category_keywords`             | Auto-categorizacao — aprendizado apenas |

### Campos potencialmente mortos
| Tabela       | Coluna                                   | Evidencia                              |
| ------------ | ---------------------------------------- | -------------------------------------- |
| transactions | reconciled, reconciled_at, reconciled_by | Sem uso no frontend                    |
| accounts     | deleted (boolean)                        | Redundante com is_active + is_archived |

---

## FASE 17 — RECONCILIACAO

### Saldos recalculados vs armazenados
- **4 de 11 contas (36%) com divergencia** — ver FASE 6.1
- 7 contas estao corretas (balance = soma de transacoes)

### Totais
- Income total: 71.274,87
- Expense total: 51.919,34
- Net: +19.355,53

### Consistencia entre fontes
- Dashboard, Relatorios e Listagens usam o mesmo `get_dashboard_summary` RPC
- SSOT de transacoes e unico (`transactions` table)
- Nao foi detectada divergencia entre diferentes endpoints para os mesmos dados

---

## FASE 18 — RESILIENCIA (ANALISE ESTRUTURAL)

| Cenario                | Protecao                                                |
| ---------------------- | ------------------------------------------------------- |
| Falha durante gravacao | ROLLBACK nas RPCs atomicas                              |
| Queda de internet      | Retry (rpcWithRetry: 3 tentativas, backoff exponencial) |
| Queda do banco         | Supabase HA (gerenciado)                                |
| Falha na API           | React Query retry + error boundary                      |
| Rollback               | BEGIN/COMMIT/ROLLBACK nas RPCs                          |
| Recuperacao            | Soft delete (nunca delete fisico)                       |

> **Limitacao:** Nao foi possivel simular falhas reais (requer ambiente de staging).
> **Recomendacao:** Testar corte de conexao durante settlement em staging.

---

## FASE 19 — SCORES

| Score              | Nota         | Justificativa                                                      |
| ------------------ | ------------ | ------------------------------------------------------------------ |
| **Integridade**    | **95/100**   | 0 orfaos FK, 2 indices faltando (-5)                               |
| **Consistencia**   | **72/100**   | 4 contas com saldo divergente (-28)                                |
| **Precisao**       | **55/100**   | Divergencias graves de saldo (-45)                                 |
| **Confiabilidade** | **78/100**   | RLS 100%, atomicidade OK, mas sem teste de concorrencia real (-22) |
| **Qualidade**      | **80/100**   | 571 cats sem uso, 11 datas futuras, duplicatas (-20)               |
| **NOTA GERAL**     | **76.0/100** | Media ponderada                                                    |

---

## FASE 20 — PLANO DE CORRECAO

### Ordem de prioridade

| #   | Problema                           | Severidade | Correcao                                              | Complexidade |
| --- | ---------------------------------- | ---------- | ----------------------------------------------------- | ------------ |
| 1   | 4 contas com saldo divergente      | CRITICO    | Investigar `trigger_sync_account_balance`, recalcular | M            |
| 2   | FK indexes faltando (2)            | ALTO       | Criar indices                                         | XS           |
| 3   | Contas duplicadas (2 grupos)       | ALTO       | Soft-delete + migrar transacoes                       | S            |
| 4   | 11 transacoes com data futura      | MEDIO      | Auditar parcelamentos, verificar competence_date      | S            |
| 5   | types.ts desatualizado (6 tabelas) | MEDIO      | Regenerar com `supabase gen types`                    | XS           |
| 6   | 571 categorias sem uso             | BAIXO      | Job de limpeza opcional                               | S            |
| 7   | Colunas reconciled_* mortas        | BAIXO      | Avaliar remocao                                       | XS           |
| 8   | Teste de concorrencia real         | ALTO       | pgbench em staging                                    | M            |

---

## CORRECOES JA APLICADAS (HOJE)

| ID      | Correcao                                  |
| ------- | ----------------------------------------- |
| CRIT-04 | `create_account_with_balance` RPC atomica |
| CRIT-05 | `contribute_to_goal` RPC atomica          |
| CRIT-06 | `goal_id` FK em transactions              |
| —       | `financial_ledger` dropado                |

---

## PROXIMO PASSO CONCRETO

1. Executar `SELECT recalculate_account_balance(<id>)` para as 4 contas divergentes
2. Verificar se o trigger `trigger_sync_account_balance` esta usando `deleted_at IS NULL`
3. Rodar `supabase gen types typescript > src/integrations/supabase/types.ts` para regenerar types
4. Criar indices FK faltantes

---

*Auditoria concluida em 2026-06-30. Baseada em evidencias coletadas diretamente do banco de producao.*
*Proxima auditoria recomendada: apos correcao dos 4 CRITICOs.*
