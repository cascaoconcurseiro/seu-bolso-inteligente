-- SECURITY DEFINER transaction RPCs must validate cross-row ownership because
-- foreign keys only prove that referenced rows exist.
CREATE OR REPLACE FUNCTION private.assert_transaction_rpc_relationships(
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
  v_reference text;
  v_split jsonb;
  v_member_id uuid;
  v_member_user_id uuid;
  v_family_member public.family_members%ROWTYPE;
  v_trip_id uuid;
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
  IF (
    SELECT count(DISTINCT COALESCE(NULLIF(value->>'trip_id', ''), '<no-trip>'))
    FROM jsonb_array_elements(p_transactions)
  ) > 1 THEN
    RAISE EXCEPTION 'An installment series cannot span multiple trips' USING ERRCODE = '22023';
  END IF;

  FOR v_transaction IN SELECT value FROM jsonb_array_elements(p_transactions)
  LOOP
    IF jsonb_typeof(v_transaction) <> 'object' THEN
      RAISE EXCEPTION 'Every transaction must be a JSON object' USING ERRCODE = '22023';
    END IF;

    FOR v_reference IN
      SELECT value
      FROM jsonb_array_elements_text(jsonb_build_array(
        v_transaction->>'account_id',
        v_transaction->>'destination_account_id'
      )) AS reference(value)
      WHERE NULLIF(value, '') IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.accounts AS account
        WHERE account.id = v_reference::uuid
          AND account.user_id = p_user_id
          AND account.deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Account does not belong to the authenticated user'
          USING ERRCODE = '42501';
      END IF;
    END LOOP;

    v_reference := NULLIF(v_transaction->>'category_id', '');
    IF v_reference IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = v_reference::uuid
        AND (category.user_id = p_user_id OR category.user_id IS NULL)
        AND category.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Category does not belong to the authenticated user'
        USING ERRCODE = '42501';
    END IF;

    v_reference := NULLIF(v_transaction->>'trip_id', '');
    IF v_reference IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.trips AS trip
      WHERE trip.id = v_reference::uuid
        AND trip.deleted_at IS NULL
        AND (
          trip.owner_id = p_user_id
          OR EXISTS (
            SELECT 1 FROM public.trip_members AS member
            WHERE member.trip_id = trip.id
              AND member.user_id = p_user_id
              AND member.status = 'active'
          )
        )
    ) THEN
      RAISE EXCEPTION 'Trip is unavailable to the authenticated user'
        USING ERRCODE = '42501';
    END IF;

    FOR v_reference IN
      SELECT value
      FROM jsonb_array_elements_text(jsonb_build_array(
        v_transaction->>'payer_id',
        v_transaction->>'related_member_id'
      )) AS reference(value)
      WHERE NULLIF(value, '') IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.family_members AS member
        JOIN public.families AS family ON family.id = member.family_id
        WHERE (member.id = v_reference::uuid OR member.linked_user_id = v_reference::uuid)
          AND member.status = 'active'
          AND family.deleted_at IS NULL
          AND (
            family.owner_id = p_user_id
            OR EXISTS (
              SELECT 1
              FROM public.family_members AS caller_member
              WHERE caller_member.family_id = family.id
                AND caller_member.status = 'active'
                AND (caller_member.user_id = p_user_id OR caller_member.linked_user_id = p_user_id)
            )
          )
          AND (
            NULLIF(v_transaction->>'trip_id', '') IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.trips AS trip
              WHERE trip.id = NULLIF(v_transaction->>'trip_id', '')::uuid
                AND trip.deleted_at IS NULL
                AND (
                  trip.owner_id = COALESCE(member.linked_user_id, member.user_id)
                  OR EXISTS (
                    SELECT 1 FROM public.trip_members AS trip_member
                    WHERE trip_member.trip_id = trip.id
                      AND trip_member.user_id = COALESCE(member.linked_user_id, member.user_id)
                      AND trip_member.status = 'active'
                  )
                )
            )
          )
      ) THEN
        RAISE EXCEPTION 'Family member reference is unavailable to the authenticated user'
          USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END LOOP;

  FOR v_split IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_splits, '[]'::jsonb))
    UNION ALL
    SELECT split.value
    FROM jsonb_array_elements(p_transactions) AS transaction(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN transaction.value ? 'splits'
             AND jsonb_typeof(transaction.value->'splits') = 'array'
          THEN transaction.value->'splits'
        ELSE '[]'::jsonb
      END
    ) AS split(value)
  LOOP
    IF jsonb_typeof(v_split) <> 'object'
      OR NULLIF(v_split->>'member_id', '') IS NULL
    THEN
      RAISE EXCEPTION 'Every split must contain a member_id' USING ERRCODE = '22023';
    END IF;

    v_member_id := (v_split->>'member_id')::uuid;
    SELECT member.*
    INTO v_family_member
    FROM public.family_members AS member
    JOIN public.families AS family ON family.id = member.family_id
    WHERE (member.id = v_member_id OR member.linked_user_id = v_member_id)
      AND member.status = 'active'
      AND family.deleted_at IS NULL
      AND (
        family.owner_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.family_members AS caller_member
          WHERE caller_member.family_id = family.id
            AND caller_member.status = 'active'
            AND (caller_member.user_id = p_user_id OR caller_member.linked_user_id = p_user_id)
        )
      )
    ORDER BY (member.id = v_member_id) DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Split member is unavailable to the authenticated user'
        USING ERRCODE = '42501';
    END IF;

    v_member_user_id := COALESCE(v_family_member.linked_user_id, v_family_member.user_id);
    IF v_split ? 'user_id'
      AND NULLIF(v_split->>'user_id', '')::uuid IS DISTINCT FROM v_member_user_id
    THEN
      RAISE EXCEPTION 'Split user_id must match the selected family member'
        USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_transactions) AS transaction(value)
      WHERE NULLIF(transaction.value->>'trip_id', '') IS NOT NULL
    ) AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_transactions) AS transaction(value)
      JOIN public.trips AS trip
        ON trip.id = NULLIF(transaction.value->>'trip_id', '')::uuid
      WHERE trip.deleted_at IS NULL
        AND (
          trip.owner_id = v_member_user_id
          OR EXISTS (
            SELECT 1 FROM public.trip_members AS trip_member
            WHERE trip_member.trip_id = trip.id
              AND trip_member.user_id = v_member_user_id
              AND trip_member.status = 'active'
          )
        )
    ) THEN
      RAISE EXCEPTION 'Split member is not an active participant in the trip'
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION private.assert_transaction_rpc_relationships(jsonb, jsonb, uuid)
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
BEGIN
  PERFORM private.assert_transaction_rpc_relationships(
    jsonb_build_array(p_transaction), p_splits, v_uid
  );
  RETURN public.create_transaction_with_splits(p_transaction, p_splits, v_uid);
END;
$function$;
