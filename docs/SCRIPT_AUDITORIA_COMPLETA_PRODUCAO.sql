-- =====================================================
-- SCRIPT DE AUDITORIA COMPLETA DE PRODUÇÃO
-- Data: 31/12/2024
-- Objetivo: Verificar integridade de TODAS as funcionalidades
-- =====================================================

-- ========================================
-- 1. VERIFICAÇÃO DE TABELAS E ESTRUTURA
-- ========================================

SELECT '=== 1. TABELAS DO SISTEMA ===' AS secao;

SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- 2. VERIFICAÇÃO DE CONSTRAINTS E FKs
-- ========================================

SELECT '=== 2. FOREIGN KEYS ===' AS secao;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 3. VERIFICAÇÃO DE UNICIDADE
-- ========================================

SELECT '=== 3. VERIFICAÇÃO DE UNICIDADE ===' AS secao;

-- 3.1 Transações duplicadas (mesmo user, valor, data, descrição)
SELECT 
  'Transações potencialmente duplicadas' AS tipo,
  COUNT(*) AS total
FROM (
  SELECT 
    user_id,
    amount,
    date,
    description,
    COUNT(*) as duplicates
  FROM transactions
  WHERE source_transaction_id IS NULL -- Excluir espelhadas
  GROUP BY user_id, amount, date, description
  HAVING COUNT(*) > 1
) AS dups;

-- 3.2 Contas duplicadas (mesmo user, nome, banco)
SELECT 
  'Contas potencialmente duplicadas' AS tipo,
  COUNT(*) AS total
FROM (
  SELECT 
    user_id,
    name,
    bank_id,
    COUNT(*) as duplicates
  FROM accounts
  GROUP BY user_id, name, bank_id
  HAVING COUNT(*) > 1
) AS dups;

-- ========================================
-- 4. INTEGRIDADE REFERENCIAL
-- ========================================

SELECT '=== 4. INTEGRIDADE REFERENCIAL ===' AS secao;

-- 4.1 Transações sem conta/cartão (quando obrigatório)
SELECT 
  'Transações sem conta/cartão' AS problema,
  COUNT(*) AS total
FROM transactions
WHERE type IN ('EXPENSE', 'INCOME')
  AND account_id IS NULL
  AND type != 'TRANSFER';

-- 4.2 Transações compartilhadas sem splits
SELECT 
  'Transações compartilhadas sem splits' AS problema,
  COUNT(*) AS total
FROM transactions t
WHERE t.is_shared = TRUE
  AND t.source_transaction_id IS NULL -- Apenas originais
  AND NOT EXISTS (
    SELECT 1 FROM transaction_splits ts
    WHERE ts.transaction_id = t.id
  );

-- 4.3 Splits sem user_id preenchido
SELECT 
  'Splits sem user_id' AS problema,
  COUNT(*) AS total
FROM transaction_splits
WHERE user_id IS NULL;

-- 4.4 Transações espelhadas sem source_transaction_id
SELECT 
  'Transações espelhadas órfãs' AS problema,
  COUNT(*) AS total
FROM transactions
WHERE source_transaction_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t2
    WHERE t2.id = transactions.source_transaction_id
  );

-- ========================================
-- 5. VALIDAÇÃO DE VALORES FINANCEIROS
-- ========================================

SELECT '=== 5. VALIDAÇÃO FINANCEIRA ===' AS secao;

-- 5.1 Transações com valor zero ou negativo
SELECT 
  'Transações com valor inválido' AS problema,
  COUNT(*) AS total
FROM transactions
WHERE amount <= 0;

-- 5.2 Splits com soma diferente do total
WITH split_sums AS (
  SELECT 
    t.id,
    t.amount AS transaction_amount,
    COALESCE(SUM(ts.amount), 0) AS splits_sum,
    ABS(t.amount - COALESCE(SUM(ts.amount), 0)) AS difference
  FROM transactions t
  LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
  WHERE t.is_shared = TRUE
    AND t.source_transaction_id IS NULL
  GROUP BY t.id, t.amount
)
SELECT 
  'Splits com soma incorreta (diferença > 0.02)' AS problema,
  COUNT(*) AS total,
  SUM(difference) AS diferenca_total
FROM split_sums
WHERE difference > 0.02;

-- 5.3 Saldos de contas inconsistentes
SELECT 
  'Contas com saldo inconsistente' AS problema,
  COUNT(*) AS total
FROM accounts a
WHERE a.balance != (
  SELECT COALESCE(SUM(
    CASE 
      WHEN t.type = 'INCOME' THEN t.amount
      WHEN t.type = 'EXPENSE' THEN -t.amount
      WHEN t.type = 'TRANSFER' AND t.account_id = a.id THEN -t.amount
      WHEN t.type = 'TRANSFER' AND t.destination_account_id = a.id THEN t.amount
      ELSE 0
    END
  ), 0)
  FROM transactions t
  WHERE (t.account_id = a.id OR t.destination_account_id = a.id)
    AND t.date <= CURRENT_DATE
);

