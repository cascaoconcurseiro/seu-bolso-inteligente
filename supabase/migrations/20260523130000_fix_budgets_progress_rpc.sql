-- Fixes the get_user_budgets_progress function to return the fields expected by the UI and support global budgets

CREATE OR REPLACE FUNCTION get_user_budgets_progress(p_user_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- SECURITY LOCK: IDOR Protection
    IF p_user_id != auth.uid() THEN 
        RAISE EXCEPTION 'Acesso negado'; 
    END IF;

    WITH budgets_data AS (
        SELECT 
            b.id AS budget_id,
            b.name AS budget_name,
            b.category_id,
            c.name AS category_name,
            c.icon AS category_icon,
            b.amount AS budget_amount,
            b.currency,
            b.period,
            (SELECT COALESCE(SUM(t.amount), 0)
             FROM transactions t
             WHERE t.user_id = p_user_id
               AND (b.category_id IS NULL OR t.category_id = b.category_id)
               AND t.type = 'EXPENSE'
               AND t.source_transaction_id IS NULL
               AND t.date >= p_start_date
               AND t.date <= p_end_date
            ) AS spent_amount
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        WHERE b.user_id = p_user_id
          AND (b.deleted IS NULL OR b.deleted = false)
          AND b.is_active = true
    ),
    budgets_with_calc AS (
        SELECT
            bd.*,
            (bd.budget_amount - bd.spent_amount) AS remaining_amount,
            CASE 
                WHEN bd.budget_amount > 0 THEN 
                    LEAST(ROUND((bd.spent_amount / bd.budget_amount) * 100), 1000)
                ELSE 0 
            END AS percentage_used
        FROM budgets_data bd
    )
    SELECT jsonb_agg(row_to_json(bwc)) INTO v_result FROM budgets_with_calc bwc;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
