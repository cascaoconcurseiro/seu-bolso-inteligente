-- Orçamento: despesas sem conta própria (dívidas importadas / pagas por outra pessoa)
-- não são gasto do usuário e passavam a contar o valor INTEIRO no orçamento
-- (ex.: Airbnb 1-5/5, R$ 910,38 por parcela, com o Jhonatan devendo 100%).
-- Transações, Dashboard e Relatórios já ignoram esses lançamentos; o orçamento agora também.
-- Única mudança em relação à definição anterior: AND t.account_id IS NOT NULL.

CREATE OR REPLACE FUNCTION public.get_user_budgets_progress(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(budget_id uuid, budget_name text, category_id uuid, category_name text, category_icon text, budget_amount numeric, spent_amount numeric, remaining_amount numeric, percentage_used numeric, currency text, period text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND t.account_id IS NOT NULL
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
$function$;
