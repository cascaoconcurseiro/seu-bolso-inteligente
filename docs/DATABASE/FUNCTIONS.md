# 🔧 Funções SQL

## Índice

- [Funções de Cálculo](#funções-de-cálculo)
- [Funções de Acerto](#funções-de-acerto)
- [Funções de Soft Delete](#funções-de-soft-delete)
- [Funções de Auditoria](#funções-de-auditoria)
- [Funções de Viagens](#funções-de-viagens)
- [Funções Auxiliares](#funções-auxiliares)

---

## Funções de Cálculo

### calculate_account_balance
**Descrição:** Calcula o saldo de uma conta baseado em transações

**Assinatura:**
```sql
calculate_account_balance(p_account_id UUID) RETURNS NUMERIC
```

**Lógica:**
```sql
saldo_inicial + SUM(
  CASE 
    WHEN type = 'INCOME' THEN +amount
    WHEN type = 'EXPENSE' AND (payer_id IS NULL OR payer_id = meu_member_id) THEN -amount
    WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
    WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN +amount
    ELSE 0
  END
)
```

**Exemplo:**
```sql
SELECT calculate_account_balance('550e8400-e29b-41d4-a716-446655440000');
-- Retorna: 1500.00
```

---

### calculate_balance_between_users
**Descrição:** Calcula saldo líquido entre dois usuários

**Assinatura:**
```sql
calculate_balance_between_users(
  p_user1_id UUID,
  p_user2_id UUID,
  p_currency TEXT DEFAULT 'BRL'
) RETURNS TABLE (
  user1_owes NUMERIC,
  user2_owes NUMERIC,
  net_balance NUMERIC,
  currency TEXT
)
```

**Exemplo:**
```sql
SELECT * FROM calculate_balance_between_users(
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001',
  'BRL'
);

-- Retorna:
-- user1_owes | user2_owes | net_balance | currency
-- 150.00     | 80.00      | 70.00       | BRL
-- (user1 deve líquido de R$ 70 para user2)
```

---

### calculate_trip_spent
**Descrição:** Calcula total gasto em uma viagem

**Assinatura:**
```sql
calculate_trip_spent(p_trip_id UUID) RETURNS NUMERIC
```

**Exemplo:**
```sql
SELECT calculate_trip_spent('trip-id');
-- Retorna: 2500.00
```

---

### get_trip_financial_summary
**Descrição:** Retorna resumo financeiro completo de uma viagem

**Assinatura:**
```sql
get_trip_financial_summary(p_trip_id UUID) RETURNS TABLE (
  total_budget NUMERIC,
  total_spent NUMERIC,
  total_settled NUMERIC,
  remaining NUMERIC,
  percentage_used NUMERIC,
  currency TEXT,
  participants_count BIGINT,
  transactions_count BIGINT
)
```

**Exemplo:**
```sql
SELECT * FROM get_trip_financial_summary('trip-id');

-- Retorna:
-- total_budget | total_spent | total_settled | remaining | percentage_used | currency | participants_count | transactions_count
-- 5000.00      | 2500.00     | 1000.00       | 2500.00   | 50.00           | BRL      | 4                  | 15
```

---

### recalculate_all_account_balances
**Descrição:** Recalcula saldos de todas as contas

**Assinatura:**
```sql
recalculate_all_account_balances() RETURNS TABLE (
  account_id UUID,
  old_balance NUMERIC,
  new_balance NUMERIC
)
```

**Exemplo:**
```sql
SELECT * FROM recalculate_all_account_balances();

-- Retorna apenas contas com diferença:
-- account_id                           | old_balance | new_balance
-- 550e8400-e29b-41d4-a716-446655440000 | 1450.00     | 1500.00
```

---

### get_monthly_projection
**Descrição:** Projeta receitas e despesas futuras

**Assinatura:**
```sql
get_monthly_projection(
  p_user_id UUID,
  p_end_date DATE
) RETURNS TABLE (
  projected_income NUMERIC,
  projected_expenses NUMERIC,
  projected_balance NUMERIC,
  shared_debts NUMERIC,
  shared_credits NUMERIC
)
```

**Exemplo:**
```sql
SELECT * FROM get_monthly_projection(
  auth.uid(),
  '2026-01-31'
);
```

---

## Funções de Acerto

### settle_balance_between_users
**Descrição:** Acerta todas as dívidas entre dois usuários

**Assinatura:**
```sql
settle_balance_between_users(
  p_user1_id UUID,
  p_user2_id UUID,
  p_settlement_transaction_id UUID DEFAULT NULL
) RETURNS INTEGER
```

**Exemplo:**
```sql
-- Criar transação de acerto primeiro
INSERT INTO transactions (user_id, amount, description, date, type)
VALUES (auth.uid(), 150, 'Acerto de contas', CURRENT_DATE, 'INCOME')
RETURNING id;

-- Acertar usando o ID da transação
SELECT settle_balance_between_users(
  'user1-id',
  'user2-id',
  'settlement-tx-id'
);

-- Retorna: 5 (número de registros acertados)
```

---

### settle_partial_balance
**Descrição:** Acerta parcialmente dívidas (acerta splits mais antigos primeiro)

**Assinatura:**
```sql
settle_partial_balance(
  p_user1_id UUID,
  p_user2_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'BRL',
  p_settlement_transaction_id UUID DEFAULT NULL
) RETURNS TABLE (
  splits_settled INTEGER,
  amount_settled NUMERIC,
  remaining_balance NUMERIC
)
```

**Exemplo:**
```sql
-- Acertar R$ 500 de uma dívida de R$ 800
SELECT * FROM settle_partial_balance(
  'debtor-id',
  'creditor-id',
  500.00,
  'BRL',
  'settlement-tx-id'
);

-- Retorna:
-- splits_settled | amount_settled | remaining_balance
-- 3              | 500.00         | 300.00
```

---

### get_pending_splits_for_settlement
**Descrição:** Lista splits pendentes ordenados por data

**Assinatura:**
```sql
get_pending_splits_for_settlement(
  p_debtor_user_id UUID,
  p_creditor_user_id UUID,
  p_currency TEXT DEFAULT 'BRL'
) RETURNS TABLE (
  split_id UUID,
  transaction_id UUID,
  description TEXT,
  date DATE,
  amount NUMERIC,
  currency TEXT,
  days_overdue INTEGER
)
```

**Exemplo:**
```sql
SELECT * FROM get_pending_splits_for_settlement(
  'debtor-id',
  'creditor-id',
  'BRL'
);

-- Retorna lista de splits pendentes ordenados por data
```

---

### suggest_payment_plan
**Descrição:** Sugere plano de pagamento mensal

**Assinatura:**
```sql
suggest_payment_plan(
  p_debtor_user_id UUID,
  p_creditor_user_id UUID,
  p_monthly_payment NUMERIC,
  p_currency TEXT DEFAULT 'BRL'
) RETURNS TABLE (
  month INTEGER,
  payment_amount NUMERIC,
  splits_to_settle INTEGER,
  remaining_balance NUMERIC
)
```

**Exemplo:**
```sql
-- Sugerir plano de R$ 500/mês para dívida de R$ 1500
SELECT * FROM suggest_payment_plan(
  'debtor-id',
  'creditor-id',
  500.00,
  'BRL'
);

-- Retorna:
-- month | payment_amount | splits_to_settle | remaining_balance
-- 1     | 500.00         | 3                | 1000.00
-- 2     | 500.00         | 2                | 500.00
-- 3     | 500.00         | 1                | 0.00
```

---

### mark_as_paid_by_debtor
**Descrição:** Devedor marca split como pago

**Assinatura:**
```sql
mark_as_paid_by_debtor(
  p_split_id UUID,
  p_settlement_tx_id UUID DEFAULT NULL
) RETURNS VOID
```

**Exemplo:**
```sql
SELECT mark_as_paid_by_debtor('split-id', 'settlement-tx-id');
```

---

### mark_as_received_by_creditor
**Descrição:** Credor marca split como recebido

**Assinatura:**
```sql
mark_as_received_by_creditor(
  p_split_id UUID,
  p_settlement_tx_id UUID DEFAULT NULL
) RETURNS VOID
```

**Exemplo:**
```sql
SELECT mark_as_received_by_creditor('split-id', 'settlement-tx-id');
```

---

### undo_settlement
**Descrição:** Desfaz acerto de um lado

**Assinatura:**
```sql
undo_settlement(
  p_split_id UUID,
  p_side TEXT -- 'DEBTOR' ou 'CREDITOR'
) RETURNS VOID
```

**Exemplo:**
```sql
-- Devedor desfaz marcação
SELECT undo_settlement('split-id', 'DEBTOR');

-- Credor desfaz marcação
SELECT undo_settlement('split-id', 'CREDITOR');
```

---

## Funções de Soft Delete

### soft_delete_transaction
**Descrição:** Soft delete de transação e dados relacionados

**Assinatura:**
```sql
soft_delete_transaction(p_transaction_id UUID) RETURNS VOID
```

**Exemplo:**
```sql
SELECT soft_delete_transaction('tx-id');
```

**Efeitos:**
- Marca transação como deletada
- Marca splits como deletados
- Marca transações espelhadas como deletadas

---

### soft_delete_account
**Descrição:** Soft delete de conta e transações associadas

**Assinatura:**
```sql
soft_delete_account(p_account_id UUID) RETURNS VOID
```

**Exemplo:**
```sql
SELECT soft_delete_account('account-id');
```

**Efeitos:**
- Marca conta como deletada
- Marca todas as transações da conta como deletadas

---

### restore_transaction
**Descrição:** Restaura transação soft-deleted

**Assinatura:**
```sql
restore_transaction(p_transaction_id UUID) RETURNS VOID
```

**Exemplo:**
```sql
SELECT restore_transaction('tx-id');
```

**Efeitos:**
- Remove deleted_at da transação
- Remove deleted_at dos splits
- Remove deleted_at dos espelhos

---

### permanent_delete_old_records
**Descrição:** Hard delete de registros soft-deleted há mais de 90 dias

**Assinatura:**
```sql
permanent_delete_old_records() RETURNS INTEGER
```

**Exemplo:**
```sql
SELECT permanent_delete_old_records();
-- Retorna: 15 (número de registros deletados permanentemente)
```

---

## Funções de Auditoria

### get_record_history
**Descrição:** Retorna histórico completo de um registro

**Assinatura:**
```sql
get_record_history(
  p_table_name TEXT,
  p_record_id UUID
) RETURNS TABLE (
  action TEXT,
  changed_at TIMESTAMPTZ,
  changed_by_email TEXT,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB
)
```

**Exemplo:**
```sql
SELECT * FROM get_record_history('transactions', 'tx-id');

-- Retorna histórico completo de mudanças
```

---

### get_user_activity
**Descrição:** Retorna atividade recente de um usuário

**Assinatura:**
```sql
get_user_activity(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  table_name TEXT,
  record_id UUID,
  action TEXT,
  changed_at TIMESTAMPTZ,
  changed_fields TEXT[]
)
```

**Exemplo:**
```sql
SELECT * FROM get_user_activity(auth.uid(), 50);

-- Retorna últimas 50 ações do usuário
```

---

### cleanup_old_audit_logs
**Descrição:** Remove logs de auditoria com mais de 1 ano

**Assinatura:**
```sql
cleanup_old_audit_logs() RETURNS INTEGER
```

**Exemplo:**
```sql
SELECT cleanup_old_audit_logs();
-- Retorna: 1250 (número de logs removidos)
```

---

## Funções de Viagens

### is_trip_participant
**Descrição:** Verifica se usuário é participante de viagem

**Assinatura:**
```sql
is_trip_participant(_user_id UUID, _trip_id UUID) RETURNS BOOLEAN
```

**Exemplo:**
```sql
SELECT is_trip_participant(auth.uid(), 'trip-id');
-- Retorna: true ou false
```

---

### is_trip_member
**Descrição:** Verifica se usuário é membro de viagem (sistema novo)

**Assinatura:**
```sql
is_trip_member(_trip_id UUID, _user_id UUID) RETURNS BOOLEAN
```

**Exemplo:**
```sql
SELECT is_trip_member('trip-id', auth.uid());
-- Retorna: true ou false
```

---

## Funções Auxiliares

### is_family_member
**Descrição:** Verifica se usuário é membro de família

**Assinatura:**
```sql
is_family_member(_user_id UUID, _family_id UUID) RETURNS BOOLEAN
```

**Exemplo:**
```sql
SELECT is_family_member(auth.uid(), 'family-id');
-- Retorna: true ou false
```

---

### get_user_family_id
**Descrição:** Retorna ID da família do usuário

**Assinatura:**
```sql
get_user_family_id(_user_id UUID) RETURNS UUID
```

**Exemplo:**
```sql
SELECT get_user_family_id(auth.uid());
-- Retorna: UUID da família ou NULL
```

---

### delete_installment_series
**Descrição:** Deleta série completa de parcelas

**Assinatura:**
```sql
delete_installment_series(p_series_id UUID) RETURNS TABLE (deleted_count INTEGER)
```

**Exemplo:**
```sql
SELECT * FROM delete_installment_series('series-id');
-- Retorna: número de parcelas deletadas
```

---

## Funções de Teste

### tests.run_all_tests
**Descrição:** Executa todos os testes automatizados

**Assinatura:**
```sql
tests.run_all_tests() RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  error_message TEXT
)
```

**Exemplo:**
```sql
SELECT * FROM tests.run_all_tests();

-- Retorna:
-- test_name                        | status | error_message
-- test_cascade_delete_transaction  | PASSED | NULL
-- test_calculate_account_balance   | PASSED | NULL
-- test_transaction_mirroring       | PASSED | NULL
-- test_soft_delete                 | PASSED | NULL
-- test_audit_log                   | PASSED | NULL
```

---

## Convenções

### Nomenclatura
- Funções de cálculo: `calculate_*`
- Funções de acerto: `settle_*`, `mark_as_*`
- Funções de verificação: `is_*`, `get_*`
- Funções de limpeza: `cleanup_*`, `delete_*`

### Segurança
- Todas as funções críticas usam `SECURITY DEFINER`
- Todas as funções definem `SET search_path = public`
- Verificações de permissão dentro das funções

### Performance
- Funções de cálculo são `STABLE` quando possível
- Índices criados para suportar queries das funções
- Uso de CTEs para queries complexas

