-- ============================================================================
-- Migration: Add 2-Step Settlement Confirmations
-- Created: 2026-05-23
-- Purpose: Implement Awaiting Confirmation state and Audit Logs for settlements
-- ============================================================================

BEGIN;

-- 1. Create request_settlement function (Step 1)
-- Called by the user who is initiating the settlement (the one paying or receiving early)
CREATE OR REPLACE FUNCTION request_settlement(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID,
  p_is_payment BOOLEAN -- TRUE se o usuário estiver pagando (Devedor), FALSE se estiver recebendo (Credor, menos comum de iniciar, mas possível se ele mesmo quiser dar baixa)
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
  v_result JSON;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  -- Verify all splits
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT * INTO v_split FROM transaction_splits WHERE id = v_split_id;
    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi liquidado.');
    END IF;
    
    -- If user is paying, they must be the debtor (split amount is negative for them, or they are paying a debt)
    -- Actually, amount in transaction_splits is absolute. We just sum it up.
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

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

  -- Update splits and add Audit Logs
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    IF p_is_payment THEN
      UPDATE transaction_splits SET settled_by_debtor = true, debtor_settlement_tx_id = v_tx_id WHERE id = v_split_id;
    ELSE
      UPDATE transaction_splits SET settled_by_creditor = true, creditor_settlement_tx_id = v_tx_id WHERE id = v_split_id;
    END IF;

    -- Create Audit Log
    INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
    VALUES (
      'transaction_splits', v_split_id, 'SETTLEMENT_REQUESTED',
      jsonb_build_object('amount', v_split.amount, 'currency', 'BRL', 'is_payment', p_is_payment, 'transaction_id', v_tx_id),
      p_user_id
    );
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

-- 2. Create confirm_settlement_receipt function (Step 2)
-- Called by the other party to confirm the settlement
CREATE OR REPLACE FUNCTION confirm_settlement(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID,
  p_is_receiving BOOLEAN -- TRUE if user is receiving the money (Creditor confirming receipt)
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
  v_confirmed_count INTEGER := 0;
  v_result JSON;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT * INTO v_split FROM transaction_splits WHERE id = v_split_id;
    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi totalmente liquidado.');
    END IF;
    
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Create transaction for the confirmer
  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount, 
    CASE WHEN p_is_receiving THEN 'INCOME'::transaction_type ELSE 'EXPENSE'::transaction_type END,
    CASE WHEN p_is_receiving THEN 'Recebimento confirmado (Acerto)' ELSE 'Pagamento confirmado (Acerto)' END,
    CURRENT_DATE, 'PERSONAL'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  -- Finalize splits and add Audit Logs
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    IF p_is_receiving THEN
      UPDATE transaction_splits SET 
        settled_by_creditor = true, 
        creditor_settlement_tx_id = v_tx_id,
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_id;
    ELSE
      UPDATE transaction_splits SET 
        settled_by_debtor = true, 
        debtor_settlement_tx_id = v_tx_id,
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_id;
    END IF;

    -- Create Audit Log
    INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
    VALUES (
      'transaction_splits', v_split_id, 'SETTLEMENT_CONFIRMED',
      jsonb_build_object('amount', v_split.amount, 'currency', 'BRL', 'is_receiving', p_is_receiving, 'transaction_id', v_tx_id),
      p_user_id
    );
    v_confirmed_count := v_confirmed_count + 1;
  END LOOP;

  -- Update account balance
  IF p_is_receiving THEN
    UPDATE accounts SET balance = balance + v_total_amount WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance - v_total_amount WHERE id = p_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'confirmed_count', v_confirmed_count,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Removed audit_logs constraint altering since the remote schema uses the generic audit_logs table without constraint.

GRANT EXECUTE ON FUNCTION request_settlement(UUID[], UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_settlement(UUID[], UUID, UUID, BOOLEAN) TO authenticated;

COMMIT;
