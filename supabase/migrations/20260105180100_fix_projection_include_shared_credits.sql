-- Fix: Incluir créditos compartilhados na projeção
-- Problema: Projeção só conta débitos, não desconta créditos
-- Solução: Calcular saldo líquido (débitos - créditos)

CREATE OR REPLACE FUNCTION public.get_monthly_projection(
  p_user_id UUID,
  p_end_date DATE
)
RETURNS TABLE (
  current_balance NUMERIC,
  future_income NUMERIC,
  future_expenses NUMERIC,
  credit_card_invoices NUMERIC,
  shared_debts NUMERIC,
  projected_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC := 0;
  v_future_income NUMERIC := 0;
  v_future_expenses NUMERIC := 0;
  v_credit_invoices NUMERIC := 0;
  v_shared_debts NUMERIC := 0;
  v_shared_credits NUMERIC := 0;
  v_shared_net NUMERIC := 0;
  v_projected NUMERIC := 0;
  v_start_of_month DATE;
  v_end_of_month DATE;
  v_current_day INTEGER;
BEGIN
  v_start_of_month := date_trunc('month', p_end_date)::date;
  v_end_of_month := (date_trunc('month', p_end_date) + interval '1 month - 1 day')::date;
  v_current_day := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

  -- Saldo atual (excluindo CREDIT_CARD e EMERGENCY_FUND)
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (is_international = false OR is_international IS NULL)
    AND (currency = 'BRL' OR currency IS NULL);

  -- Receitas futuras
  SELECT COALESCE(SUM(amount), 0) INTO v_future_income
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'INCOME'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- Despesas futuras
  SELECT COALESCE(SUM(amount), 0) INTO v_future_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- Faturas de cartão pendentes
  SELECT COALESCE(SUM(ABS(balance)), 0) INTO v_credit_invoices
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type = 'CREDIT_CARD'
    AND is_active = true
    AND balance < 0
    AND (is_international = false OR is_international IS NULL)
    AND (currency = 'BRL' OR currency IS NULL)
    AND (
      (due_day > closing_day AND v_current_day > closing_day)
      OR
      (due_day <= closing_day AND v_current_day > closing_day)
    );

  -- Compartilhados a RECEBER (créditos)
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_shared_credits
  FROM public.transaction_splits ts
  INNER JOIN public.transactions t ON t.id = ts.transaction_id
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.creator_user_id = p_user_id
    AND ts.user_id != p_user_id
    AND ts.is_settled = false
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.trip_id IS NULL
    AND (
      (a.type = 'CREDIT_CARD' AND 
       (t.competence_date + interval '1 month')::date >= v_start_of_month AND
       (t.competence_date + interval '1 month')::date <= p_end_date)
      OR
      ((a.type != 'CREDIT_CARD' OR a.type IS NULL) AND
       t.competence_date >= v_start_of_month AND
       t.competence_date <= p_end_date)
    );

  -- Compartilhados a PAGAR (débitos)
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_shared_debts
  FROM public.transaction_splits ts
  INNER JOIN public.transactions t ON t.id = ts.transaction_id
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE ts.user_id = p_user_id
    AND t.creator_user_id != p_user_id
    AND ts.is_settled = false
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.trip_id IS NULL
    AND (
      (a.type = 'CREDIT_CARD' AND 
       (t.competence_date + interval '1 month')::date >= v_start_of_month AND
       (t.competence_date + interval '1 month')::date <= p_end_date)
      OR
      ((a.type != 'CREDIT_CARD' OR a.type IS NULL) AND
       t.competence_date >= v_start_of_month AND
       t.competence_date <= p_end_date)
    );

  -- Saldo líquido compartilhados (débitos - créditos)
  -- Se positivo: vou receber mais do que pagar
  -- Se negativo: vou pagar mais do que receber
  v_shared_net := v_shared_debts - v_shared_credits;

  v_projected := v_current_balance + v_future_income - v_future_expenses - v_credit_invoices - v_shared_net;

  RETURN QUERY SELECT v_current_balance, v_future_income, v_future_expenses, v_credit_invoices, v_shared_net, v_projected;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_projection IS 
  'Calcula projeção incluindo saldo líquido de compartilhados (débitos - créditos)';
