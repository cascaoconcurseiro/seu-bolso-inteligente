-- Corrigir função get_monthly_financial_summary para excluir transações internacionais
-- O problema: estava somando USD com BRL no saldo do mês

DROP FUNCTION IF EXISTS public.get_monthly_financial_summary(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_balance NUMERIC,
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_savings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC := 0;
  v_income NUMERIC := 0;
  v_expenses NUMERIC := 0;
BEGIN
  -- Saldo atual (apenas contas BRL, excluindo cartões e internacionais)
  SELECT COALESCE(SUM(balance), 0) INTO v_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type != 'CREDIT_CARD'
    AND (is_international = false OR is_international IS NULL);

  -- Receitas do mês (apenas BRL)
  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'INCOME'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- Despesas do mês (apenas BRL)
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  RETURN QUERY SELECT 
    v_balance,
    v_income,
    v_expenses,
    v_income - v_expenses;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_financial_summary IS 
'Calcula resumo financeiro mensal (apenas BRL, excluindo transações internacionais)';

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;;
