-- Fix: Add recurrence_pattern and recurrence_day to atomic RPC functions
-- These fields were missing from the explicit INSERT column lists

-- ARC-01: Single transaction with splits (atomic)
CREATE OR REPLACE FUNCTION create_transaction_with_splits(
  p_transaction JSONB,
  p_splits JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO transactions (
    user_id, creator_user_id, amount, description, date, competence_date, type,
    account_id, category_id, is_shared, domain, payer_id, is_installment,
    is_recurring, recurrence_pattern, recurrence_day,
    total_installments, current_installment, series_id, trip_id,
    currency, notes, destination_account_id, destination_amount, destination_currency,
    exchange_rate, related_member_id, is_refund, refund_of_transaction_id, import_hash
  ) VALUES (
    auth.uid(),
    auth.uid(),
    (p_transaction->>'amount')::numeric,
    p_transaction->>'description',
    (p_transaction->>'date')::date,
    (p_transaction->>'competence_date')::date,
    (p_transaction->>'type')::transaction_type,
    NULLIF(p_transaction->>'account_id', '')::uuid,
    NULLIF(p_transaction->>'category_id', '')::uuid,
    COALESCE((p_transaction->>'is_shared')::boolean, false),
    COALESCE((p_transaction->>'domain')::transaction_domain, 'PERSONAL'),
    NULLIF(p_transaction->>'payer_id', '')::uuid,
    COALESCE((p_transaction->>'is_installment')::boolean, false),
    COALESCE((p_transaction->>'is_recurring')::boolean, false),
    NULLIF(p_transaction->>'recurrence_pattern', ''),
    NULLIF(p_transaction->>'recurrence_day', '')::integer,
    NULLIF(p_transaction->>'total_installments', '')::integer,
    NULLIF(p_transaction->>'current_installment', '')::integer,
    NULLIF(p_transaction->>'series_id', '')::uuid,
    NULLIF(p_transaction->>'trip_id', '')::uuid,
    NULLIF(p_transaction->>'currency', ''),
    NULLIF(p_transaction->>'notes', ''),
    NULLIF(p_transaction->>'destination_account_id', '')::uuid,
    NULLIF(p_transaction->>'destination_amount', '')::numeric,
    NULLIF(p_transaction->>'destination_currency', ''),
    NULLIF(p_transaction->>'exchange_rate', '')::numeric,
    NULLIF(p_transaction->>'related_member_id', '')::uuid,
    NULLIF(p_transaction->>'is_refund', '')::boolean,
    NULLIF(p_transaction->>'refund_of_transaction_id', '')::uuid,
    NULLIF(p_transaction->>'import_hash', '')
  )
  RETURNING id INTO v_tx_id;

  IF jsonb_array_length(p_splits) > 0 THEN
    INSERT INTO transaction_splits (
      transaction_id, member_id, user_id, percentage, amount, name, is_settled
    )
    SELECT
      v_tx_id,
      NULLIF(split->>'member_id', '')::uuid,
      NULLIF(split->>'user_id', '')::uuid,
      (split->>'percentage')::numeric,
      (split->>'amount')::numeric,
      split->>'name',
      COALESCE((split->>'is_settled')::boolean, false)
    FROM jsonb_array_elements(p_splits) AS split;
  END IF;

  SELECT row_to_json(t)::JSONB INTO v_result
  FROM (SELECT * FROM transactions WHERE id = v_tx_id) t;

  RETURN v_result;
END;
$$;

-- ARC-02: Installment series with splits (atomic)
CREATE OR REPLACE FUNCTION create_installment_series(
  p_transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_record JSONB;
  v_tx_id UUID;
  v_result JSONB;
  v_splits JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  FOR v_tx_record IN SELECT value FROM jsonb_array_elements(p_transactions)
  LOOP
    INSERT INTO transactions (
      user_id, creator_user_id, amount, description, date, competence_date, type,
      account_id, category_id, is_shared, domain, payer_id, is_installment,
      is_recurring, recurrence_pattern, recurrence_day,
      total_installments, current_installment, series_id, trip_id,
      currency, notes
    ) VALUES (
      auth.uid(),
      auth.uid(),
      (v_tx_record->>'amount')::numeric,
      v_tx_record->>'description',
      (v_tx_record->>'date')::date,
      (v_tx_record->>'competence_date')::date,
      (v_tx_record->>'type')::transaction_type,
      NULLIF(v_tx_record->>'account_id', '')::uuid,
      NULLIF(v_tx_record->>'category_id', '')::uuid,
      COALESCE((v_tx_record->>'is_shared')::boolean, false),
      COALESCE((v_tx_record->>'domain')::transaction_domain, 'PERSONAL'),
      NULLIF(v_tx_record->>'payer_id', '')::uuid,
      COALESCE((v_tx_record->>'is_installment')::boolean, true),
      COALESCE((v_tx_record->>'is_recurring')::boolean, false),
      NULLIF(v_tx_record->>'recurrence_pattern', ''),
      NULLIF(v_tx_record->>'recurrence_day', '')::integer,
      NULLIF(v_tx_record->>'total_installments', '')::integer,
      NULLIF(v_tx_record->>'current_installment', '')::integer,
      NULLIF(v_tx_record->>'series_id', '')::uuid,
      NULLIF(v_tx_record->>'trip_id', '')::uuid,
      NULLIF(v_tx_record->>'currency', ''),
      NULLIF(v_tx_record->>'notes', '')
    )
    RETURNING id INTO v_tx_id;

    v_splits := v_tx_record->'splits';
    IF v_splits IS NOT NULL AND jsonb_array_length(v_splits) > 0 THEN
      INSERT INTO transaction_splits (
        transaction_id, member_id, user_id, percentage, amount, name, is_settled
      )
      SELECT
        v_tx_id,
        NULLIF(split->>'member_id', '')::uuid,
        NULLIF(split->>'user_id', '')::uuid,
        (split->>'percentage')::numeric,
        (split->>'amount')::numeric,
        split->>'name',
        COALESCE((split->>'is_settled')::boolean, false)
      FROM jsonb_array_elements(v_splits) AS split;
    END IF;
  END LOOP;

  SELECT jsonb_agg(row_to_json(t)) INTO v_result
  FROM (SELECT * FROM transactions WHERE series_id = (p_transactions->0->>'series_id')::uuid ORDER BY date) t;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;
