-- Modificar get_monthly_financial_summary para usar data de vencimento em transações de cartão
-- Problema: Transações de cartão afetam o saldo no mês da compra, mas deveriam afetar no mês do vencimento
-- Solução: Calcular data de vencimento dinamicamente e filtrar por ela

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
  -- Extrair o primeiro dia do mês de início e fim
  v_start_month := DATE_TRUNC('month', p_start_date)::DATE;
  v_end_month := DATE_TRUNC('month', p_end_date)::DATE;

  RETURN QUERY
  WITH credit_card_transactions AS (
    -- Calcular data de vencimento para transações de cartão de crédito
    SELECT 
      t.id,
      t.amount,
      t.type,
      t.currency,
      -- Calcular mês de vencimento baseado na lógica do cartão
      CASE 
        WHEN a.type = 'CREDIT_CARD' THEN
          CASE
            -- Se dia da transação <= closing_day: entra na fatura deste mês
            WHEN EXTRACT(DAY FROM t.date::DATE) <= COALESCE(a.closing_day, 1) THEN
              CASE
                -- Se due_day > closing_day: vence no mesmo mês
                WHEN COALESCE(a.due_day, 10) > COALESCE(a.closing_day, 1) THEN
                  DATE_TRUNC('month', t.date::DATE)::DATE
                -- Senão: vence no próximo mês
                ELSE
                  (DATE_TRUNC('month', t.date::DATE) + INTERVAL '1 month')::DATE
              END
            -- Se dia da transação > closing_day: entra na fatura do próximo mês
            ELSE
              CASE
                -- Se due_day > closing_day: vence no próximo mês
                WHEN COALESCE(a.due_day, 10) > COALESCE(a.closing_day, 1) THEN
                  (DATE_TRUNC('month', t.date::DATE) + INTERVAL '1 month')::DATE
                -- Senão: vence em 2 meses
                ELSE
                  (DATE_TRUNC('month', t.date::DATE) + INTERVAL '2 months')::DATE
              END
          END
        -- Para outras contas, usar competence_date
        ELSE t.competence_date
      END AS effective_date
    FROM public.transactions t
    LEFT JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.type IN ('INCOME', 'EXPENSE')
      AND (t.currency = 'BRL' OR t.currency IS NULL)
      AND t.source_transaction_id IS NULL
  )
  SELECT
    -- Saldo total (excluindo cartões de crédito e reserva de emergência)
    COALESCE((
      SELECT SUM(balance)
      FROM public.accounts
      WHERE user_id = p_user_id
        AND is_active = true
        AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        AND (is_international = false OR is_international IS NULL)
    ), 0) AS total_balance,
    
    -- Total de receitas no período (usando effective_date)
    COALESCE((
      SELECT SUM(amount)
      FROM credit_card_transactions
      WHERE type = 'INCOME'
        AND effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) AS total_income,
    
    -- Total de despesas no período (usando effective_date)
    COALESCE((
      SELECT SUM(amount)
      FROM credit_card_transactions
      WHERE type = 'EXPENSE'
        AND effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) AS total_expenses,
    
    -- Economia líquida (receitas - despesas)
    COALESCE((
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
      FROM credit_card_transactions
      WHERE effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) AS net_savings;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_financial_summary IS 
'Calcula resumo financeiro mensal (BRL apenas). Para cartões de crédito, usa data de vencimento da fatura.';

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;;
