-- Debug: Verificar estrutura das transações compartilhadas
-- Execute no Supabase SQL Editor

-- 1. Ver transações de Wesley em fevereiro
SELECT 
  id,
  description,
  user_id,
  creator_user_id,
  payer_id,
  is_shared,
  source_transaction_id,
  type,
  amount,
  date,
  competence_date
FROM transactions
WHERE user_id = 'SEU_USER_ID_AQUI' -- Substitua pelo ID do Wesley
  AND competence_date >= '2025-02-01'
  AND competence_date <= '2025-02-28'
ORDER BY date DESC;

-- 2. Ver quem é o creator_user_id dessas transações
SELECT 
  t.id,
  t.description,
  t.user_id,
  t.creator_user_id,
  u.email as creator_email,
  t.is_shared,
  t.source_transaction_id
FROM transactions t
LEFT JOIN auth.users u ON u.id = t.creator_user_id
WHERE t.user_id = 'SEU_USER_ID_AQUI' -- Substitua pelo ID do Wesley
  AND t.competence_date >= '2025-02-01'
  AND t.competence_date <= '2025-02-28'
ORDER BY t.date DESC;

-- 3. Verificar se são mirrors (source_transaction_id não null)
SELECT 
  id,
  description,
  source_transaction_id,
  is_shared,
  creator_user_id
FROM transactions
WHERE user_id = 'SEU_USER_ID_AQUI' -- Substitua pelo ID do Wesley
  AND competence_date >= '2025-02-01'
  AND competence_date <= '2025-02-28'
  AND source_transaction_id IS NOT NULL;
