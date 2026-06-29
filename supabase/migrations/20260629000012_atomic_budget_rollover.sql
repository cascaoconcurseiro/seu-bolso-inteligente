-- Fix M-5: Atomic Budget Rollover Calculation
CREATE OR REPLACE FUNCTION get_user_budgets_progress_with_rollover(
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
    period TEXT,
    _original_budget NUMERIC,
    _rollover NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_start_date DATE;
    v_prev_end_date DATE;
BEGIN
    v_prev_start_date := (p_start_date - INTERVAL '1 month')::DATE;
    v_prev_end_date := ((p_start_date - INTERVAL '1 day'))::DATE;

    RETURN QUERY
    WITH current_progress AS (
        SELECT * FROM get_user_budgets_progress(p_user_id, p_start_date, p_end_date)
    ),
    prev_progress AS (
        SELECT * FROM get_user_budgets_progress(p_user_id, v_prev_start_date, v_prev_end_date)
    )
    SELECT
        c.budget_id,
        c.budget_name,
        c.category_id,
        c.category_name,
        c.category_icon,
        -- Calculate new budget amount capping rollover to the original budget
        (c.budget_amount + COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END, 
            0
        ))::NUMERIC AS budget_amount,
        c.spent_amount,
        -- Calculate new remaining
        ((c.budget_amount + COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END, 
            0
        )) - c.spent_amount)::NUMERIC AS remaining_amount,
        -- Calculate new percentage
        CASE WHEN (c.budget_amount + COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END, 
            0
        )) > 0 THEN
            LEAST(ROUND((c.spent_amount / (c.budget_amount + COALESCE(
                CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END, 
                0
            ))) * 100), 1000)::NUMERIC
        ELSE 0::NUMERIC END AS percentage_used,
        c.currency,
        c.period,
        c.budget_amount AS _original_budget,
        COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END, 
            0
        )::NUMERIC AS _rollover
    FROM current_progress c
    LEFT JOIN prev_progress p ON c.budget_id = p.budget_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_budgets_progress_with_rollover(UUID, DATE, DATE) TO authenticated;
