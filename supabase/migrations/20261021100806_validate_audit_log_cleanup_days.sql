-- Keep the existing admin authorization and RPC contract while preventing
-- zero or negative retention values from deleting the full audit history.
CREATE OR REPLACE FUNCTION public.clean_old_audit_logs(p_days_to_keep integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF p_days_to_keep IS NULL OR p_days_to_keep < 1 OR p_days_to_keep > 3650 THEN
    RAISE EXCEPTION 'p_days_to_keep deve estar entre 1 e 3650' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.audit_log
   WHERE changed_at < now() - make_interval(days => p_days_to_keep);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;
-- Give the monthly pg_cron job an owner-only path that does not depend on a JWT.
CREATE OR REPLACE FUNCTION private.clean_old_audit_logs_job(p_days_to_keep integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF p_days_to_keep IS NULL OR p_days_to_keep < 1 OR p_days_to_keep > 3650 THEN
    RAISE EXCEPTION 'p_days_to_keep deve estar entre 1 e 3650' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.audit_log
   WHERE changed_at < now() - make_interval(days => p_days_to_keep);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

ALTER FUNCTION private.clean_old_audit_logs_job(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.clean_old_audit_logs_job(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.clean_old_audit_logs_job(integer) TO postgres;

DO $job$
DECLARE
  v_updated bigint;
BEGIN
    SELECT jobid INTO v_updated FROM cron.job WHERE jobname = 'monthly-audit-log-cleanup' AND username = 'postgres';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job mensal de limpeza ausente ou sem execução como postgres';
  END IF;
  PERFORM cron.alter_job(v_updated, NULL, 'SELECT private.clean_old_audit_logs_job(365)', NULL, NULL, NULL);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = v_updated AND command = 'SELECT private.clean_old_audit_logs_job(365)' AND username = 'postgres') THEN
    RAISE EXCEPTION 'Não foi possível atualizar o comando mensal de limpeza';
  END IF;
END;
$job$;
