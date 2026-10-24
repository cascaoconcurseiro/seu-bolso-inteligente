-- Prevent callers from attaching a new installment to another user's series.
CREATE OR REPLACE FUNCTION private.assert_transaction_rpc_series_ownership(
  p_transactions jsonb,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_series_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_transactions IS NULL OR jsonb_typeof(p_transactions) <> 'array'
     OR jsonb_array_length(p_transactions) = 0 THEN
    RAISE EXCEPTION 'Transactions must be a non-empty JSON array' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(DISTINCT COALESCE(NULLIF(value ->> 'series_id', ''), '<no-series>'))
    FROM jsonb_array_elements(p_transactions)
  ) > 1 THEN
    RAISE EXCEPTION 'An installment series must use one series_id' USING ERRCODE = '22023';
  END IF;

  v_series_id := NULLIF(p_transactions -> 0 ->> 'series_id', '')::uuid;
  IF v_series_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_series_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.transactions AS transaction_row
    WHERE transaction_row.series_id = v_series_id
      AND transaction_row.source_transaction_id IS NULL
      AND (
        transaction_row.user_id IS DISTINCT FROM p_user_id
        OR COALESCE(transaction_row.creator_user_id, transaction_row.user_id)
             IS DISTINCT FROM p_user_id
      )
  ) THEN
    RAISE EXCEPTION 'Installment series belongs to another user'
      USING ERRCODE = '42501';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION private.assert_transaction_rpc_series_ownership(jsonb, uuid)
  FROM PUBLIC, anon, authenticated;

