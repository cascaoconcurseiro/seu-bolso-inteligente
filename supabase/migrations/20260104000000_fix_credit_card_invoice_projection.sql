-- Corrigir função get_monthly_projection para considerar apenas faturas que vencem no mês atual
-- Problema: Fatura de janeiro com vencimento em fevereiro aparece na previsão de janeiro
-- Solução: Considerar apenas faturas cujo vencimento (due_day) está no mês da projeção

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
  -- Definir inicio e fim do mes para filtro
  v_start_of_month := date_trunc('month', p_end_date)::date;
  v_end_of_month := (date_trunc('month', p_end_date) + interval '1 month - 1 day')::date;
  v_current_day := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

  -- =====================================================
  -- 1. SALDO ATUAL (Apenas BRL)
  -- =====================================================
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type != 'CREDIT_CARD'
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
  -- CORREÇÃO: Considerar apenas faturas cujo vencimento está no mês atual
  -- Lógica:
  -- - Se due_day <= closing_day: vencimento é no mês seguinte ao fechamento
  -- - Se due_day > closing_day: vencimento é no mesmo mês do fechamento
  -- - Só incluir na projeção se o vencimento cair no mês de p_end_date
  
  SELECT COALESCE(SUM(ABS(balance)), 0) INTO v_credit_invoices
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type = 'CREDIT_CARD'
    AND is_active = true
    AND balance < 0
    AND (is_international = false OR is_international IS NULL)
    AND (currency = 'BRL' OR currency IS NULL)
    -- Filtro adicional: apenas se o vencimento está no mês atual
    AND (
      -- Caso 1: due_day > closing_day (vencimento no mesmo mês do fechamento)
      -- Exemplo: closing_day=5, due_day=10 -> vence no mesmo mês
      (due_day > closing_day AND v_current_day > closing_day)
      OR
      -- Caso 2: due_day <= closing_day (vencimento no mês seguinte)
      -- Exemplo: closing_day=28, due_day=10 -> vence no mês seguinte
      -- Só incluir se já passou o closing_day do mês anterior
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
    AND t.trip_id IS NULL -- Excluir transações de viagens
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

COMMENT ON FUNCTION public.get_monthly_projection IS 
'Calcula projeção do saldo no fim do mês (BRL apenas, considerando apenas faturas que vencem no mês)';

GRANT EXECUTE ON FUNCTION public.get_monthly_projection TO authenticated;
