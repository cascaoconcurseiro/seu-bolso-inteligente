-- Apply the active family sharing contract before returning another user's
-- transaction details in the dashboard's recent activity list.
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result JSONB;
  v_member_id UUID;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT fm.id INTO v_member_id
  FROM public.family_members fm
  JOIN public.families f ON f.id = fm.family_id
  WHERE (fm.linked_user_id = p_user_id OR (fm.linked_user_id IS NULL AND fm.user_id = p_user_id))
    AND fm.member_type = 'family'
    AND fm.status = 'active'
    AND fm.removed_at IS NULL
    AND f.deleted = false
    AND f.deleted_at IS NULL
  ORDER BY CASE WHEN fm.linked_user_id = p_user_id THEN 0 ELSE 1 END
  LIMIT 1;

  WITH tx_raw AS (
    SELECT
      t.type,
      t.amount,
      t.is_refund,
      COALESCE(t.currency, 'BRL') AS currency,
      COALESCE(t.competence_date, t.date) AS ref_date
    FROM public.transactions t
    LEFT JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.deleted_at IS NULL
      AND t.source_transaction_id IS NULL
      AND t.type != 'TRANSFER'
      AND COALESCE(a.type, 'CHECKING') != 'CREDIT_CARD'
      AND (
        t.payer_id IS NULL
        OR (v_member_id IS NOT NULL AND t.payer_id = v_member_id)
      )

    UNION ALL

    SELECT
      'EXPENSE'::public.transaction_type AS type,
      t.amount,
      FALSE AS is_refund,
      COALESCE(t.currency, 'BRL') AS currency,
      t.date AS ref_date
    FROM public.transactions t
    JOIN public.accounts source_account ON source_account.id = t.account_id
    JOIN public.accounts card_account ON card_account.id = t.destination_account_id
    WHERE t.user_id = p_user_id
      AND t.deleted_at IS NULL
      AND t.source_transaction_id IS NULL
      AND t.type = 'TRANSFER'
      AND source_account.type != 'CREDIT_CARD'
      AND card_account.type = 'CREDIT_CARD'
      AND (
        t.payer_id IS NULL
        OR (v_member_id IS NOT NULL AND t.payer_id = v_member_id)
      )
  ),
  tx AS (
    SELECT * FROM tx_raw
    WHERE ref_date >= p_start_date AND ref_date <= p_end_date
  ),
  recent AS (
    SELECT
      t.id,
      t.type,
      t.amount,
      COALESCE(t.currency, 'BRL') AS currency,
      t.date,
      t.description,
      t.is_shared,
      t.payer_id,
      t.account_id,
      t.source_transaction_id,
      jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
      jsonb_build_object('id', acc.id, 'name', acc.name, 'currency', COALESCE(acc.currency, 'BRL')) AS account
    FROM public.transactions t
    LEFT JOIN public.categories cat ON cat.id = t.category_id
    LEFT JOIN public.accounts acc ON acc.id = t.account_id
    WHERE t.deleted_at IS NULL
      AND t.source_transaction_id IS NULL
      AND t.status != 'PENDING'
      AND COALESCE(t.competence_date, t.date) >= p_start_date
      AND COALESCE(t.competence_date, t.date) <= p_end_date
      AND t.date <= CURRENT_DATE
      AND (
        t.user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.family_members fm
          JOIN public.families f ON f.id = fm.family_id
          WHERE fm.id = t.payer_id
            AND (fm.linked_user_id = p_user_id OR (fm.linked_user_id IS NULL AND fm.user_id = p_user_id))
            AND fm.member_type = 'family'
            AND fm.status = 'active'
            AND fm.removed_at IS NULL
            AND f.deleted = false
            AND f.deleted_at IS NULL
            AND (
              f.owner_id = t.user_id
              OR EXISTS (
                SELECT 1
                FROM public.family_members author
                WHERE author.family_id = fm.family_id
                  AND (author.linked_user_id = t.user_id OR author.user_id = t.user_id)
                  AND author.status = 'active'
                  AND author.removed_at IS NULL
              )
            )
            AND CASE fm.sharing_scope
              WHEN 'all' THEN true
              WHEN 'trips_only' THEN t.trip_id IS NOT NULL
              WHEN 'specific_trip' THEN t.trip_id = fm.scope_trip_id
              WHEN 'date_range' THEN
                (CASE
                  WHEN t.competence_date IS NULL THEN t.date
                  WHEN acc.type = 'CREDIT_CARD'
                       AND COALESCE(acc.due_day, 10) <= COALESCE(acc.closing_day, 1)
                    THEN (t.competence_date + interval '1 month')::date
                  ELSE t.competence_date
                END) >= COALESCE(fm.scope_start_date, '-infinity'::date)
                AND
                (CASE
                  WHEN t.competence_date IS NULL THEN t.date
                  WHEN acc.type = 'CREDIT_CARD'
                       AND COALESCE(acc.due_day, 10) <= COALESCE(acc.closing_day, 1)
                    THEN (t.competence_date + interval '1 month')::date
                  ELSE t.competence_date
                END) <= COALESCE(fm.scope_end_date, 'infinity'::date)
              ELSE false
            END
        )
      )
    ORDER BY t.created_at DESC
    LIMIT 5
  ),
  totals_by_curr AS (
    SELECT
      currency,
      COALESCE(SUM(amount) FILTER (
        WHERE type = 'INCOME'
          AND (is_refund IS FALSE OR is_refund IS NULL)
          AND ref_date <= CURRENT_DATE
      ), 0) AS income,
      COALESCE(SUM(amount) FILTER (
        WHERE type = 'EXPENSE' AND ref_date <= CURRENT_DATE
      ), 0) - COALESCE(SUM(amount) FILTER (
        WHERE type = 'INCOME' AND is_refund IS TRUE AND ref_date <= CURRENT_DATE
      ), 0) AS expense,
      COALESCE(SUM(amount) FILTER (
        WHERE type = 'INCOME' AND ref_date > CURRENT_DATE
      ), 0) AS pending_income,
      COALESCE(SUM(amount) FILTER (
        WHERE type = 'EXPENSE' AND ref_date > CURRENT_DATE
      ), 0) AS pending_expense
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
    'total_income', (SELECT total_income FROM totals_brl),
    'total_expense', (SELECT total_expense FROM totals_brl),
    'pending_income', (SELECT total_pending_income FROM totals_brl),
    'pending_expense', (SELECT total_pending_expense FROM totals_brl),
    'balance', (SELECT total_income - total_expense FROM totals_brl),
    'totals_by_currency', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'currency', currency,
        'income', income,
        'expense', expense,
        'pending_income', pending_income,
        'pending_expense', pending_expense,
        'balance', income - expense
      )) FROM totals_by_curr
    ), '[]'::jsonb),
    'recent_transactions', COALESCE((SELECT jsonb_agg(r) FROM recent r), '[]'::jsonb)
  ) INTO v_result;

  RETURN COALESCE(
    v_result,
    '{"total_income":0,"total_expense":0,"pending_income":0,"pending_expense":0,"balance":0,"totals_by_currency":[],"recent_transactions":[]}'::jsonb
  );
END;
$function$;
