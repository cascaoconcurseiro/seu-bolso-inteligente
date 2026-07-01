-- ============================================================================
-- Migration: Fix Settlement Amounts & Undo Settlement Creditor ID
-- Purpose: 
-- 1. request_settlement now accepts p_amount to use the netted/chosen amount 
--    from the frontend rather than just summing absolute split amounts.
-- 2. undo_settlement now correctly joins with transactions to get creditor_user_id.
-- ============================================================================

BEGIN;

-- 1. Update request_settlement to accept p_amount
DROP FUNCTION IF EXISTS request_settlement(UUID[], UUID, UUID, BOOLEAN);

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
    SELECT * INTO v_split FROM transaction_splits WHERE id = v_split_id;
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

  -- Update splits
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    IF p_is_payment THEN
      UPDATE transaction_splits 
      SET settled_by_debtor = true, debtor_settlement_tx_id = v_tx_id 
      WHERE id = v_split_id;
    ELSE
      UPDATE transaction_splits 
      SET settled_by_creditor = true, creditor_settlement_tx_id = v_tx_id 
      WHERE id = v_split_id;
    END IF;

    -- Se ambos pagaram, a transação está totalmente liquidada.
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


-- 2. Update undo_settlement to join with transactions
CREATE OR REPLACE FUNCTION public.undo_settlement(p_split_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_split RECORD;
    v_is_debtor BOOLEAN;
    v_is_creditor BOOLEAN;
BEGIN
    SELECT s.*, t.user_id AS creditor_user_id 
    INTO v_split 
    FROM public.transaction_splits s
    JOIN public.transactions t ON s.transaction_id = t.id
    WHERE s.id = p_split_id;

    IF v_split IS NULL THEN
        RAISE EXCEPTION 'Split não encontrado.';
    END IF;

    -- Determinar de qual lado o usuário está
    v_is_debtor := (v_split.user_id = p_user_id);
    v_is_creditor := (v_split.creditor_user_id = p_user_id);

    IF NOT v_is_debtor AND NOT v_is_creditor THEN
        RAISE EXCEPTION 'Usuário não tem permissão para desfazer este acerto.';
    END IF;

    -- ===== ESTORNO DO LADO DO DEVEDOR =====
    IF v_is_debtor THEN
        IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
            IF v_split.debtor_account_id IS NOT NULL AND v_split.debtor_amount IS NOT NULL THEN
                UPDATE public.accounts 
                SET balance = balance + v_split.debtor_amount 
                WHERE id = v_split.debtor_account_id;
            END IF;
            DELETE FROM public.transactions WHERE id = v_split.debtor_settlement_tx_id;
        END IF;

        UPDATE public.transaction_splits 
        SET 
            settled_by_debtor = false,
            debtor_settlement_tx_id = NULL,
            is_settled = false,
            settled_at = NULL
        WHERE id = p_split_id;
    END IF;

    -- ===== ESTORNO DO LADO DO CREDOR =====
    IF v_is_creditor THEN
        IF v_split.creditor_settlement_tx_id IS NOT NULL THEN
            IF v_split.creditor_account_id IS NOT NULL AND v_split.creditor_amount IS NOT NULL THEN
                UPDATE public.accounts 
                SET balance = balance - v_split.creditor_amount 
                WHERE id = v_split.creditor_account_id;
            END IF;
            DELETE FROM public.transactions WHERE id = v_split.creditor_settlement_tx_id;
        END IF;

        UPDATE public.transaction_splits 
        SET 
            settled_by_creditor = false,
            creditor_settlement_tx_id = NULL,
            is_settled = false,
            settled_at = NULL
        WHERE id = p_split_id;
    END IF;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMIT;
