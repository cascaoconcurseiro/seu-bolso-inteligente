CREATE OR REPLACE FUNCTION public.restore_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_deleted_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT t.user_id, t.deleted_at
    INTO v_owner_id, v_deleted_at
  FROM public.transactions AS t
  WHERE t.id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND OR v_owner_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Transaction not found or access denied' USING ERRCODE = '42501';
  END IF;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Transaction is not deleted' USING ERRCODE = '55000';
  END IF;

  UPDATE public.transactions
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_transaction_id
    AND user_id = v_user_id;

  UPDATE public.transaction_splits
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE transaction_id = p_transaction_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;

  UPDATE public.transactions
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE source_transaction_id = p_transaction_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.restore_transaction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_transaction(uuid) TO authenticated, service_role;
