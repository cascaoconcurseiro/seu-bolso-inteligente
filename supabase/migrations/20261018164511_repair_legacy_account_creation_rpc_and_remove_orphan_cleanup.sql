-- Keep the current account-creation RPC's opening transaction in the account's
-- currency. The published body relies on transactions.currency's BRL default.
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
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_category_id uuid;
  v_is_international boolean := COALESCE(p_is_international, false);
  v_currency text := CASE
    WHEN COALESCE(p_is_international, false) THEN COALESCE(p_currency, 'BRL')
    ELSE 'BRL'
  END;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.accounts (
    user_id, name, type, balance, initial_balance,
    bank_id, bank_color, currency, is_international,
    closing_day, due_day, credit_limit,
    yield_rate, yield_type, hide_balance
  ) VALUES (
    v_user_id, p_name, p_type::public.account_type, 0, 0,
    p_bank_id, p_bank_color, v_currency, v_is_international,
    p_closing_day, p_due_day, p_credit_limit,
    p_yield_rate, p_yield_type, p_hide_balance
  )
  RETURNING id INTO v_account_id;

  IF COALESCE(p_initial_balance, 0) > 0 AND p_type <> 'CREDIT_CARD' THEN
    SELECT category.id INTO v_category_id
    FROM public.categories AS category
    WHERE category.user_id = v_user_id
      AND category.name = 'Saldo Inicial'
      AND category.type = 'income'
    LIMIT 1;

    INSERT INTO public.transactions (
      user_id, creator_user_id, account_id, type, amount,
      description, category_id, date, competence_date, currency,
      domain, is_shared, is_installment, is_recurring
    ) VALUES (
      v_user_id, v_user_id, v_account_id, 'INCOME', p_initial_balance,
      'Saldo inicial', v_category_id, CURRENT_DATE,
      date_trunc('month', CURRENT_DATE)::date, v_currency,
      'PERSONAL', false, false, false
    );
  END IF;

  SELECT to_jsonb(account) INTO v_result
  FROM public.accounts AS account
  WHERE account.id = v_account_id;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_account_with_balance(
  text, text, numeric, text, text, text, boolean, integer, integer,
  numeric, numeric, text, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_with_balance(
  text, text, numeric, text, text, text, boolean, integer, integer,
  numeric, numeric, text, boolean
) TO authenticated, service_role;

-- Preserve the legacy account-creation RPC while routing it through the current
-- atomic implementation. The old body writes the removed transactions.category
-- column and returns success:false for accounts with an initial balance.
CREATE OR REPLACE FUNCTION public.create_account_with_initial_deposit(
  p_name text,
  p_type text,
  p_bank text DEFAULT NULL,
  p_initial_balance numeric DEFAULT 0,
  p_currency text DEFAULT 'BRL'
)
RETURNS json
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT public.create_account_with_balance(
    p_name,
    p_type,
    COALESCE(p_initial_balance, 0),
    p_bank,
    NULL,
    COALESCE(p_currency, 'BRL'),
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    false
  )::json;
$function$;

REVOKE ALL ON FUNCTION public.create_account_with_initial_deposit(
  text, text, text, numeric, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_with_initial_deposit(
  text, text, text, numeric, text
) TO authenticated, service_role;

-- This orphan cleanup function targets a table removed from the schema. It has
-- no frontend caller or scheduled job and fails at runtime for every caller.
DROP FUNCTION IF EXISTS public.cleanup_old_pending_operations();

NOTIFY pgrst, 'reload schema';
