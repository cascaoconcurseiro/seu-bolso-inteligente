-- Recriar transação espelhada para Fran
-- Baseado na função create_mirrored_transaction_for_split()

DO $$
DECLARE
  v_split_id uuid := '46db4140-5bda-429d-887f-0412198be2cf';
  v_transaction_id uuid := '8b752657-60cd-4654-8783-a6fc2d84d52f';
  v_member_id uuid := '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab';
  v_user_id uuid := '9545d0c1-94be-4b69-b110-f939bce072ee';
  v_amount numeric := 50.00;
  
  v_original_tx RECORD;
  v_mirror_tx_id uuid;
BEGIN
  -- Buscar dados da transação original
  SELECT * INTO v_original_tx
  FROM public.transactions
  WHERE id = v_transaction_id;
  
  -- Verificar se já existe mirror
  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE source_transaction_id = v_transaction_id
      AND user_id = v_user_id
  ) THEN
    RAISE NOTICE 'Mirror já existe para user_id %', v_user_id;
    RETURN;
  END IF;
  
  -- Criar transação espelhada
  INSERT INTO public.transactions (
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
    source_transaction_id,
    currency,
    competence_date,
    creator_user_id,
    is_mirror
  ) VALUES (
    v_user_id,
    v_original_tx.account_id,
    v_original_tx.category_id,
    v_original_tx.trip_id,
    v_amount,
    v_original_tx.description,
    v_original_tx.date,
    v_original_tx.type,
    v_original_tx.domain,
    true,
    v_transaction_id,
    v_original_tx.currency,
    v_original_tx.competence_date,
    v_original_tx.user_id,
    true
  ) RETURNING id INTO v_mirror_tx_id;
  
  RAISE NOTICE 'Mirror criado: % para user %', v_mirror_tx_id, v_user_id;
END $$;;
