-- Fix: Excluir transações futuras de TODAS as funções de relatório
-- Problema: Transações com data futura estavam sendo incluídas nos cálculos

-- 1. Fix get_expenses_by_category
DROP FUNCTION IF EXISTS public.get_expenses_by_category(UUID, DATE, DATE);

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
  -- Calcular total geral primeiro (APENAS até hoje)
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
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
    AND t.date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
    AND t.source_transaction_id IS NULL
  GROUP BY c.id, c.name, c.icon
  ORDER BY total_amount DESC;
END;
$$;

-- 2. Fix get_user_budgets_progress
DROP FUNCTION IF EXISTS public.get_user_budgets_progress(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_user_budgets_progress(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  amount NUMERIC,
  spent NUMERIC,
  remaining NUMERIC,
  percentage NUMERIC,
  category_id UUID,
  category_name TEXT,
  currency TEXT,
  is_exceeded BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.amount,
    COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.user_id = p_user_id
        AND t.type = 'EXPENSE'
        AND t.competence_date >= p_start_date
        AND t.competence_date <= p_end_date
        AND t.date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
        AND (
          (b.category_id IS NULL) OR 
          (t.category_id = b.category_id)
        )
        AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
        AND t.source_transaction_id IS NULL
    ), 0) AS spent,
    b.amount - COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.user_id = p_user_id
        AND t.type = 'EXPENSE'
        AND t.competence_date >= p_start_date
        AND t.competence_date <= p_end_date
        AND t.date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
        AND (
          (b.category_id IS NULL) OR 
          (t.category_id = b.category_id)
        )
        AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
        AND t.source_transaction_id IS NULL
    ), 0) AS remaining,
    CASE 
      WHEN b.amount > 0 THEN 
        ROUND((COALESCE((
          SELECT SUM(t.amount)
          FROM public.transactions t
          WHERE t.user_id = p_user_id
            AND t.type = 'EXPENSE'
            AND t.competence_date >= p_start_date
            AND t.competence_date <= p_end_date
            AND t.date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
            AND (
              (b.category_id IS NULL) OR 
              (t.category_id = b.category_id)
            )
            AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
            AND t.source_transaction_id IS NULL
        ), 0) / b.amount) * 100, 2)
      ELSE 0
    END AS percentage,
    b.category_id,
    c.name AS category_name,
    b.currency,
    COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.user_id = p_user_id
        AND t.type = 'EXPENSE'
        AND t.competence_date >= p_start_date
        AND t.competence_date <= p_end_date
        AND t.date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
        AND (
          (b.category_id IS NULL) OR 
          (t.category_id = b.category_id)
        )
        AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
        AND t.source_transaction_id IS NULL
    ), 0) > b.amount AS is_exceeded
  FROM public.budgets b
  LEFT JOIN public.categories c ON c.id = b.category_id
  WHERE b.user_id = p_user_id
    AND b.is_active = true
    AND (b.deleted IS NULL OR b.deleted = false)
  ORDER BY b.created_at DESC;
END;
$$;

-- 3. Fix calculate_budget_spent
DROP FUNCTION IF EXISTS public.calculate_budget_spent(UUID, UUID, DATE, DATE, TEXT);

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
BEGIN
  RETURN COALESCE((
    SELECT SUM(amount)
    FROM public.transactions
    WHERE user_id = p_user_id
      AND type = 'EXPENSE'
      AND competence_date >= p_start_date
      AND competence_date <= p_end_date
      AND date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
      AND (
        (p_category_id IS NULL) OR 
        (category_id = p_category_id)
      )
      AND (currency = p_currency OR (currency IS NULL AND p_currency = 'BRL'))
      AND source_transaction_id IS NULL
  ), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_expenses_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_budgets_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_budget_spent TO authenticated;

COMMENT ON FUNCTION public.get_expenses_by_category IS 
'Retorna gastos agrupados por categoria no período (excluindo transações futuras)';

COMMENT ON FUNCTION public.get_user_budgets_progress IS 
'Retorna progresso de orçamentos do usuário (excluindo transações futuras)';

COMMENT ON FUNCTION public.calculate_budget_spent IS 
'Calcula gasto em uma categoria específica (excluindo transações futuras)';;
