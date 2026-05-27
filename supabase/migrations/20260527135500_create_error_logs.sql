-- Migration: 20260527135500_create_error_logs.sql
-- Tabela para armazenar relatórios de erros enviados pelos usuários

CREATE TABLE IF NOT EXISTS public.error_logs (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    error_name text NOT NULL,
    error_message text NOT NULL,
    component_stack text,
    user_message text,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'IGNORED')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem criar seus próprios relatórios de erros
CREATE POLICY "Users can insert their own error logs" 
ON public.error_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can read
CREATE POLICY "Admins can read all logs" 
ON public.error_logs FOR SELECT 
USING (true);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);

-- RPC for admin to get logs
CREATE OR REPLACE FUNCTION public.get_admin_error_logs(admin_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    IF admin_password != '909496' THEN RAISE EXCEPTION 'Senha administrativa inválida'; END IF;

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

-- RPC for admin to resolve report
CREATE OR REPLACE FUNCTION public.resolve_error_report(admin_password text, p_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF admin_password != '909496' THEN RAISE EXCEPTION 'Senha administrativa inválida'; END IF;

    UPDATE error_logs SET status = 'RESOLVED' WHERE id = p_report_id;
END;
$function$;
