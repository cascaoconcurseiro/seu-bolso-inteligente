-- Script SIMPLES para corrigir transações compartilhadas sem splits
-- Execute este script no Supabase SQL Editor

-- PASSO 1: Identificar as transações sem splits
SELECT 
  t.id,
  t.description,
  t.amount,
  t.user_id as criador_user_id
FROM transactions t
WHERE 
  t.is_shared = true
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f' -- Viagem Ferias
  AND NOT EXISTS (
    SELECT 1 FROM transaction_splits WHERE transaction_id = t.id
  );

-- PASSO 2: Buscar IDs dos membros
SELECT 
  id as member_id,
  name,
  linked_user_id
FROM family_members
WHERE name IN ('Fran', 'Wesley');

-- PASSO 3: Criar splits manualmente
-- Substitua os IDs abaixo pelos IDs corretos!

-- Para "uber" ($20) - Fran pagou, Wesley deve
INSERT INTO transaction_splits (
  transaction_id,
  member_id, -- ID do membro Wesley
  user_id, -- User ID do Wesley (56ccd60b-641f-4265-bc17-7b8705a2f8c9)
  amount,
  is_settled,
  settled_by_debtor,
  settled_by_creditor
)
SELECT 
  t.id as transaction_id,
  '7ba0b663-...' as member_id, -- SUBSTITUA pelo ID completo do membro Wesley
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9' as user_id,
  t.amount / 2 as amount,
  false,
  false,
  false
FROM transactions t
WHERE t.description = 'uber'
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
  AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id);

-- Para "almoço" ($30) - Fran pagou, Wesley deve
INSERT INTO transaction_splits (
  transaction_id,
  member_id,
  user_id,
  amount,
  is_settled,
  settled_by_debtor,
  settled_by_creditor
)
SELECT 
  t.id as transaction_id,
  '7ba0b663-...' as member_id, -- SUBSTITUA pelo ID completo do membro Wesley
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9' as user_id,
  t.amount / 2 as amount,
  false,
  false,
  false
FROM transactions t
WHERE t.description = 'almço'
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
  AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id);

-- Para "dez" ($10) - Fran pagou, Wesley deve
INSERT INTO transaction_splits (
  transaction_id,
  member_id,
  user_id,
  amount,
  is_settled,
  settled_by_debtor,
  settled_by_creditor
)
SELECT 
  t.id as transaction_id,
  '7ba0b663-...' as member_id, -- SUBSTITUA pelo ID completo do membro Wesley
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9' as user_id,
  t.amount / 2 as amount,
  false,
  false,
  false
FROM transactions t
WHERE t.description = 'dez'
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
  AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id);

-- Para "maria" ($10) - Fran pagou, Wesley deve
INSERT INTO transaction_splits (
  transaction_id,
  member_id,
  user_id,
  amount,
  is_settled,
  settled_by_debtor,
  settled_by_creditor
)
SELECT 
  t.id as transaction_id,
  '7ba0b663-...' as member_id, -- SUBSTITUA pelo ID completo do membro Wesley
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9' as user_id,
  t.amount / 2 as amount,
  false,
  false,
  false
FROM transactions t
WHERE t.description = 'maria'
  AND t.user_id = '9545d0c1-...' -- Fran's user ID
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
  AND NOT EXISTS (SELECT 1 FROM transaction_splits WHERE transaction_id = t.id);

-- PASSO 4: Verificar se funcionou
SELECT 
  t.description,
  t.amount as total,
  s.amount as split_amount,
  m.name as devedor
FROM transactions t
JOIN transaction_splits s ON t.id = s.transaction_id
JOIN family_members m ON s.member_id = m.id
WHERE t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f'
ORDER BY t.date DESC;
