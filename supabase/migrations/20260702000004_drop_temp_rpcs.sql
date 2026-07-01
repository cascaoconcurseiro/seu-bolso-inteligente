-- Cleanup: drop temporary RPCs used during audit
DROP FUNCTION IF EXISTS public.run_audit_check();
DROP FUNCTION IF EXISTS public.run_get_schema();