-- Validate the financial invariants before the base SECURITY DEFINER functions
-- persist caller-supplied amounts or settlement flags.
CREATE OR REPLACE FUNCTION private.assert_transaction_rpc_split_integrity(
  p_transactions jsonb,
  p_splits jsonb,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_transaction jsonb;
  v_split jsonb;
  v_splits jsonb;
  v_transaction_amount numeric;
  v_amount numeric;
  v_percentage numeric;
  v_amount_total numeric;
  v_percentage_total numeric;
  v_member_id uuid;
  v_canonical_member_id uuid;
  v_split_user_id uuid;
  v_seen_users uuid[];
  v_seen_members uuid[];
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_transactions IS NULL OR jsonb_typeof(p_transactions) <> 'array' THEN
    RAISE EXCEPTION 'Transactions must be a JSON array' USING ERRCODE = '22023';
  END IF;
  IF p_splits IS NOT NULL AND jsonb_typeof(p_splits) <> 'array' THEN
    RAISE EXCEPTION 'Splits must be a JSON array' USING ERRCODE = '22023';
  END IF;

  FOR v_transaction IN SELECT value FROM jsonb_array_elements(p_transactions)
  LOOP
    v_splits := COALESCE(p_splits, v_transaction -> 'splits', '[]'::jsonb);
    IF jsonb_typeof(v_splits) <> 'array' THEN
      RAISE EXCEPTION 'Splits must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(v_splits) = 0 THEN
      CONTINUE;
    END IF;

    v_transaction_amount := NULLIF(v_transaction ->> 'amount', '')::numeric;
    IF v_transaction_amount IS NULL OR v_transaction_amount <= 0 THEN
      RAISE EXCEPTION 'A split transaction must have a positive amount'
        USING ERRCODE = '22023';
    END IF;
    v_transaction_amount := pg_catalog.round(v_transaction_amount, 2);
    v_amount_total := 0;
    v_percentage_total := 0;
    v_seen_users := ARRAY[]::uuid[];
    v_seen_members := ARRAY[]::uuid[];

    FOR v_split IN SELECT value FROM jsonb_array_elements(v_splits)
    LOOP
      IF jsonb_typeof(v_split) <> 'object'
         OR NULLIF(v_split ->> 'member_id', '') IS NULL THEN
        RAISE EXCEPTION 'Every split must contain a member_id'
          USING ERRCODE = '22023';
      END IF;

      v_member_id := (v_split ->> 'member_id')::uuid;
      v_amount := NULLIF(v_split ->> 'amount', '')::numeric;
      v_percentage := NULLIF(v_split ->> 'percentage', '')::numeric;
      IF v_amount IS NULL OR v_amount <= 0 OR v_amount > v_transaction_amount THEN
        RAISE EXCEPTION 'Split amount must be positive and cannot exceed the transaction amount'
          USING ERRCODE = '22023';
      END IF;
      IF pg_catalog.round(v_amount, 2) <> v_amount THEN
        RAISE EXCEPTION 'Split amounts must use whole cents'
          USING ERRCODE = '22023';
      END IF;
      IF v_percentage IS NULL OR v_percentage <= 0 OR v_percentage > 100 THEN
        RAISE EXCEPTION 'Split percentage must be greater than 0 and at most 100'
          USING ERRCODE = '22023';
      END IF;
      IF COALESCE(NULLIF(v_split ->> 'is_settled', '')::boolean, false) THEN
        RAISE EXCEPTION 'A new split cannot be created as settled'
          USING ERRCODE = '22023';
      END IF;

      SELECT member.id, COALESCE(member.linked_user_id, member.user_id)
      INTO v_canonical_member_id, v_split_user_id
      FROM public.family_members AS member
      WHERE (member.id = v_member_id OR member.linked_user_id = v_member_id)
        AND member.status = 'active'
        AND member.removed_at IS NULL
      ORDER BY (member.id = v_member_id) DESC
      LIMIT 1;
      IF v_canonical_member_id IS NOT NULL THEN
        IF v_canonical_member_id = ANY(v_seen_members)
           OR (v_split_user_id IS NOT NULL AND v_split_user_id = ANY(v_seen_users)) THEN
          RAISE EXCEPTION 'A user cannot appear in more than one split'
            USING ERRCODE = '22023';
        END IF;
        v_seen_members := pg_catalog.array_append(v_seen_members, v_canonical_member_id);
        IF v_split_user_id IS NOT NULL THEN
          v_seen_users := pg_catalog.array_append(v_seen_users, v_split_user_id);
        END IF;
      END IF;

      v_amount_total := v_amount_total + v_amount;
      v_percentage_total := v_percentage_total + v_percentage;
    END LOOP;

    IF pg_catalog.abs(v_percentage_total - 100) > 0.000001 THEN
      RAISE EXCEPTION 'Split percentages must total 100'
        USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.round(v_amount_total, 2) <> v_transaction_amount THEN
      RAISE EXCEPTION 'Split amounts must total the transaction amount to the cent'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION private.assert_transaction_rpc_split_integrity(jsonb, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_installment_series_v2(p_transactions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := private.authenticated_uid();
BEGIN
  PERFORM private.assert_transaction_rpc_relationships(p_transactions, NULL, v_uid);
  PERFORM private.assert_transaction_rpc_series_ownership(p_transactions, v_uid);
  PERFORM private.assert_transaction_rpc_split_integrity(p_transactions, NULL, v_uid);
  RETURN public.create_installment_series(p_transactions, v_uid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_with_splits_v2(
  p_transaction jsonb,
  p_splits jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := private.authenticated_uid();
  v_transactions jsonb := jsonb_build_array(p_transaction);
BEGIN
  PERFORM private.assert_transaction_rpc_relationships(v_transactions, p_splits, v_uid);
  PERFORM private.assert_transaction_rpc_series_ownership(v_transactions, v_uid);
  PERFORM private.assert_transaction_rpc_split_integrity(v_transactions, p_splits, v_uid);
  RETURN public.create_transaction_with_splits(p_transaction, p_splits, v_uid);
END;
$function$;

-- Preserve the old UI contract while applying the same ownership, settlement,
-- and soft-delete rules enforced by single-transaction deletion.
CREATE OR REPLACE FUNCTION public.delete_installment_series(p_series_id uuid)
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_row record;
  v_series_count integer := 0;
  v_deleted_count bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_series_id IS NULL THEN
    RAISE EXCEPTION 'Series is required' USING ERRCODE = '22023';
  END IF;

  -- Serialize series creation with deletion so no installment can be inserted
  -- after the delete operation has enumerated the series rows.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_series_id::text, 0)
  );

  FOR v_row IN
    SELECT transaction_row.id, transaction_row.user_id,
           transaction_row.creator_user_id, transaction_row.is_settled
    FROM public.transactions AS transaction_row
    WHERE transaction_row.series_id = p_series_id
      AND transaction_row.source_transaction_id IS NULL
      AND transaction_row.deleted_at IS NULL
    ORDER BY transaction_row.id
    FOR UPDATE
  LOOP
    v_series_count := v_series_count + 1;
    IF v_row.user_id IS DISTINCT FROM v_user_id
       OR COALESCE(v_row.creator_user_id, v_row.user_id) IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Only the creator of the installment series may delete it'
        USING ERRCODE = '42501';
    END IF;
    IF v_row.is_settled THEN
      RAISE EXCEPTION 'An installment in this series has been settled'
        USING ERRCODE = '55000';
    END IF;
  END LOOP;

  IF v_series_count = 0 THEN
    RAISE EXCEPTION 'Installment series not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.transaction_splits AS split
  JOIN public.transactions AS transaction_row
    ON transaction_row.id = split.transaction_id
  WHERE transaction_row.series_id = p_series_id
    AND transaction_row.source_transaction_id IS NULL
    AND transaction_row.user_id = v_user_id
    AND transaction_row.deleted_at IS NULL
    AND split.deleted_at IS NULL
  ORDER BY split.id
  FOR UPDATE OF split;

  IF EXISTS (
    SELECT 1
    FROM public.transaction_splits AS split
    JOIN public.transactions AS transaction_row
      ON transaction_row.id = split.transaction_id
    WHERE transaction_row.series_id = p_series_id
      AND transaction_row.source_transaction_id IS NULL
      AND transaction_row.user_id = v_user_id
      AND transaction_row.deleted_at IS NULL
      AND split.deleted_at IS NULL
      AND (
        split.is_settled
        OR split.settled_at IS NOT NULL
        OR COALESCE(split.settled_by_debtor, false)
        OR COALESCE(split.settled_by_creditor, false)
        OR split.settled_transaction_id IS NOT NULL
        OR split.debtor_settlement_tx_id IS NOT NULL
        OR split.creditor_settlement_tx_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'An installment in this series has settlements'
      USING ERRCODE = '55000';
  END IF;

  FOR v_row IN
    SELECT transaction_row.id
    FROM public.transactions AS transaction_row
    WHERE transaction_row.series_id = p_series_id
      AND transaction_row.source_transaction_id IS NULL
      AND transaction_row.user_id = v_user_id
      AND transaction_row.deleted_at IS NULL
      AND transaction_row.date >= CURRENT_DATE
    ORDER BY COALESCE(transaction_row.current_installment, 1), transaction_row.id
  LOOP
    PERFORM public.soft_delete_transaction(v_row.id, 'NONE');
    v_deleted_count := v_deleted_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_deleted_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_installment_series(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_installment_series(uuid) TO authenticated;
