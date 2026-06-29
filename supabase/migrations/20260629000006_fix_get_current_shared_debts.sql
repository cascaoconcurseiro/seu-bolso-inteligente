-- Rewrite get_current_shared_debts from scratch: fix ambiguous member_id column reference
-- and simplify logic for correctness

DROP FUNCTION IF EXISTS get_current_shared_debts(uuid);
DROP FUNCTION IF EXISTS get_current_shared_debts(uuid, date, date);

CREATE OR REPLACE FUNCTION get_current_shared_debts(
    p_user_id   UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date   DATE DEFAULT NULL
)
RETURNS TABLE (
    member_id     UUID,
    currency      TEXT,
    total_credits NUMERIC,
    total_debits  NUMERIC,
    net_balance   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH
    -- IDs dos family_members que representam o próprio usuário
    my_member_ids AS (
        SELECT fm.id AS fmid
        FROM family_members fm
        WHERE fm.linked_user_id = p_user_id
          AND fm.removed_at IS NULL
    ),

    -- CRÉDITOS: eu paguei, outras pessoas têm split pendente (elas me devem)
    -- member_id retornado = family_members.id da outra pessoa
    creds AS (
        SELECT
            ts.member_id                        AS mem_id,
            COALESCE(t.currency, 'BRL')         AS cur,
            SUM(ts.amount)                      AS amt
        FROM transactions t
        JOIN transaction_splits ts ON ts.transaction_id = t.id
        WHERE
            t.user_id  = p_user_id
            AND t.type = 'EXPENSE'
            AND t.deleted_at IS NULL
            AND ts.deleted_at IS NULL
            AND ts.member_id NOT IN (SELECT fmid FROM my_member_ids)
            AND ts.is_settled        = false
            AND ts.settled_by_creditor = false
            AND (
                p_start_date IS NULL
                OR COALESCE(t.competence_date, t.date) >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR COALESCE(t.competence_date, t.date) <= p_end_date
            )
        GROUP BY ts.member_id, t.currency
    ),

    -- DÉBITOS: outra pessoa pagou, eu tenho split pendente (eu devo)
    -- member_id retornado = family_members.id de QUEM PAGOU (a outra pessoa)
    debs AS (
        SELECT
            (
                SELECT fm2.id
                FROM family_members fm2
                WHERE fm2.linked_user_id = t.user_id
                  AND fm2.removed_at IS NULL
                LIMIT 1
            )                                   AS mem_id,
            COALESCE(t.currency, 'BRL')         AS cur,
            SUM(ts.amount)                      AS amt
        FROM transactions t
        JOIN transaction_splits ts ON ts.transaction_id = t.id
        WHERE
            t.user_id  != p_user_id
            AND t.type  = 'EXPENSE'
            AND t.deleted_at IS NULL
            AND ts.deleted_at IS NULL
            AND ts.member_id IN (SELECT fmid FROM my_member_ids)
            AND ts.is_settled        = false
            AND ts.settled_by_debtor = false
            AND (
                p_start_date IS NULL
                OR COALESCE(t.competence_date, t.date) >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR COALESCE(t.competence_date, t.date) <= p_end_date
            )
        GROUP BY t.user_id, t.currency
    ),

    -- Une créditos e débitos
    combined AS (
        SELECT mem_id, cur, amt AS credit_amt, 0::NUMERIC AS debit_amt FROM creds
        UNION ALL
        SELECT mem_id, cur, 0::NUMERIC,        amt          FROM debs
    ),

    totals AS (
        SELECT
            c.mem_id,
            c.cur,
            SUM(c.credit_amt) AS tot_credits,
            SUM(c.debit_amt)  AS tot_debits
        FROM combined c
        WHERE c.mem_id IS NOT NULL
        GROUP BY c.mem_id, c.cur
    )

    SELECT
        t.mem_id                           AS member_id,
        t.cur                              AS currency,
        t.tot_credits                      AS total_credits,
        t.tot_debits                       AS total_debits,
        (t.tot_credits - t.tot_debits)     AS net_balance
    FROM totals t
    WHERE t.tot_credits > 0 OR t.tot_debits > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_shared_debts(UUID, DATE, DATE) TO authenticated;
