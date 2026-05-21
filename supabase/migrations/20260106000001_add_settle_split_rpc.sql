-- RPC function to settle a single split atomically
-- This function marks a split as settled and creates a payment transaction
-- All operations happen in a single transaction (all-or-nothing behavior)

CREATE OR REPLACE FUNCTION settle_split(
  p_split_id UUID,
  p_account_id UUID,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split RECORD;
  v_result JSON;
  v_payment_tx_id UUID;
BEGIN
  -- Start transaction (implicit in plpgsql)
  
  -- 1. Validate that split exists and is not already settled
  SELECT * INTO v_split
  FROM transaction_splits
  WHERE id = p_split_id;
  
  IF v_split IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Split não encontrado.'
    );
  END IF;
  
  IF v_split.is_settled THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este split já foi liquidado.'
    );
  END IF;
  
  -- 2. Create payment transaction (INCOME type)
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
    auth.uid(),
    p_account_id,
    p_amount,
    'INCOME'::transaction_type,
    'Ressarcimento de despesa compartilhada',
    CURRENT_DATE,
    'PERSONAL'::transaction_domain,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_tx_id;
  
  -- 3. Update split to mark as settled
  UPDATE transaction_splits
  SET 
    is_settled = true,
    settled_at = NOW(),
    settled_transaction_id = v_payment_tx_id
  WHERE id = p_split_id;
  
  -- 4. Update account balance (trigger will handle this, but we ensure it here)
  UPDATE accounts
  SET balance = balance + p_amount
  WHERE id = p_account_id;
  
  -- 5. Return success with updated split data
  v_result := json_build_object(
    'success', true,
    'split_id', p_split_id,
    'payment_transaction_id', v_payment_tx_id,
    'amount', p_amount,
    'settled_at', NOW()
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically on exception
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION settle_split(UUID, UUID, NUMERIC) TO authenticated;
