-- RPC function for reversing settlement with reversal reason and audit trail
-- unsettleWithReversal: Revert a settlement with reason tracking and audit records

-- Function to unsettle a split with reversal reason and audit trail
CREATE OR REPLACE FUNCTION unsettle_with_reversal(
  p_split_id UUID,
  p_reversal_reason TEXT
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
  v_original_tx_id UUID;
  v_reversal_record_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_split_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ID do split é obrigatório.'
    );
  END IF;
  
  IF p_reversal_reason IS NULL OR TRIM(p_reversal_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Motivo da reversão é obrigatório.'
    );
  END IF;
  
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
      'error', 'Este split não foi liquidado, portanto não pode ser revertido.'
    );
  END IF;
  
  -- Store values for later use
  v_payment_tx_id := v_split.settled_transaction_id;
  v_amount := v_split.amount;
  v_original_tx_id := v_split.transaction_id;
  
  -- Get account_id from the payment transaction
  SELECT account_id INTO v_account_id
  FROM transactions
  WHERE id = v_payment_tx_id;
  
  IF v_account_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transação de pagamento não encontrada.'
    );
  END IF;
  
  -- Create audit trail record for reversal
  -- This creates a record in an audit log table if it exists
  BEGIN
    INSERT INTO settlement_reversals (
      split_id,
      original_transaction_id,
      payment_transaction_id,
      amount,
      reversal_reason,
      reversed_by,
      reversed_at,
      created_at
    ) VALUES (
      p_split_id,
      v_original_tx_id,
      v_payment_tx_id,
      v_amount,
      TRIM(p_reversal_reason),
      auth.uid(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_reversal_record_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist yet, continue without audit record
    v_reversal_record_id := NULL;
  END;
  
  -- Mark split as not settled
  UPDATE transaction_splits
  SET 
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL,
    updated_at = NOW()
  WHERE id = p_split_id;
  
  -- Delete the payment transaction
  DELETE FROM transactions
  WHERE id = v_payment_tx_id;
  
  -- Revert account balance
  UPDATE accounts
  SET 
    balance = balance - v_amount,
    updated_at = NOW()
  WHERE id = v_account_id;
  
  -- Update the original transaction's updated_at to reflect the change
  UPDATE transactions
  SET updated_at = NOW()
  WHERE id = v_original_tx_id;
  
  -- Return success with updated split data
  v_result := json_build_object(
    'success', true,
    'split_id', p_split_id,
    'original_transaction_id', v_original_tx_id,
    'payment_transaction_id', v_payment_tx_id,
    'reverted_amount', v_amount,
    'reversal_reason', TRIM(p_reversal_reason),
    'reversal_record_id', v_reversal_record_id,
    'reverted_at', NOW(),
    'account_id', v_account_id
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', 'Erro ao reverter liquidação: ' || SQLERRM
  );
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION unsettle_with_reversal(UUID, TEXT) TO authenticated;

-- Create settlement_reversals table for audit trail if it doesn't exist
CREATE TABLE IF NOT EXISTS settlement_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES transaction_splits(id) ON DELETE CASCADE,
  original_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payment_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  reversal_reason TEXT NOT NULL,
  reversed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reversed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_split_id ON settlement_reversals(split_id);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_reversed_by ON settlement_reversals(reversed_by);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_reversed_at ON settlement_reversals(reversed_at);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_original_tx ON settlement_reversals(original_transaction_id);

-- Enable RLS on settlement_reversals table
ALTER TABLE settlement_reversals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see reversals for their own transactions
CREATE POLICY "Users can view their own settlement reversals"
  ON settlement_reversals
  FOR SELECT
  USING (
    reversed_by = auth.uid() OR
    original_transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy: users can only insert reversals for their own transactions
CREATE POLICY "Users can create reversals for their own transactions"
  ON settlement_reversals
  FOR INSERT
  WITH CHECK (
    reversed_by = auth.uid() AND
    original_transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy: users cannot update reversals (audit trail is immutable)
CREATE POLICY "Settlement reversals are immutable"
  ON settlement_reversals
  FOR UPDATE
  USING (false);

-- Create RLS policy: users cannot delete reversals (audit trail is immutable)
CREATE POLICY "Settlement reversals cannot be deleted"
  ON settlement_reversals
  FOR DELETE
  USING (false);

