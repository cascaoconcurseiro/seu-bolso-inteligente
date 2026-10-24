-- Preserve self-service recalculation while allowing the admin panel to repair
-- another user's denormalized balances through its existing admin-only action.
-- The authorization check remains inside this SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.recalculate_all_balances(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_account_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  IF p_user_id IS DISTINCT FROM v_uid AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Cannot recalculate balances for another user' USING errcode = '42501';
  END IF;

  FOR v_account_id IN
    SELECT id
    FROM public.accounts
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
  LOOP
    -- The per-account public helper intentionally allows only auth.uid().
    -- This privileged RPC already verified self/admin ownership above, so use
    -- the internal balance calculator directly for the selected account set.
    PERFORM public.recalculate_account_balance(v_account_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_all_balances(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_all_balances(uuid) TO authenticated, service_role;
