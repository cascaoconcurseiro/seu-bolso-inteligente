-- =========================================================================
-- MIGRATION: Fix hardcoded admin password (B-04, B-21)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- Substitui '909496' por verificação JWT via is_admin()
-- =========================================================================

-- ─── get_admin_error_logs: substituir senha por is_admin() ──────────────────

CREATE OR REPLACE FUNCTION public.get_admin_error_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: requer privilégios de administrador.';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'user_id', e.user_id,
            'user_email', p.email,
            'error_message', e.error_message,
            'stack_trace', e.component_stack,
            'context', e.user_message,
            'status', e.status,
            'created_at', e.created_at
        ) ORDER BY e.created_at DESC
    ) INTO v_result
    FROM error_logs e
    LEFT JOIN profiles p ON p.id = e.user_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_admin_error_logs() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_error_logs() TO authenticated;

-- ─── resolve_error_report: substituir senha por is_admin() ──────────────────

CREATE OR REPLACE FUNCTION public.resolve_error_report(p_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: requer privilégios de administrador.';
    END IF;

    UPDATE error_logs SET status = 'RESOLVED' WHERE id = p_report_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_error_report(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_error_report(uuid) TO authenticated;

-- ─── Drop old password-based signatures ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_admin_error_logs(text);
DROP FUNCTION IF EXISTS public.resolve_error_report(text, uuid);
