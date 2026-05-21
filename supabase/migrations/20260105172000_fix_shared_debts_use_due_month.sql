-- Fix: Usar mês de vencimento para compartilhados de cartão de crédito
-- Problema: Projeção de janeiro conta transações que aparecem em fevereiro no Compartilhados
-- Solução: Calcular mês de vencimento igual à página Compartilhados

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

  -- 🔧 CORREÇÃO: Compartilhados a pagar usando mês de vencimento
  -- Para cartão de crédito: calcular mês de vencimento (competence_date + 1 mês)
  -- Para outros: usar competence_date
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
      -- Para cartão de crédito: usar mês de vencimento (competence_date + 1 mês)
      (a.type = 'CREDIT_CARD' AND 
       (t.competence_date + interval '1 month')::date >= v_start_of_month AND
       (t.competence_date + interval '1 month')::date <= v_end_of_month)
      OR
      -- Para outros tipos: usar competence_date normal
      (a.type != 'CREDIT_CARD' AND
       t.competence_date >= v_start_of_month AND
       t.competence_date <= v_end_of_month)
      OR
      -- Se não tem conta (caso raro): usar competence_date
      (a.id IS NULL AND
       t.competence_date >= v_start_of_month AND
       t.competence_date <= v_end_of_month)
    );

  v_projected := v_current_balance + v_future_income - v_future_expenses - v_credit_invoices - v_shared_debts;

  RETURN QUERY SELECT v_current_balance, v_future_income, v_future_expenses, v_credit_invoices, v_shared_debts, v_projected;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_projection IS 
  'Calcula projeção do fim do mês usando mês de vencimento para cartões (igual Compartilhados)';
