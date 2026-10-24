-- Keep SECURITY DEFINER goal and withdrawal operations scoped to live accounts
-- owned by the caller. Foreign keys only establish existence, not ownership.
CREATE OR REPLACE FUNCTION public.contribute_to_goal(
  p_goal_id uuid,
  p_amount numeric,
  p_account_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_goal record;
  v_account_id uuid;
  v_account_currency text;
  v_category_id uuid;
  v_today date;
  v_competence date;
  v_new_amount numeric;
  v_is_completed boolean;
  v_tx_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'O valor deve ser diferente de zero' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(goal.current_amount, 0) AS current_amount,
         goal.target_amount, goal.name, goal.linked_account_id
  INTO v_goal
  FROM public.goals AS goal
  WHERE goal.id = p_goal_id AND goal.user_id = v_user_id AND goal.deleted = false
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF p_amount < 0 AND abs(p_amount) > v_goal.current_amount THEN
    RAISE EXCEPTION 'Resgate excede o saldo disponível na meta' USING ERRCODE = '22023';
  END IF;
  v_new_amount := v_goal.current_amount + p_amount;
  v_is_completed := v_new_amount >= v_goal.target_amount;

  v_account_id := COALESCE(p_account_id, v_goal.linked_account_id);
  IF v_account_id IS NOT NULL THEN
    SELECT account.currency INTO v_account_currency
    FROM public.accounts AS account
    WHERE account.id = v_account_id
      AND account.user_id = v_user_id
      AND account.deleted_at IS NULL
      AND account.is_active = true
      AND COALESCE(account.is_archived, false) = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta não encontrada ou indisponível' USING ERRCODE = '42501';
    END IF;

    SELECT category.id INTO v_category_id
    FROM public.categories AS category
    WHERE category.user_id = v_user_id AND category.name ILIKE '%meta%'
    LIMIT 1;

    v_today := (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date;
    v_competence := pg_catalog.date_trunc('month', v_today)::date;
    INSERT INTO public.transactions (
      user_id, creator_user_id, account_id, type, amount, description,
      category_id, date, competence_date, domain, is_shared, is_installment,
      is_recurring, currency, notes, goal_id
    ) VALUES (
      v_user_id, v_user_id, v_account_id,
      (CASE WHEN p_amount > 0 THEN 'EXPENSE' ELSE 'INCOME' END)::public.transaction_type,
      abs(p_amount),
      COALESCE(p_description, CASE WHEN p_amount > 0 THEN 'Aporte: ' ELSE 'Resgate: ' END || v_goal.name),
      v_category_id, v_today, v_competence, 'PERSONAL'::public.transaction_domain,
      false, false, false, COALESCE(v_account_currency, 'BRL'),
      CASE WHEN p_amount > 0 THEN 'Contribuição para a meta' ELSE 'Resgate da meta para a conta' END,
      p_goal_id
    ) RETURNING id INTO v_tx_id;
  END IF;

  UPDATE public.goals
  SET current_amount = v_new_amount,
      status = CASE WHEN v_is_completed THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
      completed_at = CASE WHEN v_is_completed THEN pg_catalog.now() ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_goal_id AND user_id = v_user_id;

  RETURN pg_catalog.jsonb_build_object(
    'goal_id', p_goal_id, 'current_amount', v_new_amount,
    'is_completed', v_is_completed, 'transaction_id', v_tx_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.withdraw_from_account(
  p_account_id uuid,
  p_amount numeric,
  p_description text,
  p_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_tx_id uuid;
  v_balance numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_date IS NULL THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'Valor e data válidos são obrigatórios');
  END IF;
  SELECT account.balance INTO v_balance
  FROM public.accounts AS account
  WHERE account.id = p_account_id AND account.user_id = v_user_id
    AND account.deleted_at IS NULL AND account.is_active = true
    AND COALESCE(account.is_archived, false) = false
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'Conta não encontrada ou indisponível');
  END IF;
  IF p_amount > COALESCE(v_balance, 0) THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'Valor excede o saldo disponível');
  END IF;

  INSERT INTO public.transactions (
    user_id, creator_user_id, account_id, type, amount, description,
    date, competence_date, domain
  ) VALUES (
    v_user_id, v_user_id, p_account_id, 'EXPENSE', p_amount,
    COALESCE(NULLIF(pg_catalog.btrim(p_description), ''), 'Retirada'), p_date,
    pg_catalog.date_trunc('month', p_date)::date, 'PERSONAL'
  ) RETURNING id INTO v_tx_id;
  RETURN pg_catalog.json_build_object('success', true, 'transaction_id', v_tx_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.contribute_to_goal(uuid, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contribute_to_goal(uuid, numeric, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.withdraw_from_account(uuid, numeric, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_from_account(uuid, numeric, text, date) TO authenticated;
