-- ============================================================================
-- MIGRATION: Complete financial_ledger + fix RPC to accept user_id
-- ============================================================================

-- ─── 1. Ensure all financial_ledger columns exist ─────────────────────────────

DO $$
BEGIN
  ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS related_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_fl_related_user ON financial_ledger(related_user_id);
CREATE INDEX IF NOT EXISTS idx_fl_related_member ON financial_ledger(related_member_id);

-- ─── 2. Fix create_transaction_with_splits to accept user_id ─────────────────
-- The RPC returns 400 "Not authenticated" from the browser because auth.uid()
-- can be NULL in certain edge cases. Adding p_user_id as an optional parameter
-- allows the frontend to pass the user ID directly.

DROP FUNCTION IF EXISTS create_transaction_with_splits(JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_transaction_with_splits(
  p_transaction JSONB,
  p_splits JSONB DEFAULT '[]'::JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_uid UUID;
  v_result JSONB;
BEGIN
  -- Use explicit user_id if provided, otherwise fall back to auth.uid()
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid IS NULL THEN
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
    v_uid,
    v_uid,
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

GRANT EXECUTE ON FUNCTION create_transaction_with_splits(JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction_with_splits(JSONB, JSONB, UUID) TO service_role;

-- ─── 3. Fix create_installment_series similarly ──────────────────────────────

DROP FUNCTION IF EXISTS create_installment_series(JSONB);

CREATE OR REPLACE FUNCTION create_installment_series(
  p_transactions JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_record JSONB;
  v_tx_id UUID;
  v_uid UUID;
  v_result JSONB;
  v_splits JSONB;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid IS NULL THEN
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
      v_uid,
      v_uid,
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

GRANT EXECUTE ON FUNCTION create_installment_series(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_installment_series(JSONB, UUID) TO service_role;

-- ─── 4. Update frontend types reference ──────────────────────────────────────
-- Note: The frontend MUST pass p_user_id when calling these RPCs.

-- ─── 5. Reload PostgREST schema cache ───────────────────────────────────────
-- Required after changing function signatures, otherwise PostgREST returns 404
NOTIFY pgrst, 'reload schema';
-- Updated signatures:
--   create_transaction_with_splits(p_transaction, p_splits, p_user_id)
--   create_installment_series(p_transactions, p_user_id)
