-- ============================================================================
-- Fix: dashboard totals should exclude future transactions
-- Future transactions (ref_date > CURRENT_DATE) go to pending_* only
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    WITH tx_raw AS (
        SELECT
            t.type,
            t.amount,
            t.is_refund,
            t.source_transaction_id,
            COALESCE(t.currency, 'BRL') as currency,
            COALESCE(t.competence_date, t.date) AS ref_date,
            t.date
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.type != 'TRANSFER'
          AND COALESCE(a.type, 'CHECKING') != 'CREDIT_CARD'
    ),
    tx AS (
        SELECT *
        FROM tx_raw
        WHERE ref_date >= p_start_date
          AND ref_date <= p_end_date
    ),
    recent AS (
        SELECT t.id, t.type, t.amount, COALESCE(t.currency, 'BRL') as currency, t.date, t.description,
               t.is_shared, t.payer_id, t.account_id, t.source_transaction_id,
               jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
               jsonb_build_object('id', acc.id, 'name', acc.name, 'currency', COALESCE(acc.currency, 'BRL')) AS account
        FROM transactions t
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.payer_id IS NULL
          AND COALESCE(t.competence_date, t.date) >= p_start_date
          AND COALESCE(t.competence_date, t.date) <= p_end_date
          -- Não mostrar transações futuras na atividade recente
          AND t.date <= CURRENT_DATE
        ORDER BY t.created_at DESC
        LIMIT 5
    ),
    totals_by_curr AS (
        SELECT
            currency,
            -- Income: apenas transações já realizadas (ref_date <= hoje)
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND (is_refund IS FALSE OR is_refund IS NULL) AND ref_date <= CURRENT_DATE), 0) AS income,
            -- Expense: apenas transações já realizadas
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND ref_date <= CURRENT_DATE), 0) -
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND is_refund IS TRUE AND ref_date <= CURRENT_DATE), 0) AS expense,
            -- Pendentes: transações futuras (ref_date > hoje)
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND ref_date > CURRENT_DATE), 0) AS pending_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND ref_date > CURRENT_DATE), 0) AS pending_expense
        FROM tx
        GROUP BY currency
    ),
    totals_brl AS (
        SELECT
            COALESCE((SELECT income FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_income,
            COALESCE((SELECT expense FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_expense,
            COALESCE((SELECT pending_income FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_pending_income,
            COALESCE((SELECT pending_expense FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_pending_expense
    )
    SELECT jsonb_build_object(
        'total_income',    (SELECT total_income FROM totals_brl),
        'total_expense',   (SELECT total_expense FROM totals_brl),
        'pending_income',  (SELECT total_pending_income FROM totals_brl),
        'pending_expense', (SELECT total_pending_expense FROM totals_brl),
        'balance',         (SELECT total_income - total_expense FROM totals_brl),
        'totals_by_currency', COALESCE((SELECT jsonb_agg(jsonb_build_object('currency', currency, 'income', income, 'expense', expense, 'pending_income', pending_income, 'pending_expense', pending_expense, 'balance', income - expense)) FROM totals_by_curr), '[]'::jsonb),
        'recent_transactions', COALESCE((SELECT jsonb_agg(r) FROM recent r), '[]'::jsonb)
    ) INTO v_result;

    RETURN COALESCE(v_result, '{"total_income":0,"total_expense":0,"pending_income":0,"pending_expense":0,"balance":0,"totals_by_currency":[],"recent_transactions":[]}'::jsonb);
END;
$function$;

COMMIT;
