-- Corrigir função get_monthly_projection para excluir transações compartilhadas internacionais
-- O problema: compartilhados internacionais estavam sendo incluídos na projeção

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
BEGIN
  -- =====================================================
  -- 1. SALDO ATUAL
  -- =====================================================
  -- Soma de todas as contas ativas (exceto cartões e internacionais)
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type != 'CREDIT_CARD'
    AND (is_international = false OR is_international IS NULL);

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
  -- 4. FATURAS DE CARTÃO PENDENTES
  -- =====================================================
  SELECT COALESCE(SUM(ABS(balance)), 0) INTO v_credit_invoices
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type = 'CREDIT_CARD'
    AND is_active = true
    AND balance < 0;

  -- =====================================================
  -- 5. COMPARTILHADOS A PAGAR (APENAS BRL)
  -- =====================================================
  -- CORREÇÃO: Usar transaction_splits ao invés de source_transaction_id
  -- e filtrar por moeda BRL para excluir transações internacionais
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_shared_debts
  FROM public.transaction_splits ts
  INNER JOIN public.transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_user_id
    AND (ts.settled_by_debtor = false OR ts.settled_by_debtor IS NULL)
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.trip_id IS NULL; -- Excluir transações de viagens

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
'Calcula projeção do saldo no fim do mês (apenas BRL, excluindo transações internacionais)';

GRANT EXECUTE ON FUNCTION public.get_monthly_projection TO authenticated;;
