-- =====================================================
-- SINGLE SOURCE OF TRUTH - FUNÇÕES DE CÁLCULO
-- Todas as funções calculam valores a partir de transações
-- =====================================================

-- 1. ORÇAMENTOS: Calcular gasto por categoria em um período
CREATE OR REPLACE FUNCTION public.calculate_budget_spent(
  p_user_id UUID,
  p_category_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_spent NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_spent
  FROM public.transactions
  WHERE user_id = p_user_id
    AND category_id = p_category_id
    AND type = 'EXPENSE'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND (currency = p_currency OR currency IS NULL)
    AND source_transaction_id IS NULL; -- Excluir transações espelhadas
  
  RETURN v_spent;
END;
$$;

-- 2. ORÇAMENTOS: Obter progresso de todos os orçamentos do usuário
CREATE OR REPLACE FUNCTION public.get_user_budgets_progress(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  budget_id UUID,
  budget_name TEXT,
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  budget_amount NUMERIC,
  spent_amount NUMERIC,
  remaining_amount NUMERIC,
  percentage_used NUMERIC,
  currency TEXT,
  period TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS budget_id,
    b.name AS budget_name,
    b.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    b.amount AS budget_amount,
    public.calculate_budget_spent(p_user_id, b.category_id, p_start_date, p_end_date, b.currency) AS spent_amount,
    b.amount - public.calculate_budget_spent(p_user_id, b.category_id, p_start_date, p_end_date, b.currency) AS remaining_amount,
    CASE 
      WHEN b.amount > 0 THEN 
        ROUND((public.calculate_budget_spent(p_user_id, b.category_id, p_start_date, p_end_date, b.currency) / b.amount) * 100, 2)
      ELSE 0
    END AS percentage_used,
    b.currency,
    b.period
  FROM public.budgets b
  LEFT JOIN public.categories c ON c.id = b.category_id
  WHERE b.user_id = p_user_id
    AND b.is_active = true
    AND (b.deleted IS NULL OR b.deleted = false)
  ORDER BY percentage_used DESC;
END;
$$;

-- 3. VIAGENS: Calcular total gasto em uma viagem
CREATE OR REPLACE FUNCTION public.calculate_trip_spent(
  p_trip_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_spent NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_spent
  FROM public.transactions
  WHERE trip_id = p_trip_id
    AND type = 'EXPENSE'
    AND source_transaction_id IS NULL -- Excluir transações espelhadas
    AND (p_user_id IS NULL OR user_id = p_user_id);
  
  RETURN v_spent;
END;
$$;

-- 4. VIAGENS: Obter resumo financeiro de uma viagem
CREATE OR REPLACE FUNCTION public.get_trip_financial_summary(
  p_trip_id UUID
)
RETURNS TABLE (
  total_budget NUMERIC,
  total_spent NUMERIC,
  remaining NUMERIC,
  percentage_used NUMERIC,
  currency TEXT,
  participants_count BIGINT,
  transactions_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.budget AS total_budget,
    public.calculate_trip_spent(p_trip_id) AS total_spent,
    COALESCE(t.budget, 0) - public.calculate_trip_spent(p_trip_id) AS remaining,
    CASE 
      WHEN t.budget > 0 THEN 
        ROUND((public.calculate_trip_spent(p_trip_id) / t.budget) * 100, 2)
      ELSE 0
    END AS percentage_used,
    t.currency,
    (SELECT COUNT(*) FROM public.trip_members WHERE trip_id = p_trip_id) AS participants_count,
    (SELECT COUNT(*) FROM public.transactions WHERE trip_id = p_trip_id AND source_transaction_id IS NULL) AS transactions_count
  FROM public.trips t
  WHERE t.id = p_trip_id;
END;
$$;

-- 5. COMPARTILHADO: Calcular saldo entre dois membros
CREATE OR REPLACE FUNCTION public.calculate_member_balance(
  p_user_id UUID,
  p_member_id UUID
)
RETURNS TABLE (
  credits NUMERIC,
  debits NUMERIC,
  net_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_credits NUMERIC := 0;
  v_debits NUMERIC := 0;
BEGIN
  -- CRÉDITOS: Splits onde EU paguei e o membro me deve (não quitados)
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_credits
  FROM public.transaction_splits ts
  JOIN public.transactions t ON t.id = ts.transaction_id
  WHERE t.user_id = p_user_id
    AND ts.member_id = p_member_id
    AND ts.is_settled = false
    AND t.type = 'EXPENSE'
    AND t.source_transaction_id IS NULL;

  -- DÉBITOS: Transações espelhadas onde EU devo para o membro (não quitadas)
  SELECT COALESCE(SUM(t.amount), 0) INTO v_debits
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.source_transaction_id IS NOT NULL
    AND t.is_settled = false
    AND t.type = 'EXPENSE'
    AND EXISTS (
      SELECT 1 FROM public.transactions orig
      JOIN public.family_members fm ON (fm.user_id = orig.user_id OR fm.linked_user_id = orig.user_id)
      WHERE orig.id = t.source_transaction_id
        AND fm.id = p_member_id
    );

  RETURN QUERY SELECT v_credits, v_debits, v_credits - v_debits;
END;
$$;

-- 6. COMPARTILHADO: Obter resumo de todos os membros
CREATE OR REPLACE FUNCTION public.get_shared_finances_summary(
  p_user_id UUID
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  credits NUMERIC,
  debits NUMERIC,
  net_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fm.id AS member_id,
    fm.name AS member_name,
    (public.calculate_member_balance(p_user_id, fm.id)).credits,
    (public.calculate_member_balance(p_user_id, fm.id)).debits,
    (public.calculate_member_balance(p_user_id, fm.id)).net_balance
  FROM public.family_members fm
  JOIN public.families f ON f.id = fm.family_id
  WHERE f.owner_id = p_user_id OR fm.user_id = p_user_id OR fm.linked_user_id = p_user_id
  ORDER BY fm.name;
END;
$$;

-- 7. CARTÃO DE CRÉDITO: Calcular fatura de um período
CREATE OR REPLACE FUNCTION public.calculate_credit_card_invoice(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'EXPENSE' THEN amount
      WHEN type = 'INCOME' THEN -amount -- Pagamentos/estornos
      ELSE 0
    END
  ), 0) INTO v_total
  FROM public.transactions
  WHERE account_id = p_account_id
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND source_transaction_id IS NULL;
  
  RETURN v_total;
END;
$$;

-- 8. RESUMO FINANCEIRO: Calcular totais do mês
CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_savings NUMERIC,
  total_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_income NUMERIC := 0;
  v_expenses NUMERIC := 0;
  v_balance NUMERIC := 0;
BEGIN
  -- Receitas do período (apenas BRL)
  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'INCOME'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- Despesas do período (apenas BRL)
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- Saldo total das contas (exceto cartões de crédito e internacionais)
  SELECT COALESCE(SUM(balance), 0) INTO v_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type != 'CREDIT_CARD'
    AND (is_international = false OR is_international IS NULL);

  RETURN QUERY SELECT v_income, v_expenses, v_income - v_expenses, v_balance;
END;
$$;

-- 9. RELATÓRIOS: Gastos por categoria no período
CREATE OR REPLACE FUNCTION public.get_expenses_by_category(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  total_amount NUMERIC,
  transaction_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  -- Calcular total geral primeiro
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND source_transaction_id IS NULL;

  RETURN QUERY
  SELECT 
    c.id AS category_id,
    COALESCE(c.name, 'Sem categoria') AS category_name,
    c.icon AS category_icon,
    COALESCE(SUM(t.amount), 0) AS total_amount,
    COUNT(t.id) AS transaction_count,
    CASE 
      WHEN v_total > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / v_total) * 100, 2)
      ELSE 0
    END AS percentage
  FROM public.transactions t
  LEFT JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = p_user_id
    AND t.type = 'EXPENSE'
    AND t.competence_date >= p_start_date
    AND t.competence_date <= p_end_date
    AND t.source_transaction_id IS NULL
  GROUP BY c.id, c.name, c.icon
  ORDER BY total_amount DESC;
END;
$$;

-- 10. RELATÓRIOS: Evolução mensal (últimos 12 meses)
CREATE OR REPLACE FUNCTION public.get_monthly_evolution(
  p_user_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  month_year TEXT,
  month_start DATE,
  income NUMERIC,
  expenses NUMERIC,
  savings NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      TO_CHAR(d, 'YYYY-MM') AS month_year,
      DATE_TRUNC('month', d)::DATE AS month_start,
      (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS month_end
    FROM generate_series(
      DATE_TRUNC('month', CURRENT_DATE - (p_months || ' months')::INTERVAL),
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::INTERVAL
    ) d
  )
  SELECT 
    m.month_year,
    m.month_start,
    COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS expenses,
    COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS savings
  FROM months m
  LEFT JOIN public.transactions t ON 
    t.user_id = p_user_id
    AND t.competence_date >= m.month_start
    AND t.competence_date <= m.month_end
    AND t.source_transaction_id IS NULL
    AND (t.currency = 'BRL' OR t.currency IS NULL)
  GROUP BY m.month_year, m.month_start
  ORDER BY m.month_start;
END;
$$;

COMMENT ON FUNCTION public.calculate_budget_spent IS 'Calcula o valor gasto em uma categoria no período especificado';
COMMENT ON FUNCTION public.get_user_budgets_progress IS 'Retorna o progresso de todos os orçamentos do usuário';
COMMENT ON FUNCTION public.calculate_trip_spent IS 'Calcula o total gasto em uma viagem';
COMMENT ON FUNCTION public.get_trip_financial_summary IS 'Retorna resumo financeiro completo de uma viagem';
COMMENT ON FUNCTION public.calculate_member_balance IS 'Calcula o saldo entre o usuário e um membro da família';
COMMENT ON FUNCTION public.get_shared_finances_summary IS 'Retorna resumo de saldos com todos os membros da família';
COMMENT ON FUNCTION public.calculate_credit_card_invoice IS 'Calcula o valor da fatura de um cartão de crédito no período';
COMMENT ON FUNCTION public.get_monthly_financial_summary IS 'Retorna resumo financeiro mensal do usuário';
COMMENT ON FUNCTION public.get_expenses_by_category IS 'Retorna gastos agrupados por categoria no período';
COMMENT ON FUNCTION public.get_monthly_evolution IS 'Retorna evolução mensal de receitas e despesas';;
