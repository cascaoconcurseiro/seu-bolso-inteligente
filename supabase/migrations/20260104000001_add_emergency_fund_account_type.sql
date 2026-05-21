-- Adicionar tipo de conta "EMERGENCY_FUND" (Reserva de Emergência)
-- Este tipo de conta não aparece no saldo geral nem nas transações normais

-- Adicionar novo valor ao enum account_type
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'EMERGENCY_FUND';

-- Comentário explicativo
COMMENT ON TYPE public.account_type IS 
'Tipos de conta: CHECKING (Corrente), SAVINGS (Poupança), CREDIT_CARD (Cartão de Crédito), INVESTMENT (Investimento), CASH (Dinheiro), EMERGENCY_FUND (Reserva de Emergência)';

-- Atualizar função get_monthly_projection para excluir EMERGENCY_FUND do saldo
DROP FUNCTION IF EXISTS public.get_monthly_projection(UUID, DATE);

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

  -- =====================================================
  -- 1. SALDO ATUAL (Apenas BRL, excluindo EMERGENCY_FUND)
  -- =====================================================
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (is_international = false OR is_international IS NULL)
    AND (currency = 'BRL' OR currency IS NULL);

  -- =====================================================
  -- 2. RECEITAS FUTURAS DO MÊS
  -- =====================================================
  SELECT COALESCE(SUM(amount), 0) INTO v_future_income
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'INCOME'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- =====================================================
  -- 3. DESPESAS FUTURAS DO MÊS
  -- =====================================================
  SELECT COALESCE(SUM(amount), 0) INTO v_future_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- =====================================================
  -- 4. FATURAS DE CARTÃO PENDENTES (Apenas BRL)
  -- =====================================================
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

  -- =====================================================
  -- 5. COMPARTILHADOS A PAGAR (APENAS BRL E DO MÊS)
  -- =====================================================
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_shared_debts
  FROM public.transaction_splits ts
  INNER JOIN public.transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_user_id
    AND (ts.settled_by_debtor = false OR ts.settled_by_debtor IS NULL)
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.trip_id IS NULL
    AND t.competence_date >= v_start_of_month
    AND t.competence_date <= p_end_date;

  -- =====================================================
  -- CÁLCULO FINAL
  -- =====================================================
  v_projected := v_current_balance 
               + v_future_income 
               - v_future_expenses 
               - v_credit_invoices 
               - v_shared_debts;

  RETURN QUERY SELECT 
    v_current_balance,
    v_future_income,
    v_future_expenses,
    v_credit_invoices,
    v_shared_debts,
    v_projected;
END;
$$;

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
    -- Saldo total (excluindo cartões de crédito e reserva de emergência)
    COALESCE((
      SELECT SUM(balance)
      FROM public.accounts
      WHERE user_id = p_user_id
        AND is_active = true
        AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        AND (is_international = false OR is_international IS NULL)
    ), 0) AS total_balance,
    
    -- Total de receitas no período
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
    
    -- Total de despesas no período
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
    
    -- Economia líquida (receitas - despesas)
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

GRANT EXECUTE ON FUNCTION public.get_monthly_projection TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;
