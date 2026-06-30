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
SECURITY DEFINER
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
        AND t.date <= CURRENT_DATE
        AND (
          (b.category_id IS NULL) OR 
          (t.category_id = b.category_id)
        )
        AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
        AND t.source_transaction_id IS NULL
    ), 0) AS spent,
    COALESCE(b.amount - COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.user_id = p_user_id
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
    ), 0), 0) AS remaining,
    CASE 
      WHEN b.amount > 0 THEN 
        ROUND((COALESCE((
          SELECT SUM(t.amount)
          FROM public.transactions t
          WHERE t.user_id = p_user_id
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
        AND t.date <= CURRENT_DATE
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
    AND (b.deleted IS NULL OR b.deleted = false)
  ORDER BY b.created_at DESC;
END;
$$;
