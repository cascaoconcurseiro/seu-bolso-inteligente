CREATE OR REPLACE FUNCTION public.create_transaction_with_splits(
  p_transaction jsonb,
  p_splits jsonb DEFAULT '[]'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_created boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Cannot create a transaction for another user' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.transactions (
    user_id, creator_user_id, amount, description, date, competence_date, type,
    account_id, category_id, is_shared, domain, payer_id, is_installment,
    is_recurring, recurrence_pattern, recurrence_day, total_installments,
    current_installment, series_id, trip_id, currency, notes,
    destination_account_id, destination_amount, destination_currency,
    exchange_rate, related_member_id, is_refund, refund_of_transaction_id,
    import_hash, idempotency_key
  ) VALUES (
    v_uid, v_uid, (p_transaction->>'amount')::numeric,
    p_transaction->>'description', (p_transaction->>'date')::date,
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
    NULLIF(p_transaction->>'currency', ''), NULLIF(p_transaction->>'notes', ''),
    NULLIF(p_transaction->>'destination_account_id', '')::uuid,
    NULLIF(p_transaction->>'destination_amount', '')::numeric,
    NULLIF(p_transaction->>'destination_currency', ''),
    NULLIF(p_transaction->>'exchange_rate', '')::numeric,
    NULLIF(p_transaction->>'related_member_id', '')::uuid,
    NULLIF(p_transaction->>'is_refund', '')::boolean,
    NULLIF(p_transaction->>'refund_of_transaction_id', '')::uuid,
    NULLIF(p_transaction->>'import_hash', ''),
    NULLIF(p_transaction->>'idempotency_key', '')
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx_id;

  v_created := v_tx_id IS NOT NULL;
  IF NOT v_created THEN
    SELECT id INTO v_tx_id FROM public.transactions
    WHERE user_id = v_uid
      AND idempotency_key = NULLIF(p_transaction->>'idempotency_key', '');
  END IF;

  IF v_created AND jsonb_array_length(COALESCE(p_splits, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.transaction_splits (
      transaction_id, member_id, user_id, percentage, amount, name, is_settled
    )
    SELECT v_tx_id, NULLIF(split->>'member_id', '')::uuid,
      NULLIF(split->>'user_id', '')::uuid, (split->>'percentage')::numeric,
      (split->>'amount')::numeric, split->>'name',
      COALESCE((split->>'is_settled')::boolean, false)
    FROM jsonb_array_elements(p_splits) AS split;
  END IF;

  SELECT to_jsonb(t) INTO v_result FROM public.transactions t WHERE t.id = v_tx_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_installment_series(
  p_transactions jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_record jsonb;
  v_tx_id uuid;
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_splits jsonb;
  v_created boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Cannot create transactions for another user' USING ERRCODE = '42501';
  END IF;

  FOR v_tx_record IN SELECT value FROM jsonb_array_elements(p_transactions)
  LOOP
    v_tx_id := NULL;
    INSERT INTO public.transactions (
      user_id, creator_user_id, amount, description, date, competence_date, type,
      account_id, category_id, is_shared, domain, payer_id, is_installment,
      is_recurring, recurrence_pattern, recurrence_day, total_installments,
      current_installment, series_id, trip_id, currency, notes, idempotency_key
    ) VALUES (
      v_uid, v_uid, (v_tx_record->>'amount')::numeric,
      v_tx_record->>'description', (v_tx_record->>'date')::date,
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
      NULLIF(v_tx_record->>'currency', ''), NULLIF(v_tx_record->>'notes', ''),
      NULLIF(v_tx_record->>'idempotency_key', '')
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_tx_id;

    v_created := v_tx_id IS NOT NULL;
    IF NOT v_created THEN
      SELECT id INTO v_tx_id FROM public.transactions
      WHERE user_id = v_uid
        AND idempotency_key = NULLIF(v_tx_record->>'idempotency_key', '');
    END IF;

    v_splits := v_tx_record->'splits';
    IF v_created AND v_splits IS NOT NULL AND jsonb_array_length(v_splits) > 0 THEN
      INSERT INTO public.transaction_splits (
        transaction_id, member_id, user_id, percentage, amount, name, is_settled
      )
      SELECT v_tx_id, NULLIF(split->>'member_id', '')::uuid,
        NULLIF(split->>'user_id', '')::uuid, (split->>'percentage')::numeric,
        (split->>'amount')::numeric, split->>'name',
        COALESCE((split->>'is_settled')::boolean, false)
      FROM jsonb_array_elements(v_splits) AS split;
    END IF;
  END LOOP;

  SELECT jsonb_agg(to_jsonb(t) ORDER BY t.date) INTO v_result
  FROM public.transactions t
  WHERE t.user_id = v_uid
    AND t.series_id = (p_transactions->0->>'series_id')::uuid;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.create_transaction_with_splits(jsonb, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_installment_series(jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_transaction_with_splits(jsonb, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_installment_series(jsonb, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
