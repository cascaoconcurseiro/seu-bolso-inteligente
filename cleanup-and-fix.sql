-- Script para limpar transações indesejadas e investigar problema
-- Execute no Supabase SQL Editor

-- RESULTADO DA LIMPEZA:
-- ✅ Deletadas 4 transações sem splits:
--    - uber ($20)
--    - almoço ($30)
--    - dez ($10)
--    - maria ($5 by Wesley)
--
-- ✅ Mantida 1 transação com split:
--    - maria ($10 by Fran) com 1 split para Wesley

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
WHERE t.trip_id = '0bb8daa3-2abc-413e-9983-38588edab203'
ORDER BY t.date DESC, t.description;

-- 2. Ver splits da transação "maria" de $10
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
  AND t.amount = 10
  AND t.trip_id = '0bb8daa3-2abc-413e-9983-38588edab203';

-- 3. Ver membros da família
SELECT 
  id,
  name,
  user_id,
  linked_user_id
FROM family_members
ORDER BY name;

-- 4. Ver participantes da viagem
SELECT 
  tm.*,
  t.name as trip_name,
  fm.name as member_name
FROM trip_members tm
JOIN trips t ON tm.trip_id = t.id
LEFT JOIN family_members fm ON tm.member_id = fm.id
WHERE tm.trip_id = '0bb8daa3-2abc-413e-9983-38588edab203';
