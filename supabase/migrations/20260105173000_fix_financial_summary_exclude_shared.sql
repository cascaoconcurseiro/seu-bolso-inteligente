-- Fix: Excluir transações compartilhadas do resumo financeiro mensal
-- Problema: Saldo do mês inclui despesas pagas por outros
-- Solução: Filtrar is_shared e payer_id

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
  v_start_month DATE;
  v_end_month DATE;
BEGIN
  v_start_month := DATE_TRUNC('month', p_start_date)::DATE;
  v_end_month := DATE_TRUNC('month', p_end_date)::DATE;

  RETURN QUERY
  WITH credit_card_transactions AS (
    SELECT 
      t.id,
      t.amount,
      t.type,
      t.currency,
      CASE 
        WHEN a.type = 'CREDIT_CARD' THEN
          CASE
            WHEN EXTRACT(DAY FROM t.date::DATE) <= COALESCE(a.closing_day, 1) THEN
              CASE
                WHEN COALESCE(a.due_day, 10) > COALESCE(a.closing_day, 1) THEN
                  DATE_TRUNC('month', t.date::DATE)::DATE
                ELSE
                  (DATE_TRUNC('month', t.date::DATE) + INTERVAL '1 month')::DATE
              END
            ELSE
              CASE
                WHEN COALESCE(a.due_day, 10) > COALESCE(a.closing_day, 1) THEN
                  (DATE_TRUNC('month', t.date::DATE) + INTERVAL '1 month')::DATE
                ELSE
                  (DATE_TRUNC('month', t.date::DATE) + INTERVAL '2 months')::DATE
              END
          END
        ELSE t.competence_date
      END AS effective_date
    FROM public.transactions t
    LEFT JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.type IN ('INCOME', 'EXPENSE')
      AND (t.currency = 'BRL' OR t.currency IS NULL)
      AND t.source_transaction_id IS NULL
      -- 🔧 FILTROS CRÍTICOS: Excluir compartilhadas
      AND (t.is_shared = false OR t.is_shared IS NULL)
      AND t.payer_id IS NULL
  )
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
      FROM credit_card_transactions
      WHERE type = 'INCOME'
        AND effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) AS total_income,
    
    COALESCE((
      SELECT SUM(amount)
      FROM credit_card_transactions
      WHERE type = 'EXPENSE'
        AND effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) AS total_expenses,
    
    COALESCE((
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
      FROM credit_card_transactions
      WHERE effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) AS net_savings;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_financial_summary IS 
'Calcula resumo financeiro mensal (BRL apenas, excluindo compartilhadas). Para cartões, usa data de vencimento.';

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;