-- ========================================
-- 6. SISTEMA DE COMPARTILHAMENTO
-- ========================================

SELECT '=== 6. SISTEMA DE COMPARTILHAMENTO ===' AS secao;

-- 6.1 Verificar espelhamento correto
SELECT 
  'Splits sem transação espelhada' AS problema,
  COUNT(*) AS total
FROM transaction_splits ts
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.source_transaction_id = ts.transaction_id
    AND t.user_id = ts.user_id
);

-- 6.2 Ledger entries sem transação
SELECT 
  'Ledger entries órfãs' AS problema,
  COUNT(*) AS total
FROM financial_ledger fl
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.id = fl.transaction_id
);

-- 6.3 Verificar consistência do ledger
WITH ledger_balance AS (
  SELECT 
    user_id,
    related_user_id,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS total_credits
  FROM financial_ledger
  WHERE is_settled = FALSE
  GROUP BY user_id, related_user_id
)
SELECT 
  'Pares de usuários com ledger inconsistente' AS problema,
  COUNT(*) AS total
FROM ledger_balance lb1
WHERE EXISTS (
  SELECT 1 FROM ledger_balance lb2
  WHERE lb2.user_id = lb1.related_user_id
    AND lb2.related_user_id = lb1.user_id
    AND ABS((lb1.total_debits - lb1.total_credits) + (lb2.total_debits - lb2.total_credits)) > 0.02
);

-- ========================================
-- 7. SISTEMA DE VIAGENS
-- ========================================

SELECT '=== 7. SISTEMA DE VIAGENS ===' AS secao;

-- 7.1 Viagens sem owner como membro
SELECT 
  'Viagens sem owner nos membros' AS problema,
  COUNT(*) AS total
FROM trips t
WHERE NOT EXISTS (
  SELECT 1 FROM trip_members tm
  WHERE tm.trip_id = t.id
    AND tm.user_id = t.owner_id
);

-- 7.2 Transações de viagem sem trip_id
SELECT 
  'Transações com domain=TRAVEL sem trip_id' AS problema,
  COUNT(*) AS total
FROM transactions
WHERE domain = 'TRAVEL'
  AND trip_id IS NULL;

-- 7.3 Convites pendentes antigos (> 30 dias)
SELECT 
  'Convites de viagem pendentes > 30 dias' AS problema,
  COUNT(*) AS total
FROM trip_invitations
WHERE status = 'PENDING'
  AND created_at < NOW() - INTERVAL '30 days';

-- ========================================
-- 8. SISTEMA DE FAMÍLIA
-- ========================================

SELECT '=== 8. SISTEMA DE FAMÍLIA ===' AS secao;

-- 8.1 Membros sem linked_user_id
SELECT 
  'Membros de família sem linked_user_id' AS problema,
  COUNT(*) AS total
FROM family_members
WHERE linked_user_id IS NULL;

-- 8.2 Famílias sem membros ativos
SELECT 
  'Famílias sem membros ativos' AS problema,
  COUNT(*) AS total
FROM families f
WHERE NOT EXISTS (
  SELECT 1 FROM family_members fm
  WHERE fm.family_id = f.id
    AND fm.is_active = TRUE
);

-- 8.3 Convites de família pendentes antigos
SELECT 
  'Convites de família pendentes > 30 dias' AS problema,
  COUNT(*) AS total
FROM family_invitations
WHERE status = 'PENDING'
  AND created_at < NOW() - INTERVAL '30 days';

-- ========================================
-- 9. PARCELAMENTOS
-- ========================================

SELECT '=== 9. PARCELAMENTOS ===' AS secao;

-- 9.1 Séries de parcelas incompletas
WITH series_info AS (
  SELECT 
    series_id,
    MAX(total_installments) AS expected_total,
    COUNT(*) AS actual_count
  FROM transactions
  WHERE series_id IS NOT NULL
  GROUP BY series_id
)
SELECT 
  'Séries de parcelas incompletas' AS problema,
  COUNT(*) AS total
FROM series_info
WHERE expected_total != actual_count;

-- 9.2 Parcelas com valores inconsistentes
WITH installment_values AS (
  SELECT 
    series_id,
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    ABS(MAX(amount) - MIN(amount)) AS difference
  FROM transactions
  WHERE series_id IS NOT NULL
  GROUP BY series_id
)
SELECT 
  'Séries com valores inconsistentes (diferença > 0.02)' AS problema,
  COUNT(*) AS total
