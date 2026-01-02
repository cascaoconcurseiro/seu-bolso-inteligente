-- Corrigir função create_transaction_mirrors
CREATE OR REPLACE FUNCTION public.create_transaction_mirrors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  -- CORREÇÃO: Usar linked_user_id (pessoa real) ao invés de user_id (dono da lista)
  member_user_id := member_record.linked_user_id;
  
  -- Se membro não tem linked_user_id, não criar espelho
  IF member_user_id IS NULL THEN
    RAISE NOTICE 'Membro % não tem linked_user_id vinculado', NEW.member_id;
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
  WHERE user_id = member_user_id  -- Membros da família do destinatário
  AND linked_user_id = original_transaction.user_id  -- Que apontam para o pagador
  LIMIT 1;
  
  -- Se não encontrou, deixar NULL
  IF payer_member_id IS NULL THEN
    RAISE NOTICE 'Pagador não encontrado como membro para usuário %', member_user_id;
  END IF;
  
  -- Criar transação espelhada
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    category,
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
    created_by,
    created_at,
    updated_at
  ) VALUES (
    member_user_id,                           -- user_id do membro (pessoa real)
    NULL,                                      -- account_id (espelho não tem conta)
    original_transaction.category_id,
    original_transaction.category,
    original_transaction.trip_id,
    NEW.amount,                                -- valor do split
    original_transaction.description || ' (Compartilhado por ' || (SELECT name FROM family_members WHERE id = payer_member_id LIMIT 1) || ')',
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
    original_transaction.user_id,              -- created_by (quem criou a original)
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Espelho criado: transação % para usuário %', NEW.transaction_id, member_user_id;
  
  RETURN NEW;
END;
$function$;;
