-- Script para limpar transações indesejadas e investigar problema
-- Execute no Supabase SQL Editor

-- 1. Ver todas as transações compartilhadas da viagem "Ferias"
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.currency,
  t.user_id,
  t.trip_id,
  t.is_shared,
  (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as splits_count
FROM transactions t
WHERE t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
ORDER BY t.date DESC, t.description;

-- 2. Ver splits da transação "maria" de $5
SELECT 
  s.*,
  t.description,
  t.amount as tx_amount,
  t.user_id as tx_user_id,
  m.name as member_name
FROM transaction_splits s
JOIN transactions t ON s.transaction_id = t.id
LEFT JOIN family_members m ON s.member_id = m.id
WHERE t.description = 'maria'
  AND t.amount = 5
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f';

-- 3. DELETAR transações que NÃO deveriam estar na viagem
-- (uber, almoço, dez, maria de $10 - criadas por Fran sem splits)
DELETE FROM transactions
WHERE trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
  AND user_id = '9545d0c1-4e0e-8e0f-8e0f-8e0f8e0f8e0f' -- Fran
  AND description IN ('uber', 'almço', 'dez', 'maria')
  AND amount IN (20, 30, 10, 10);

-- 4. Verificar o que sobrou
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.currency,
  t.user_id,
  (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as splits_count
FROM transactions t
WHERE t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
ORDER BY t.date DESC;

-- 5. Ver membros da família para entender o problema
SELECT 
  id,
  name,
  user_id,
  linked_user_id
FROM family_members
ORDER BY name;

-- 6. Ver participantes da viagem
SELECT 
  tm.*,
  t.name as trip_name,
  fm.name as member_name
FROM trip_members tm
JOIN trips t ON tm.trip_id = t.id
LEFT JOIN family_members fm ON tm.member_id = fm.id
WHERE tm.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f';
