-- Otimização extrema: 
-- Removemos a abordagem N+1 subqueries da função get_user_budgets_progress.
-- Agora usamos uma CTE (WITH) para somar as transações apenas 1 vez por chamada.

DROP FUNCTION IF EXISTS public.get_user_budgets_progress(UUID, DATE, DATE);

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
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH budget_spent AS (
    SELECT 
      b.id AS budget_id,
      COALESCE(SUM(t.amount), 0) AS spent
    FROM public.budgets b
    LEFT JOIN public.transactions t 
      ON t.user_id = b.user_id
      AND t.type = 'EXPENSE'
      AND t.competence_date >= p_start_date
      AND t.competence_date <= p_end_date
      AND t.date <= CURRENT_DATE
      AND (
        (b.category_id IS NULL) OR 
        (t.category_id = b.category_id)
      )
      AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
      AND t.source_transaction_id IS NULL
    WHERE b.user_id = p_user_id
    GROUP BY b.id
  )
  SELECT 
    b.id AS budget_id,
    b.name AS budget_name,
    b.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    b.amount AS budget_amount,
    bs.spent AS spent_amount,
    COALESCE(b.amount - bs.spent, 0) AS remaining_amount,
    CASE 
      WHEN b.amount > 0 THEN 
        ROUND((bs.spent / b.amount) * 100, 2)
      ELSE 0
    END AS percentage_used,
    b.currency,
    b.period
  FROM public.budgets b
  LEFT JOIN public.categories c ON c.id = b.category_id
  LEFT JOIN budget_spent bs ON bs.budget_id = b.id
  WHERE b.user_id = p_user_id
    AND (b.deleted IS NULL OR b.deleted = false)
  ORDER BY b.created_at DESC;
END;
$$;
