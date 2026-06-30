-- Migration: Correção do tipo de conta na criação
-- O erro "column type is of type public.account_type but expression is of type text"
-- acontece porque passamos um parâmetro TEXT para o RPC e depois inserimos em uma coluna ENUM.
-- O PostgreSQL exige o cast explícito.

CREATE OR REPLACE FUNCTION public.create_account_with_balance(
  p_name TEXT,
  p_type TEXT,
  p_initial_balance NUMERIC DEFAULT 0,
  p_bank_id TEXT DEFAULT NULL,
  p_bank_color TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT 'BRL',
  p_is_international BOOLEAN DEFAULT false,
  p_closing_day INTEGER DEFAULT NULL,
  p_due_day INTEGER DEFAULT NULL,
  p_credit_limit NUMERIC DEFAULT NULL,
  p_yield_rate NUMERIC DEFAULT NULL,
  p_yield_type TEXT DEFAULT NULL,
  p_hide_balance BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
  v_category_id UUID;
  v_today TEXT;
  v_competence TEXT;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 1. Criar a conta (com cast do tipo)
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

  -- 2. Se tem saldo inicial e não é cartão de crédito, criar transação
  IF p_initial_balance > 0 AND p_type != 'CREDIT_CARD' THEN
    -- Buscar categoria "Saldo Inicial"
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = v_user_id
      AND name = 'Saldo Inicial'
      AND type = 'income'
    LIMIT 1;

    v_today := to_char(NOW(), 'YYYY-MM-DD');
    v_competence := to_char(DATE_TRUNC('month', NOW()), 'YYYY-MM-DD');

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

  -- 3. Retornar a conta criada
  SELECT row_to_json(a) INTO v_result
  FROM public.accounts a
  WHERE a.id = v_account_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_account_with_balance TO authenticated;
