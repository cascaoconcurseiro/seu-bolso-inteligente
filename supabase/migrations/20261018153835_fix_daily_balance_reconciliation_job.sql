-- The existing cron job still called the removed no-argument RPC. The
-- authenticated RPC also recalculated from every transaction, including
-- future-dated transactions. Preserve the canonical current-date and payer
-- rules in both the user RPC and the scheduler.
CREATE OR REPLACE FUNCTION public.calculate_single_account_balance(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'Account ID is required' USING ERRCODE = '22004';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE id = p_account_id
      AND user_id = v_uid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Account does not belong to authenticated user' USING ERRCODE = '42501';
  END IF;

  PERFORM public.recalculate_account_balance(p_account_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.recalculate_all_account_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  FOR v_account_id IN
    SELECT account.id
    FROM public.accounts AS account
    WHERE account.deleted_at IS NULL
      AND account.balance IS DISTINCT FROM
        public.get_account_balance_at_date(account.id, CURRENT_DATE)
  LOOP
    PERFORM public.recalculate_account_balance(v_account_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.recalculate_all_account_balances()
  FROM PUBLIC, anon, authenticated, service_role;

DO $$
DECLARE
  v_existing_job_id bigint;
  v_removed_job boolean;
  v_new_job_id bigint;
BEGIN
  SELECT jobid INTO v_existing_job_id
  FROM cron.job
  WHERE jobname = 'daily-balance-reconciliation'
    AND username = current_user
    AND database = current_database()
    AND schedule = '0 4 * * *'
    AND command = 'SELECT public.recalculate_all_balances()'
    AND active;

  IF v_existing_job_id IS NULL THEN
    RAISE EXCEPTION 'Expected the known broken daily-balance-reconciliation job';
  END IF;

  v_removed_job := cron.unschedule(v_existing_job_id);
  IF NOT v_removed_job THEN
    RAISE EXCEPTION 'Could not remove the existing daily-balance-reconciliation job';
  END IF;

  v_new_job_id := cron.schedule(
    'daily-balance-reconciliation',
    '0 4 * * *',
    'SELECT private.recalculate_all_account_balances()'
  );
  IF v_new_job_id IS NULL THEN
    RAISE EXCEPTION 'Could not schedule the replacement daily-balance-reconciliation job';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobid = v_new_job_id
      AND jobname = 'daily-balance-reconciliation'
      AND username = current_user
      AND database = current_database()
      AND schedule = '0 4 * * *'
      AND command = 'SELECT private.recalculate_all_account_balances()'
      AND active
  ) THEN
    RAISE EXCEPTION 'Replacement daily-balance-reconciliation job failed verification';
  END IF;
END;
$$;
