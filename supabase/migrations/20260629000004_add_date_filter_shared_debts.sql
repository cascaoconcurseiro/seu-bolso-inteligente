-- Add date filtering to get_current_shared_debts for month selector support

CREATE OR REPLACE FUNCTION get_current_shared_debts(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (
    member_id UUID,
    currency TEXT,
    total_credits NUMERIC,
    total_debits NUMERIC,
    net_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH my_members AS (
        SELECT id FROM family_members WHERE linked_user_id = p_user_id
    ),
    credits AS (
        SELECT
            ts.member_id,
            COALESCE(t.currency, 'BRL') AS currency,
            SUM(CASE WHEN t.type = 'INCOME' THEN -ts.amount ELSE ts.amount END) AS amount
        FROM transactions t
        JOIN transaction_splits ts ON t.id = ts.transaction_id
        WHERE
            (t.user_id = p_user_id AND t.payer_id IS NULL
             OR t.payer_id IN (SELECT id FROM my_members))
            AND ts.member_id NOT IN (SELECT id FROM my_members)
            AND ts.is_settled = false
            AND ts.settled_by_creditor = false
            AND (t.type = 'EXPENSE' OR t.type = 'INCOME')
            AND (p_start_date IS NULL OR t.date >= p_start_date)
            AND (p_end_date IS NULL OR t.date <= p_end_date)
        GROUP BY ts.member_id, t.currency
    ),
    debits_split AS (
        SELECT
            (SELECT id FROM family_members WHERE linked_user_id = t.user_id LIMIT 1) AS member_id,
            COALESCE(t.currency, 'BRL') AS currency,
            SUM(ts.amount) AS amount
        FROM transactions t
        JOIN transaction_splits ts ON t.id = ts.transaction_id
        WHERE
            (t.user_id != p_user_id OR (t.user_id = p_user_id AND t.payer_id IS NOT NULL AND t.payer_id NOT IN (SELECT id FROM my_members)))
            AND ts.member_id IN (SELECT id FROM my_members)
            AND ts.is_settled = false
            AND ts.settled_by_debtor = false
            AND t.type = 'EXPENSE'
            AND (p_start_date IS NULL OR t.date >= p_start_date)
            AND (p_end_date IS NULL OR t.date <= p_end_date)
        GROUP BY t.user_id, t.payer_id, t.currency
    ),
    debits_direct AS (
        SELECT
            t.payer_id AS member_id,
            COALESCE(t.currency, 'BRL') AS currency,
            SUM(CASE WHEN t.type = 'INCOME' THEN -t.amount ELSE t.amount END) AS amount
        FROM transactions t
        WHERE
            t.user_id = p_user_id
            AND t.payer_id IS NOT NULL
            AND t.payer_id NOT IN (SELECT id FROM my_members)
            AND t.source_transaction_id IS NULL
            AND t.is_settled = false
            AND (t.type = 'EXPENSE' OR t.type = 'INCOME')
            AND (p_start_date IS NULL OR t.date >= p_start_date)
            AND (p_end_date IS NULL OR t.date <= p_end_date)
        GROUP BY t.payer_id, t.currency
    ),
    credits_related AS (
        SELECT
            t.related_member_id AS member_id,
            COALESCE(t.currency, 'BRL') AS currency,
            SUM(t.amount) AS amount
        FROM transactions t
        WHERE
            t.user_id = p_user_id
            AND t.is_shared = false
            AND t.domain = 'SHARED'
            AND t.related_member_id IS NOT NULL
            AND t.is_settled = false
            AND t.type = 'EXPENSE'
            AND (p_start_date IS NULL OR t.date >= p_start_date)
            AND (p_end_date IS NULL OR t.date <= p_end_date)
        GROUP BY t.related_member_id, t.currency
    ),
    debits_related AS (
        SELECT
            (SELECT id FROM family_members WHERE linked_user_id = t.user_id LIMIT 1) AS member_id,
            COALESCE(t.currency, 'BRL') AS currency,
            SUM(t.amount) AS amount
        FROM transactions t
        WHERE
            t.user_id != p_user_id
            AND t.is_shared = false
            AND t.domain = 'SHARED'
            AND t.related_member_id IN (SELECT id FROM my_members)
            AND t.is_settled = false
            AND t.type = 'EXPENSE'
            AND (p_start_date IS NULL OR t.date >= p_start_date)
            AND (p_end_date IS NULL OR t.date <= p_end_date)
        GROUP BY t.user_id, t.currency
    ),
    all_credits AS (
        SELECT member_id, currency, amount FROM credits
        UNION ALL
        SELECT member_id, currency, amount FROM credits_related
    ),
    all_debits AS (
        SELECT member_id, currency, amount FROM debits_split
        UNION ALL
        SELECT member_id, currency, amount FROM debits_direct
        UNION ALL
        SELECT member_id, currency, amount FROM debits_related
    ),
    grouped_totals AS (
        SELECT
            COALESCE(c.member_id, d.member_id) AS member_id,
            COALESCE(c.currency, d.currency) AS currency,
            COALESCE(SUM(c.amount), 0) AS total_credits,
            COALESCE(SUM(d.amount), 0) AS total_debits
        FROM all_credits c
        FULL OUTER JOIN all_debits d
            ON c.member_id = d.member_id AND c.currency = d.currency
        GROUP BY COALESCE(c.member_id, d.member_id), COALESCE(c.currency, d.currency)
    )
    SELECT
        g.member_id,
        g.currency,
        g.total_credits,
        g.total_debits,
        (g.total_credits - g.total_debits) AS net_balance
    FROM grouped_totals g
    WHERE g.total_credits > 0 OR g.total_debits > 0;
END;
$$;
