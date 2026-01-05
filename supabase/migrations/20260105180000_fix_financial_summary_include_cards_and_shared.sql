-- Fix: Incluir faturas de cartão e saldo líquido de compartilhados no resumo mensal
-- Problema: Saldo do mês não considera faturas de cartão nem compartilhados
-- Solução: Adicionar faturas que vencem no mês + créditos e débitos compartilhados

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
  v_current_day INTEGER;
  v_card_invoices NUMERIC := 0;
  v_shared_credits NUMERIC := 0;
  v_shared_debts NUMERIC := 0;
BEGIN
  v_start_month := DATE_TRUNC('month', p_start_date)::DATE;
  v_end_month := DATE_TRUNC('month', p_end_date)::DATE;
  v_current_day := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

  -- Calcular faturas de cartão que vencem no mês
  SELECT COALESCE(SUM(ABS(balance)), 0) INTO v_card_invoices
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type = 'CREDIT_CARD'
    AND is_active = true
    AND balance < 0
    AND (is_international = false OR is_international IS NULL)
    AND (currency = 'BRL' OR currency IS NULL)
    AND (
      -- Fatura fecha e vence no mês atual
      (due_day > closing_day AND v_current_day > closing_day AND 
       DATE_TRUNC('month', CURRENT_DATE)::DATE = v_start_month)
      OR
      -- Fatura fecha no mês anterior e vence no mês atual
      (due_day <= closing_day AND v_current_day > closing_day AND
       DATE_TRUNC('month', CURRENT_DATE)::DATE = v_start_month)
    );

  -- Calcular compartilhados a RECEBER (créditos)
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
       (t.competence_date + interval '1 month')::date >= v_start_month AND
       (t.competence_date + interval '1 month')::date <= v_end_month)
      OR
      ((a.type != 'CREDIT_CARD' OR a.type IS NULL) AND
       t.competence_date >= v_start_month AND
       t.competence_date <= v_end_month)
    );

  -- Calcular compartilhados a PAGAR (débitos)
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
       (t.competence_date + interval '1 month')::date >= v_start_month AND
       (t.competence_date + interval '1 month')::date <= v_end_month)
      OR
      ((a.type != 'CREDIT_CARD' OR a.type IS NULL) AND
       t.competence_date >= v_start_month AND
       t.competence_date <= v_end_month)
    );

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
    
    -- Receitas = receitas normais + créditos compartilhados
    COALESCE((
      SELECT SUM(amount)
      FROM credit_card_transactions
      WHERE type = 'INCOME'
        AND effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) + v_shared_credits AS total_income,
    
    -- Despesas = despesas normais + faturas cartão + débitos compartilhados
    COALESCE((
      SELECT SUM(amount)
      FROM credit_card_transactions
      WHERE type = 'EXPENSE'
        AND effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) + v_card_invoices + v_shared_debts AS total_expenses,
    
    -- Saldo líquido
    COALESCE((
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
      FROM credit_card_transactions
      WHERE effective_date >= v_start_month
        AND effective_date <= v_end_month
    ), 0) + v_shared_credits - v_card_invoices - v_shared_debts AS net_savings;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_financial_summary IS 
'Calcula resumo mensal incluindo faturas de cartão e saldo líquido de compartilhados';

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;
