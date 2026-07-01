-- Repair: drop and recreate run_audit_check with fixed SQL
DROP FUNCTION IF EXISTS public.run_audit_check();

CREATE OR REPLACE FUNCTION public.run_audit_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'rls_status', (SELECT jsonb_agg(jsonb_build_object('table', tablename, 'rls', rowsecurity)) FROM pg_tables WHERE schemaname = 'public'),
    'tables_no_policies', (SELECT jsonb_agg(t.tablename) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public')),
    'tables_no_rls', (SELECT jsonb_agg(jsonb_build_object('table', tablename, 'rls', rowsecurity)) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false),
    'policies', (SELECT jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname, 'cmd', cmd, 'has_using', qual IS NOT NULL, 'has_check', with_check IS NOT NULL)) FROM pg_policies WHERE schemaname = 'public'),
    'orphan_triggers', (SELECT jsonb_agg(p.proname) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prorettype = 'trigger'::regtype AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid)),
    'trigger_coverage', (SELECT jsonb_agg(jsonb_build_object('function', pf.proname, 'trigger', pt.tgname, 'table', pc.relname, 'timing', CASE pt.tgtype::int & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END, 'event', CASE WHEN pt.tgtype::int & 4 = 4 THEN 'INSERT' WHEN pt.tgtype::int & 8 = 8 THEN 'DELETE' WHEN pt.tgtype::int & 16 = 16 THEN 'UPDATE' WHEN pt.tgtype::int & 12 = 12 THEN 'INSERT+DELETE' ELSE 'OTHER' END)) FROM pg_trigger pt JOIN pg_proc pf ON pt.tgfoid = pf.oid JOIN pg_class pc ON pt.tgrelid = pc.oid WHERE pc.relnamespace = 'public'::regnamespace AND NOT pt.tgisinternal),
    'audit_tables', (SELECT jsonb_agg(jsonb_build_object('name', table_name, 'columns', (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public'))) FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name LIKE '%audit%'),
    'financial_ledger_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_ledger'),
    'cron_jobs', (SELECT jsonb_agg(jsonb_build_object('name', jobname, 'schedule', schedule, 'active', active)) FROM cron.job),
    'error_logs_columns', (SELECT jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type)) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' ORDER BY ordinal_position),
    'settlement_reversals_columns', (SELECT jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type)) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settlement_reversals' ORDER BY ordinal_position),
    'profiles_columns', (SELECT jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type)) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' ORDER BY ordinal_position)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_audit_check() TO authenticated;
