-- Smoke test encontrou 6 bugs em funções que falhavam silenciosamente.
-- Todos corrigidos aqui em batch único.

-- ================================================================
-- FIX 1: create_account_with_balance — TEXT → DATE para date/competence_date
-- Com SET search_path TO '', casts implícitos text→date não funcionam.
-- ================================================================
CREATE OR REPLACE FUNCTION public.create_account_with_balance(
  p_name text,
  p_type text,
  p_initial_balance numeric DEFAULT 0,
  p_bank_id text DEFAULT NULL,
  p_bank_color text DEFAULT NULL,
  p_currency text DEFAULT 'BRL',
  p_is_international boolean DEFAULT false,
  p_closing_day integer DEFAULT NULL,
  p_due_day integer DEFAULT NULL,
  p_credit_limit numeric DEFAULT NULL,
  p_yield_rate numeric DEFAULT NULL,
  p_yield_type text DEFAULT NULL,
  p_hide_balance boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
  v_category_id UUID;
  v_today DATE;
  v_competence DATE;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  INSERT INTO public.accounts (
    user_id, name, type, balance, initial_balance,
    bank_id, bank_color, currency, is_international,
    closing_day, due_day, credit_limit,
    yield_rate, yield_type, hide_balance
  ) VALUES (
    v_user_id, p_name, p_type::public.account_type, 0, 0,
    p_bank_id, p_bank_color, p_currency, p_is_international,
    p_closing_day, p_due_day, p_credit_limit,
    p_yield_rate, p_yield_type, p_hide_balance
  )
  RETURNING id INTO v_account_id;

  IF p_initial_balance > 0 AND p_type != 'CREDIT_CARD' THEN
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = v_user_id
      AND name = 'Saldo Inicial'
      AND type = 'income'
    LIMIT 1;

    v_today := CURRENT_DATE;
    v_competence := DATE_TRUNC('month', CURRENT_DATE);

    INSERT INTO public.transactions (
      user_id, creator_user_id, account_id, type, amount,
      description, category_id, date, competence_date,
      domain, is_shared, is_installment, is_recurring
    ) VALUES (
      v_user_id, v_user_id, v_account_id, 'INCOME', p_initial_balance,
      'Saldo inicial', v_category_id, v_today, v_competence,
      'PERSONAL', false, false, false
    );
  END IF;

  SELECT row_to_json(a) INTO v_result
  FROM public.accounts a
  WHERE a.id = v_account_id;

  RETURN v_result;
END;
$function$;

-- ================================================================
-- FIX 2: search_transactions — cast type enum para text no RETURN
-- ================================================================
CREATE OR REPLACE FUNCTION public.search_transactions(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, description text, amount numeric, type text, date date, currency text, category_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.description,
    t.amount,
    t.type::text,
    t.date,
    t.currency,
    t.category_id
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.description ILIKE '%' || p_query || '%'
  ORDER BY t.date DESC
  LIMIT p_limit;
END;
$function$;

-- ================================================================
-- FIX 3: recalculate_all_balances — coluna deleted não existe, usar deleted_at
-- ================================================================
CREATE OR REPLACE FUNCTION public.recalculate_all_balances(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_account_id UUID;
BEGIN
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    FOR v_account_id IN
        SELECT id FROM accounts WHERE user_id = p_user_id AND deleted_at IS NULL
    LOOP
        PERFORM calculate_single_account_balance(v_account_id);
    END LOOP;
END;
$function$;

-- ================================================================
-- FIX 4: submit_error_report — tabela error_reports não existe, usar error_logs
-- ================================================================
CREATE OR REPLACE FUNCTION public.submit_error_report(p_error_message text, p_stack_trace text, p_context text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_report_id uuid;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO public.error_logs (user_id, error_type, message, stack, extra)
  VALUES (
    v_user_id,
    COALESCE(p_context, 'frontend'),
    p_error_message,
    p_stack_trace,
    jsonb_build_object('source', 'submit_error_report')
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$function$;

-- ================================================================
-- FIX 5: set_pin — gen_salt/crypt precisam de extensions. prefix
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_pin(p_pin text, p_require_on_open boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'PIN must be at least 4 digits' USING ERRCODE = 'P0002';
  END IF;

  IF p_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PIN must contain only digits' USING ERRCODE = 'P0003';
  END IF;

  UPDATE profiles
  SET
    app_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
    require_pin_on_open = p_require_on_open
  WHERE id = auth.uid();

  RETURN true;
END;
$function$;

-- ================================================================
-- FIX 5b: verify_pin — crypt precisa de extensions. prefix
-- ================================================================
CREATE OR REPLACE FUNCTION public.verify_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pin_hash TEXT;
  v_locked_until TIMESTAMPTZ;
  v_attempts INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT locked_until INTO v_locked_until
  FROM pin_attempts WHERE user_id = auth.uid();

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RAISE EXCEPTION 'Conta bloqueada temporariamente. Tente novamente em % segundos.',
      EXTRACT(EPOCH FROM (v_locked_until - NOW()))::INT
      USING ERRCODE = 'P0004';
  END IF;

  SELECT app_pin_hash INTO v_pin_hash
  FROM profiles WHERE id = auth.uid();

  IF v_pin_hash IS NULL THEN
    RETURN false;
  END IF;

  IF extensions.crypt(p_pin, v_pin_hash) = v_pin_hash THEN
    DELETE FROM pin_attempts WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  INSERT INTO pin_attempts (user_id, attempt_count, last_attempt_at)
  VALUES (auth.uid(), 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET attempt_count = pin_attempts.attempt_count + 1,
      last_attempt_at = NOW();

  SELECT attempt_count INTO v_attempts
  FROM pin_attempts WHERE user_id = auth.uid();

  IF v_attempts >= 5 THEN
    UPDATE pin_attempts
    SET locked_until = NOW() + INTERVAL '60 seconds',
        attempt_count = 0
    WHERE user_id = auth.uid();
  END IF;

  RETURN false;
END;
$function$;

-- ================================================================
-- FIX 6: soft_delete_account — deletar transações ANTES da conta
-- O trigger prevent_delete_if_has_transactions bloqueia se houver
-- transações ativas no momento do UPDATE na conta.
-- ================================================================
CREATE OR REPLACE FUNCTION public.soft_delete_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Conta não encontrada ou sem permissão';
  END IF;

  UPDATE transactions
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND deleted_at IS NULL;

  UPDATE accounts
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = p_account_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';
