-- Script de teste: Verificar se a Fran consegue ver as source transactions
-- Executar como Fran (9545d0c1-94be-4b69-b110-f939bce072ee)

-- 1. Ver mirror transactions da Fran
SELECT 
  id,
  description,
  amount,
  user_id,
  source_transaction_id,
  is_shared
FROM transactions
WHERE user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
AND is_shared = true
AND source_transaction_id IS NOT NULL
ORDER BY date DESC;

-- 2. Ver source transactions (as que o Wesley criou)
SELECT 
  t.id,
  t.description,
  t.amount,
  t.user_id,
  t.is_shared
FROM transactions t
WHERE t.id IN (
  SELECT source_transaction_id 
  FROM transactions 
  WHERE user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND source_transaction_id IS NOT NULL
);

-- 3. Testar se a Fran pode ver as transações do Wesley via RLS
-- (simular o que acontece no frontend)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "9545d0c1-94be-4b69-b110-f939bce072ee"}';

SELECT 
  t.id,
  t.description,
  t.user_id
FROM transactions t
WHERE t.id IN (
  'fc35bd29-0d0b-4cf0-9c5e-fda33b364b58',  -- testar
  'b63f407b-6388-43fa-9742-9717ba274919',  -- teste compartilhado
  '12737d3e-dee7-484d-a38d-26979251cf19'   -- Almoço Compartilhado
);

-- 4. Verificar se a família está configurada corretamente
SELECT 
  fm.id,
  fm.name,
  fm.user_id,
  fm.linked_user_id,
  f.owner_id
FROM family_members fm
JOIN families f ON f.id = fm.family_id
WHERE fm.user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
OR fm.linked_user_id = '9545d0c1-94be-4b69-b110-f939bce072ee';
