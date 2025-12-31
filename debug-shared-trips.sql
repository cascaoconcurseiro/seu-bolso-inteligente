-- Script de diagnóstico para transações compartilhadas em viagens
-- Execute este script no Supabase SQL Editor

-- 1. Verificar todas as viagens
SELECT 
  id,
  name,
  destination,
  start_date,
  end_date,
  currency,
  owner_id
FROM trips
ORDER BY created_at DESC;

-- 2. Verificar transações compartilhadas (is_shared = true)
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.currency,
  t.is_shared,
  t.trip_id,
  t.user_id,
  t.payer_id,
  t.type,
  t.domain,
  u.email as creator_email
FROM transactions t
LEFT JOIN auth.users u ON t.user_id = u.id
WHERE t.is_shared = true
ORDER BY t.date DESC;

-- 3. Verificar splits de transações compartilhadas
SELECT 
  s.id as split_id,
  s.transaction_id,
  s.amount as split_amount,
  s.member_id,
  s.user_id as split_user_id,
  s.is_settled,
  s.settled_by_debtor,
  s.settled_by_creditor,
  t.description,
  t.amount as total_amount,
  t.trip_id,
  t.user_id as tx_creator_id,
  m.name as member_name
FROM transaction_splits s
JOIN transactions t ON s.transaction_id = t.id
LEFT JOIN family_members m ON s.member_id = m.id
WHERE t.is_shared = true
ORDER BY t.date DESC, s.id;

-- 4. Verificar membros da família
SELECT 
  id,
  name,
  user_id,
  linked_user_id,
  sharing_scope
FROM family_members
ORDER BY name;

-- 5. Verificar participantes de viagens
SELECT 
  tm.id,
  tm.trip_id,
  tm.user_id,
  tm.member_id,
  t.name as trip_name,
  u.email as user_email,
  m.name as member_name
FROM trip_members tm
JOIN trips t ON tm.trip_id = t.id
LEFT JOIN auth.users u ON tm.user_id = u.id
LEFT JOIN family_members m ON tm.member_id = m.id
ORDER BY t.name, tm.id;

-- 6. DIAGNÓSTICO ESPECÍFICO: Transações que DEVERIAM aparecer na viagem
-- Buscar transações compartilhadas com descrições específicas
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.currency,
  t.trip_id,
  t.is_shared,
  t.user_id,
  t.payer_id,
  CASE 
    WHEN t.trip_id IS NULL THEN '❌ SEM TRIP_ID'
    ELSE '✅ COM TRIP_ID'
  END as status,
  (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as splits_count
FROM transactions t
WHERE 
  t.is_shared = true
  AND (
    t.description ILIKE '%uber%' OR
    t.description ILIKE '%almoço%' OR
    t.description ILIKE '%dez%' OR
    t.description ILIKE '%maria%'
  )
ORDER BY t.date DESC;

-- 7. Verificar se há transações espelho (source_transaction_id)
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.trip_id,
  t.source_transaction_id,
  t.user_id,
  'ESPELHO' as tipo
FROM transactions t
WHERE t.source_transaction_id IS NOT NULL
  AND t.trip_id IS NOT NULL
ORDER BY t.date DESC;
