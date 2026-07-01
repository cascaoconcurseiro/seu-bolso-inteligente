-- ============================================================================
-- Migration: Fix Request Settlement Sides
-- Purpose: In request_settlement, we must update settled_by_debtor or 
-- settled_by_creditor based on who the calling user (p_user_id) is for each 
-- specific split, rather than blindly using p_is_payment for all splits.
-- This correctly handles compensations where a user might be debtor on some 
-- splits and creditor on others.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION request_settlement(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID,
  p_is_payment BOOLEAN,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_tx_id UUID;
  v_processed_count INTEGER := 0;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  -- Verify all splits and calculate fallback amount if p_amount not provided
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT s.*, t.user_id AS creditor_user_id 
    INTO v_split 
    FROM transaction_splits s
    JOIN transactions t ON s.transaction_id = t.id
    WHERE s.id = v_split_id;

    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi totalmente liquidado.');
    END IF;
    
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Use p_amount if provided, else fallback to sum of splits
  IF p_amount IS NOT NULL THEN
    v_total_amount := p_amount;
  END IF;

  -- Create transaction for the initiator
  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount, 
    CASE WHEN p_is_payment THEN 'EXPENSE'::transaction_type ELSE 'INCOME'::transaction_type END,
    CASE WHEN p_is_payment THEN 'Pagamento de despesa compartilhada' ELSE 'Recebimento de despesa compartilhada' END,
    CURRENT_DATE, 'PERSONAL'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  -- Update splits correctly based on the caller's role in each split
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    -- Re-fetch the split with creditor info
    SELECT s.*, t.user_id AS creditor_user_id 
    INTO v_split 
    FROM transaction_splits s
    JOIN transactions t ON s.transaction_id = t.id
    WHERE s.id = v_split_id;

    -- If the caller is the debtor for this split
    IF v_split.user_id = p_user_id THEN
      UPDATE transaction_splits 
      SET settled_by_debtor = true, debtor_settlement_tx_id = v_tx_id 
      WHERE id = v_split_id;
    END IF;

    -- If the caller is the creditor for this split
    IF v_split.creditor_user_id = p_user_id THEN
      UPDATE transaction_splits 
      SET settled_by_creditor = true, creditor_settlement_tx_id = v_tx_id 
      WHERE id = v_split_id;
    END IF;

    -- Update is_settled if both parties have now settled
    UPDATE transaction_splits 
    SET 
      is_settled = (settled_by_debtor = true AND settled_by_creditor = true),
      settled_at = CASE WHEN (settled_by_debtor = true AND settled_by_creditor = true) THEN NOW() ELSE settled_at END
    WHERE id = v_split_id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- Update account balance
  IF p_is_payment THEN
    UPDATE accounts SET balance = balance - v_total_amount WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance + v_total_amount WHERE id = p_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'processed_count', v_processed_count,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMIT;
