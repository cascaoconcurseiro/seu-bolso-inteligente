-- Align error log admin helpers with the current error_logs schema.
-- Production stores errors as error_type/message/stack/url/extra.

ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'IGNORED'));

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
            'error_message', COALESCE(e.message, e.error_type, 'Erro sem mensagem'),
            'stack_trace', e.stack,
            'context', COALESCE(e.url, e.extra::text),
            'status', COALESCE(e.status, 'PENDING'),
            'created_at', e.created_at
        ) ORDER BY e.created_at DESC
    ) INTO v_result
    FROM public.error_logs e
    LEFT JOIN public.profiles p ON p.id = e.user_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_admin_error_logs() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_error_logs() TO authenticated;

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

    UPDATE public.error_logs SET status = 'RESOLVED' WHERE id = p_report_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_error_report(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_error_report(uuid) TO authenticated;
