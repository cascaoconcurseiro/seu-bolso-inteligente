-- ============================================================
-- Migration: Fix cast on contribute_to_goal RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.contribute_to_goal(
  p_goal_id UUID,
  p_amount NUMERIC,
  p_account_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_goal RECORD;
  v_new_amount NUMERIC;
  v_is_completed BOOLEAN;
  v_category_id UUID;
  v_account_currency TEXT;
  v_today TEXT;
  v_competence TEXT;
  v_tx_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'O valor deve ser diferente de zero';
  END IF;

  -- 1. Buscar meta (com lock para evitar race condition)
  SELECT current_amount, target_amount, name, linked_account_id
  INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  -- 2. Validar resgate não excede saldo
  IF p_amount < 0 AND ABS(p_amount) > v_goal.current_amount THEN
    RAISE EXCEPTION 'Resgate de % excede o saldo disponível na meta (%)',
      ABS(p_amount), v_goal.current_amount;
  END IF;

  v_new_amount := v_goal.current_amount + p_amount;
  v_is_completed := v_new_amount >= v_goal.target_amount;

  -- 3. Se tem conta associada, criar transação financeira
  IF p_account_id IS NOT NULL OR v_goal.linked_account_id IS NOT NULL THEN
    -- Buscar moeda da conta
    SELECT currency INTO v_account_currency
    FROM public.accounts
    WHERE id = COALESCE(p_account_id, v_goal.linked_account_id)
      AND user_id = v_user_id;

    -- Buscar categoria "Metas"
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = v_user_id
      AND name ILIKE '%meta%'
    LIMIT 1;

    v_today := to_char(NOW(), 'YYYY-MM-DD');
    v_competence := to_char(DATE_TRUNC('month', NOW()), 'YYYY-MM-DD');

    INSERT INTO public.transactions (
      user_id, creator_user_id, account_id, type, amount,
      description, category_id, date, competence_date,
      domain, is_shared, is_installment, is_recurring,
      currency, notes, goal_id
    ) VALUES (
      v_user_id, v_user_id,
      COALESCE(p_account_id, v_goal.linked_account_id),
      (CASE WHEN p_amount > 0 THEN 'EXPENSE' ELSE 'INCOME' END)::public.transaction_type,
      ABS(p_amount),
      COALESCE(p_description,
        CASE WHEN p_amount > 0
          THEN 'Aporte: ' || v_goal.name
          ELSE 'Resgate: ' || v_goal.name
        END
      ),
      v_category_id, v_today, v_competence,
      'PERSONAL'::public.transaction_domain, false, false, false,
      COALESCE(v_account_currency, 'BRL'),
      CASE WHEN p_amount > 0
        THEN 'Contribuição para a meta "' || v_goal.name || '"'
        ELSE 'Resgate da meta "' || v_goal.name || '" para a conta'
      END,
      p_goal_id
    )
    RETURNING id INTO v_tx_id;
  END IF;

  -- 4. Atualizar meta
  UPDATE public.goals
  SET current_amount = v_new_amount,
      status = CASE WHEN v_is_completed THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
      completed_at = CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_goal_id;

  -- 5. Retornar resultado
  SELECT jsonb_build_object(
    'goal_id', p_goal_id,
    'current_amount', v_new_amount,
    'is_completed', v_is_completed,
    'transaction_id', v_tx_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;
