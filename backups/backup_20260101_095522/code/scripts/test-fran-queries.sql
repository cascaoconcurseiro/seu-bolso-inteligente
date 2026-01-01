-- Script de teste: Simular exatamente as queries do frontend para a Fran
-- User ID da Fran: 9545d0c1-94be-4b69-b110-f939bce072ee
-- User ID do Wesley: 56ccd60b-641f-4265-bc17-7b8705a2f8c9

-- ============================================
-- QUERY 1: transactionsWithSplits
-- ============================================
SELECT 
  'QUERY 1: transactionsWithSplits' as query_name,
  t.id,
  t.description,
  t.amount,
  t.type,
  t.date,
  t.is_shared,
  t.source_transaction_id,
  json_agg(
    json_build_object(
      'id', ts.id,
      'member_id', ts.member_id,
      'user_id', ts.user_id,
      'name', ts.name,
      'amount', ts.amount,
      'is_settled', ts.is_settled
    )
  ) FILTER (WHERE ts.id IS NOT NULL) as splits
FROM transactions t
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
WHERE t.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
AND t.is_shared = true
AND t.source_transaction_id IS NULL
GROUP BY t.id, t.description, t.amount, t.type, t.date, t.is_shared, t.source_transaction_id
ORDER BY t.date DESC;

-- ============================================
-- QUERY 2: mirrorTransactions (PRIMEIRA PARTE)
-- ============================================
SELECT 
  'QUERY 2a: mirrorTransactions (mirrors)' as query_name,
  t.id,
  t.description,
  t.amount,
  t.type,
  t.date,
  t.is_shared,
  t.source_transaction_id,
  t.is_settled,
  t.current_installment,
  t.total_installments,
  t.trip_id
FROM transactions t
WHERE t.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
AND t.is_shared = true
AND t.source_transaction_id IS NOT NULL
ORDER BY t.date DESC;

-- ============================================
-- QUERY 2b: mirrorTransactions (SEGUNDA PARTE - sources)
-- ============================================
WITH mirror_ids AS (
  SELECT source_transaction_id
  FROM transactions
  WHERE user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND is_shared = true
  AND source_transaction_id IS NOT NULL
)
SELECT 
  'QUERY 2b: mirrorTransactions (sources)' as query_name,
  t.id,
  t.user_id,
  t.description
FROM transactions t
WHERE t.id IN (SELECT source_transaction_id FROM mirror_ids);

-- ============================================
-- QUERY 3: useFamilyMembers
-- ============================================
SELECT 
  'QUERY 3: useFamilyMembers' as query_name,
  fm.id,
  fm.name,
  fm.user_id,
  fm.linked_user_id,
  fm.email,
  fm.role,
  fm.status
FROM family_members fm
WHERE fm.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
ORDER BY fm.name;

-- ============================================
-- TESTE COMPLETO: Simular o processamento do useSharedFinances
-- ============================================
WITH 
-- Mirrors da Fran
fran_mirrors AS (
  SELECT 
    t.id,
    t.description,
    t.amount,
    t.type,
    t.date,
    t.source_transaction_id,
    t.is_settled,
    t.current_installment,
    t.total_installments,
    t.trip_id
  FROM transactions t
  WHERE t.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND t.is_shared = true
  AND t.source_transaction_id IS NOT NULL
),
-- Source transactions
source_txs AS (
  SELECT 
    t.id,
    t.user_id
  FROM transactions t
  WHERE t.id IN (SELECT source_transaction_id FROM fran_mirrors)
),
-- Membros da família
family_members_data AS (
  SELECT 
    fm.id,
    fm.name,
    fm.user_id,
    fm.linked_user_id
  FROM family_members fm
  WHERE fm.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
)
SELECT 
  'TESTE COMPLETO' as teste,
  fm.id as mirror_id,
  fm.description,
  fm.amount,
  st.user_id as payer_user_id,
  fmd.id as member_id,
  fmd.name as member_name,
  CASE 
    WHEN st.user_id IS NULL THEN 'ERROR: source_user_id is NULL'
    WHEN fmd.id IS NULL THEN 'ERROR: member not found'
    ELSE 'OK'
  END as status
FROM fran_mirrors fm
LEFT JOIN source_txs st ON st.id = fm.source_transaction_id
LEFT JOIN family_members_data fmd ON (fmd.user_id = st.user_id OR fmd.linked_user_id = st.user_id)
ORDER BY fm.description;
