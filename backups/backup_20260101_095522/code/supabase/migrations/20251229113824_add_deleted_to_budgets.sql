-- Adicionar coluna deleted à tabela budgets
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- Atualizar a função para usar apenas is_active
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
    AND (b.deleted = false OR b.deleted IS NULL)
  ORDER BY percentage_used DESC;
END;
$$;;
