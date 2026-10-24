-- Enforce live family membership in RLS probes and keep private PIN material
-- out of administrative profile payloads.
CREATE OR REPLACE FUNCTION public.is_family_member_v2(
  p_family_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members AS member
    JOIN public.families AS family ON family.id = member.family_id
    WHERE member.family_id = p_family_id
      AND (member.linked_user_id = v_user_id OR member.user_id = v_user_id)
      AND member.status = 'active'
      AND member.removed_at IS NULL
      AND family.deleted_at IS NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_user_dossier(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT to_jsonb(profile_row) - 'app_pin_hash'
      FROM public.profiles AS profile_row
      WHERE profile_row.id = target_user_id
    ),
    'accounts', (
      SELECT COALESCE(jsonb_agg(account_row), '[]'::jsonb)
      FROM public.accounts AS account_row
      WHERE account_row.user_id = target_user_id
        AND account_row.deleted_at IS NULL
    ),
    'transactionCount', (
      SELECT COUNT(*)
      FROM public.transactions AS transaction_row
      WHERE transaction_row.user_id = target_user_id
        AND transaction_row.deleted_at IS NULL
    )
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- A summary of shared spending must ignore removed splits and income records.
CREATE OR REPLACE FUNCTION public.get_shared_expense_summary_by_person(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  WITH shared_splits AS (
    SELECT
      split.member_id,
      split.name AS member_name,
      split.amount,
      split.is_settled,
      transaction_row.payer_id,
      transaction_row.series_id,
      transaction_row.is_installment,
      transaction_row.date
    FROM public.transactions AS transaction_row
    JOIN public.transaction_splits AS split
      ON split.transaction_id = transaction_row.id
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.is_shared = true
      AND transaction_row.type = 'EXPENSE'
      AND transaction_row.deleted_at IS NULL
      AND split.deleted_at IS NULL
      AND transaction_row.date >= p_start_date
      AND transaction_row.date <= p_end_date
  ),
  grouped AS (
    SELECT
      member_id,
      member_name,
      COALESCE(SUM(amount) FILTER (WHERE payer_id = member_id), 0) AS paid,
      COALESCE(SUM(amount) FILTER (WHERE payer_id != member_id OR payer_id IS NULL), 0) AS owes,
      COUNT(*) AS tx_count
    FROM shared_splits
    GROUP BY member_id, member_name
  )
  SELECT jsonb_agg(row_to_json(grouped_row))
    INTO v_result
  FROM grouped AS grouped_row
  WHERE grouped_row.paid > 0 OR grouped_row.owes > 0;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- Direct RPC callers must not assign transactions to inactive/deleted accounts.
CREATE OR REPLACE FUNCTION public.assign_default_account_to_orphans(
  p_default_account_id uuid,
  p_user_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_count bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Cannot manage transactions for another user' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_default_account_id
      AND user_id = v_uid
      AND is_active = true
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Conta padrão não encontrada';
  END IF;

  UPDATE public.transactions
  SET account_id = p_default_account_id
  WHERE account_id IS NULL
    AND user_id = v_uid
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.migrate_transactions_to_account(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_user_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_count bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Cannot manage accounts for another user' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_from_account_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_to_account_id
      AND user_id = v_uid
      AND is_active = true
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Conta de destino não encontrada ou inativa';
  END IF;

  UPDATE public.transactions
  SET account_id = p_to_account_id
  WHERE account_id = p_from_account_id
    AND user_id = v_uid
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
