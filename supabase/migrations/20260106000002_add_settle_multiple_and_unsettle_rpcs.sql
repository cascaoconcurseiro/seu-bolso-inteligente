-- RPC functions for atomic settlement operations
-- settle_multiple_splits: Settle multiple splits in a single transaction
-- unsettle_split: Revert a single settlement
-- unsettle_multiple_splits: Revert multiple settlements in a single transaction

-- Function to settle multiple splits atomically
CREATE OR REPLACE FUNCTION settle_multiple_splits(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_payment_tx_id UUID;
  v_settled_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum split fornecido para liquidação.'
    );
  END IF;
  
  -- Calculate total amount and validate all splits
  FOREACH v_split_id IN ARRAY p_split_ids
  LOOP
    SELECT * INTO v_split
    FROM transaction_splits
    WHERE id = v_split_id;
    
    IF v_split IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não encontrado.'
      );
    END IF;
    
    IF v_split.is_settled THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' já foi liquidado.'
      );
    END IF;
    
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;
  
  -- Create single payment transaction for all splits
  INSERT INTO transactions (
    user_id,
    account_id,
    amount,
    type,
    description,
    date,
    domain,
    is_shared,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_account_id,
    v_total_amount,
    'INCOME'::transaction_type,
    'Ressarcimento de ' || array_length(p_split_ids, 1) || ' despesa(s) compartilhada(s)',
    CURRENT_DATE,
    'PERSONAL'::transaction_domain,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_tx_id;
  
  -- Update all splits to mark as settled
  UPDATE transaction_splits
  SET 
    is_settled = true,
    settled_at = NOW(),
    settled_transaction_id = v_payment_tx_id
  WHERE id = ANY(p_split_ids);
  
  GET DIAGNOSTICS v_settled_count = ROW_COUNT;
  
  -- Update account balance
  UPDATE accounts
  SET balance = balance + v_total_amount
  WHERE id = p_account_id;
  
  -- Return success
  v_result := json_build_object(
    'success', true,
    'transaction_id', v_payment_tx_id,
    'settled_count', v_settled_count,
    'total_amount', v_total_amount,
    'settled_at', NOW()
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

-- Function to unsettle a single split (revert settlement)
CREATE OR REPLACE FUNCTION unsettle_split(
  p_split_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split RECORD;
  v_payment_tx_id UUID;
  v_amount NUMERIC;
  v_account_id UUID;
  v_result JSON;
BEGIN
  -- Get split details
  SELECT * INTO v_split
  FROM transaction_splits
  WHERE id = p_split_id;
  
  IF v_split IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Split não encontrado.'
    );
  END IF;
  
  IF NOT v_split.is_settled THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este split não foi liquidado.'
    );
  END IF;
  
  -- Store values for later use
  v_payment_tx_id := v_split.settled_transaction_id;
  v_amount := v_split.amount;
  
  -- Get account_id from the payment transaction
  SELECT account_id INTO v_account_id
  FROM transactions
  WHERE id = v_payment_tx_id;
  
  -- Mark split as not settled
  UPDATE transaction_splits
  SET 
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL
  WHERE id = p_split_id;
  
  -- Delete the payment transaction
  DELETE FROM transactions
  WHERE id = v_payment_tx_id;
  
  -- Revert account balance
  UPDATE accounts
  SET balance = balance - v_amount
  WHERE id = v_account_id;
  
  -- Return success
  v_result := json_build_object(
    'success', true,
    'split_id', p_split_id,
    'reverted_amount', v_amount,
    'reverted_at', NOW()
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

-- Function to unsettle multiple splits atomically
CREATE OR REPLACE FUNCTION unsettle_multiple_splits(
  p_split_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_reverted_count INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_payment_tx_ids UUID[] := ARRAY[]::UUID[];
  v_account_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum split fornecido para reversão.'
    );
  END IF;
  
  -- Collect payment transaction IDs and validate all splits
  FOREACH v_split_id IN ARRAY p_split_ids
  LOOP
    SELECT * INTO v_split
    FROM transaction_splits
    WHERE id = v_split_id;
    
    IF v_split IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não encontrado.'
      );
    END IF;
    
    IF NOT v_split.is_settled THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não foi liquidado.'
      );
    END IF;
    
    v_payment_tx_ids := array_append(v_payment_tx_ids, v_split.settled_transaction_id);
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;
  
  -- Get account_id from first payment transaction
  SELECT account_id INTO v_account_id
  FROM transactions
  WHERE id = v_payment_tx_ids[1];
  
  -- Mark all splits as not settled
  UPDATE transaction_splits
  SET 
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL
  WHERE id = ANY(p_split_ids);
  
  GET DIAGNOSTICS v_reverted_count = ROW_COUNT;
  
  -- Delete all payment transactions
  DELETE FROM transactions
  WHERE id = ANY(v_payment_tx_ids);
  
  -- Revert account balance
  UPDATE accounts
  SET balance = balance - v_total_amount
  WHERE id = v_account_id;
  
  -- Return success
  v_result := json_build_object(
    'success', true,
    'reverted_count', v_reverted_count,
    'total_amount', v_total_amount,
    'reverted_at', NOW()
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION settle_multiple_splits(UUID[], UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unsettle_split(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unsettle_multiple_splits(UUID[]) TO authenticated;
