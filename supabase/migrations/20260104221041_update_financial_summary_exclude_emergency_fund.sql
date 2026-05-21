-- Atualizar função get_monthly_financial_summary para excluir EMERGENCY_FUND
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
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(balance)
      FROM public.accounts
      WHERE user_id = p_user_id
        AND is_active = true
        AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        AND (is_international = false OR is_international IS NULL)
    ), 0) AS total_balance,
    
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'INCOME'
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
    ), 0) AS total_income,
    
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'EXPENSE'
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
    ), 0) AS total_expenses,
    
    COALESCE((
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type IN ('INCOME', 'EXPENSE')
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
    ), 0) AS net_savings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;;
