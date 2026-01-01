-- =====================================================
-- CORREÇÃO: Função de espelhamento - payer_id
-- =====================================================
-- Problema: payer_id usa user_id em vez de member_id
-- Solução: Buscar member_id do pagador na família do membro
-- =====================================================

CREATE OR REPLACE FUNCTION create_transaction_mirrors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_transaction transactions%ROWTYPE;
  member_record family_members%ROWTYPE;
  member_user_id uuid;
  payer_member_id uuid;
BEGIN
  -- Buscar transação original
  SELECT * INTO original_transaction
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  -- Se não é compartilhada, não fazer nada
  IF NOT original_transaction.is_shared THEN
    RETURN NEW;
  END IF;
  
  -- Buscar membro da família
  SELECT * INTO member_record
  FROM family_members
  WHERE id = NEW.member_id;
  
  -- Determinar user_id do membro
  member_user_id := COALESCE(member_record.user_id, member_record.linked_user_id);
  
  -- Se membro não tem user_id, não criar espelho
  IF member_user_id IS NULL THEN
    RAISE NOTICE 'Membro % não tem user_id vinculado', NEW.member_id;
    RETURN NEW;
  END IF;
  
  -- Se o membro é o próprio criador, não criar espelho
  IF member_user_id = original_transaction.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se espelho já existe
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE source_transaction_id = NEW.transaction_id
    AND user_id = member_user_id
  ) THEN
    RAISE NOTICE 'Espelho já existe para transação % e usuário %', NEW.transaction_id, member_user_id;
    RETURN NEW;
  END IF;
  
  -- Buscar member_id do pagador na família do membro
  -- O pagador é o criador da transação original
  SELECT id INTO payer_member_id
  FROM family_members
  WHERE family_id = member_record.family_id
  AND (user_id = original_transaction.user_id OR linked_user_id = original_transaction.user_id)
  LIMIT 1;
  
  -- Se não encontrou, deixar NULL
  IF payer_member_id IS NULL THEN
    RAISE NOTICE 'Pagador não encontrado como membro da família %', member_record.family_id;
  END IF;
  
  -- Criar transação espelhada
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    trip_id,
    amount,
    description,
    date,
    type,
    domain,
    is_shared,
    payer_id,
    source_transaction_id,
    is_installment,
    current_installment,
    total_installments,
    series_id,
    notes,
    created_at,
    updated_at
  ) VALUES (
    member_user_id,                           -- user_id do membro
    NULL,                                      -- account_id (espelho não tem conta)
    original_transaction.category_id,
    original_transaction.trip_id,
    NEW.amount,                                -- valor do split
    original_transaction.description,
    original_transaction.date,
    original_transaction.type,
    original_transaction.domain,
    true,                                      -- is_shared
    payer_member_id,                           -- payer_id (member_id do pagador)
    NEW.transaction_id,                        -- source_transaction_id
    original_transaction.is_installment,
    original_transaction.current_installment,
    original_transaction.total_installments,
    original_transaction.series_id,
    'Espelho de transação compartilhada',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Espelho criado: transação % para usuário %', NEW.transaction_id, member_user_id;
  
  RETURN NEW;
END;
$$;;
