-- Script para corrigir transações compartilhadas sem splits
-- Execute este script no Supabase SQL Editor

-- 1. Verificar transações compartilhadas SEM splits na viagem "Ferias"
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.currency,
  t.trip_id,
  t.user_id,
  (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as splits_count
FROM transactions t
WHERE 
  t.is_shared = true
  AND t.trip_id = '0bb8daa3-c5e8-4e0e-8e0f-8e0f8e0f8e0f' -- ID da viagem Ferias
  AND NOT EXISTS (
    SELECT 1 FROM transaction_splits WHERE transaction_id = t.id
  )
ORDER BY t.date DESC;

-- 2. CORREÇÃO: Criar splits para as transações sem splits
-- Assumindo que as transações foram divididas igualmente entre Fran e Wesley

-- Primeiro, vamos buscar os IDs dos membros
-- Fran: 5c4a4fb5-...
-- Wesley: 7ba0b663-...

-- Para cada transação sem split, vamos criar um split de 50% para o outro membro

-- IMPORTANTE: Substitua os IDs abaixo pelos IDs corretos das suas transações e membros!

-- Exemplo para a transação "uber" ($20 USD)
-- Se Fran (9545d0c1...) pagou, criar split para Wesley
/*
INSERT INTO transaction_splits (
  transaction_id,
  member_id,
  user_id,
  amount,
  is_settled,
  settled_by_debtor,
  settled_by_creditor
) VALUES (
  'ID_DA_TRANSACAO_UBER',
  '7ba0b663-...', -- ID do membro Wesley
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9', -- User ID do Wesley
  10.00, -- Metade de $20
  false,
  false,
  false
);
*/

-- 3. SOLUÇÃO AUTOMÁTICA: Criar splits para TODAS as transações compartilhadas sem splits
-- Este script cria automaticamente splits de 50% para o outro participante da viagem

DO $$
DECLARE
  tx RECORD;
  other_member_id UUID;
  other_user_id UUID;
  split_amount NUMERIC;
BEGIN
  -- Para cada transação compartilhada sem splits na viagem
  FOR tx IN 
    SELECT 
      t.id as tx_id,
      t.amount,
      t.user_id as creator_user_id,
      t.trip_id
    FROM transactions t
    WHERE 
      t.is_shared = true
      AND t.trip_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM transaction_splits WHERE transaction_id = t.id
      )
  LOOP
    -- Encontrar o outro participante da viagem (não o criador)
    SELECT 
      fm.id,
      COALESCE(fm.linked_user_id, fm.user_id) as user_id
    INTO other_member_id, other_user_id
    FROM trip_members tm
    JOIN family_members fm ON (tm.user_id = fm.linked_user_id OR tm.member_id = fm.id)
    WHERE 
      tm.trip_id = tx.trip_id
      AND COALESCE(fm.linked_user_id, fm.user_id) != tx.creator_user_id
    LIMIT 1;
    
    -- Se encontrou o outro membro, criar o split
    IF other_member_id IS NOT NULL THEN
      split_amount := tx.amount / 2; -- Dividir por 2 (50%)
      
      INSERT INTO transaction_splits (
        transaction_id,
        member_id,
        user_id,
        amount,
        is_settled,
        settled_by_debtor,
        settled_by_creditor
      ) VALUES (
        tx.tx_id,
        other_member_id,
        other_user_id,
        split_amount,
        false,
        false,
        false
      );
      
      RAISE NOTICE 'Split criado para transação % - Membro: % - Valor: %', 
        tx.tx_id, other_member_id, split_amount;
    ELSE
      RAISE WARNING 'Outro membro não encontrado para transação %', tx.tx_id;
    END IF;
  END LOOP;
END $$;

-- 4. Verificar se os splits foram criados
SELECT 
  t.id,
  t.description,
  t.date,
  t.amount,
  t.currency,
  t.trip_id,
  t.user_id as creator_user_id,
  s.id as split_id,
  s.member_id,
  s.user_id as split_user_id,
  s.amount as split_amount,
  m.name as member_name
FROM transactions t
LEFT JOIN transaction_splits s ON t.id = s.transaction_id
LEFT JOIN family_members m ON s.member_id = m.id
WHERE 
  t.is_shared = true
  AND t.trip_id IS NOT NULL
ORDER BY t.date DESC, t.id, s.id;