FROM installment_values
WHERE difference > 0.02;

-- ========================================
-- 10. CONTAS E CARTÕES
-- ========================================

SELECT '=== 10. CONTAS E CARTÕES ===' AS secao;

-- 10.1 Cartões sem due_day
SELECT 
  'Cartões de crédito sem dia de vencimento' AS problema,
  COUNT(*) AS total
FROM accounts
WHERE type = 'CREDIT_CARD'
  AND due_day IS NULL;

-- 10.2 Contas internacionais sem currency
SELECT 
  'Contas internacionais sem moeda' AS problema,
  COUNT(*) AS total
FROM accounts
WHERE is_international = TRUE
  AND currency IS NULL;

-- ========================================
-- 11. TRIGGERS E FUNCTIONS
-- ========================================

SELECT '=== 11. TRIGGERS E FUNCTIONS ===' AS secao;

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 12. RLS POLICIES
-- ========================================

SELECT '=== 12. RLS POLICIES ===' AS secao;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 13. ESTATÍSTICAS GERAIS
-- ========================================

SELECT '=== 13. ESTATÍSTICAS GERAIS ===' AS secao;

SELECT 'Total de usuários' AS metrica, COUNT(*) AS valor FROM profiles
UNION ALL
SELECT 'Total de transações', COUNT(*) FROM transactions
UNION ALL
SELECT 'Transações compartilhadas', COUNT(*) FROM transactions WHERE is_shared = TRUE
UNION ALL
SELECT 'Transações espelhadas', COUNT(*) FROM transactions WHERE source_transaction_id IS NOT NULL
UNION ALL
SELECT 'Total de contas', COUNT(*) FROM accounts
UNION ALL
SELECT 'Cartões de crédito', COUNT(*) FROM accounts WHERE type = 'CREDIT_CARD'
UNION ALL
SELECT 'Contas internacionais', COUNT(*) FROM accounts WHERE is_international = TRUE
UNION ALL
SELECT 'Total de famílias', COUNT(*) FROM families
UNION ALL
SELECT 'Membros de família', COUNT(*) FROM family_members
UNION ALL
SELECT 'Total de viagens', COUNT(*) FROM trips
UNION ALL
SELECT 'Membros de viagens', COUNT(*) FROM trip_members
UNION ALL
SELECT 'Splits de transações', COUNT(*) FROM transaction_splits
UNION ALL
SELECT 'Entradas no ledger', COUNT(*) FROM financial_ledger
UNION ALL
SELECT 'Notificações', COUNT(*) FROM notifications;

-- ========================================
-- 14. VERIFICAÇÃO DE COMPETENCE_DATE
-- ========================================

SELECT '=== 14. COMPETENCE_DATE ===' AS secao;

-- 14.1 Transações sem competence_date
SELECT 
  'Transações sem competence_date' AS problema,
  COUNT(*) AS total
FROM transactions
WHERE competence_date IS NULL;

-- 14.2 Transações com competence_date inválido (não é dia 1)
SELECT 
  'Transações com competence_date inválido' AS problema,
  COUNT(*) AS total
FROM transactions
WHERE EXTRACT(DAY FROM competence_date::date) != 1;

-- ========================================
-- 15. RESUMO DE PROBLEMAS CRÍTICOS
-- ========================================

SELECT '=== 15. RESUMO DE PROBLEMAS CRÍTICOS ===' AS secao;

WITH problemas AS (
  SELECT 'Transações sem conta' AS problema, COUNT(*) AS total
  FROM transactions
  WHERE type IN ('EXPENSE', 'INCOME') AND account_id IS NULL AND type != 'TRANSFER'
  
  UNION ALL
  
  SELECT 'Transações compartilhadas sem splits', COUNT(*)
  FROM transactions t
  WHERE t.is_shared = TRUE AND t.source_transaction_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
  
  UNION ALL
  
  SELECT 'Splits sem user_id', COUNT(*)
  FROM transaction_splits WHERE user_id IS NULL
  
  UNION ALL
  
  SELECT 'Transações com valor inválido', COUNT(*)
  FROM transactions WHERE amount <= 0
  
  UNION ALL
  
  SELECT 'Viagens sem owner nos membros', COUNT(*)
  FROM trips t
  WHERE NOT EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = t.id AND tm.user_id = t.owner_id)
)
SELECT 
  problema,
  total,
  CASE 
    WHEN total = 0 THEN '✅ OK'
    WHEN total < 5 THEN '⚠️ ATENÇÃO'
    ELSE '❌ CRÍTICO'
  END AS status
FROM problemas
ORDER BY total DESC;

-- ========================================
-- FIM DA AUDITORIA
-- ========================================

SELECT '=== AUDITORIA COMPLETA FINALIZADA ===' AS resultado;
