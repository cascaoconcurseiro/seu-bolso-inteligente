CREATE OR REPLACE FUNCTION public.get_shared_invoice_data(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_family_id UUID;
    v_result    JSONB;
BEGIN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    SELECT family_id INTO v_family_id
    FROM family_members
    WHERE user_id = p_user_id OR linked_user_id = p_user_id
    LIMIT 1;

    WITH relevant_tx AS (
        SELECT t.id
        FROM transactions t
        WHERE (t.user_id = p_user_id OR t.creator_user_id = p_user_id)
          AND (t.is_shared = true OR t.domain = 'SHARED')
          AND t.source_transaction_id IS NULL
          AND t.deleted_at IS NULL
        UNION
        SELECT ts.transaction_id
        FROM transaction_splits ts
        WHERE ts.deleted_at IS NULL
          AND (ts.user_id = p_user_id OR ts.member_id IN (
              SELECT id FROM family_members WHERE user_id = p_user_id OR linked_user_id = p_user_id
          ))
    ),
    tx_data AS (
        SELECT t.id, t.user_id, t.description, t.amount, t.type, t.date,
               t.competence_date, t.account_id, t.is_shared, t.is_settled,
               t.settled_at, t.trip_id, t.payer_id, t.is_installment,
               t.current_installment, t.total_installments, t.series_id,
               t.source_transaction_id, t.currency, t.creator_user_id,
               t.domain, t.related_member_id,
               CASE WHEN cat.id IS NOT NULL THEN jsonb_build_object(
                   'id', cat.id, 'name', cat.name, 'icon', cat.icon, 'color', cat.color
               ) ELSE NULL END AS category
        FROM transactions t
        INNER JOIN relevant_tx rt ON rt.id = t.id
        LEFT JOIN categories cat ON cat.id = t.category_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.date DESC
        LIMIT 500
    ),
    splits_data AS (
        SELECT ts.id, ts.transaction_id, ts.user_id, ts.member_id, ts.name,
               ts.amount, ts.percentage, ts.is_settled, ts.settled_at,
               ts.settled_by_debtor, ts.settled_by_creditor
        FROM transaction_splits ts
        INNER JOIN tx_data td ON td.id = ts.transaction_id
        WHERE ts.deleted_at IS NULL
    ),
    accounts_data AS (
        SELECT DISTINCT ON (a.id) a.id, a.type, a.closing_day, a.due_day, a.user_id
        FROM accounts a
        INNER JOIN tx_data td ON td.account_id = a.id
    ),
    splits_grouped AS (
        SELECT transaction_id, jsonb_agg(row_to_json(s)::jsonb) AS splits
        FROM splits_data s
        GROUP BY transaction_id
    )
    SELECT jsonb_build_object(
        'transactions', COALESCE((
            SELECT jsonb_agg(to_jsonb(td) || jsonb_build_object(
                'transaction_splits', COALESCE(sg.splits, '[]'::jsonb)
            ))
            FROM tx_data td
            LEFT JOIN splits_grouped sg ON sg.transaction_id = td.id
        ), '[]'::jsonb),
        'accounts', COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM accounts_data a), '[]'::jsonb),
        'members', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', fm.id, 'user_id', fm.user_id, 'linked_user_id', fm.linked_user_id,
                'name', COALESCE(p.full_name, fm.name), 'role', fm.role,
                'family_id', fm.family_id, 'sharing_scope', fm.sharing_scope,
                'scope_start_date', fm.scope_start_date, 'scope_end_date', fm.scope_end_date,
                'scope_trip_id', fm.scope_trip_id
            ))
            FROM family_members fm
            LEFT JOIN profiles p ON p.id = COALESCE(fm.linked_user_id, fm.user_id)
            WHERE fm.family_id = v_family_id
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;
