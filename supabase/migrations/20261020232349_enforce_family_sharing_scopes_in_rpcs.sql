-- Enforce family invitation scope inside SECURITY DEFINER RPCs, before data leaves Postgres.

CREATE OR REPLACE FUNCTION public.get_shared_invoice_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_family_id uuid;
    v_family_owner_id uuid;
    v_member_row_id uuid;
    v_is_owner boolean := false;
    v_scope text;
    v_scope_start date;
    v_scope_end date;
    v_scope_trip uuid;
    v_has_membership boolean := false;
    v_result jsonb;
BEGIN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    SELECT f.id
      INTO v_family_id
      FROM public.families AS f
     WHERE f.owner_id = p_user_id
       AND f.deleted = false
       AND f.deleted_at IS NULL
     LIMIT 1;

    IF v_family_id IS NOT NULL THEN
        v_is_owner := true;
        v_family_owner_id := p_user_id;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.family_members AS fm
            WHERE fm.linked_user_id = p_user_id OR fm.user_id = p_user_id
        ) INTO v_has_membership;

        SELECT fm.family_id, f.owner_id, fm.id, fm.sharing_scope,
               fm.scope_start_date, fm.scope_end_date, fm.scope_trip_id
          INTO v_family_id, v_family_owner_id, v_member_row_id, v_scope,
               v_scope_start, v_scope_end, v_scope_trip
          FROM public.family_members AS fm
          JOIN public.families AS f ON f.id = fm.family_id
         WHERE (fm.linked_user_id = p_user_id OR fm.user_id = p_user_id)
           AND fm.member_type = 'family'
           AND fm.status = 'active'
           AND fm.removed_at IS NULL
           AND f.deleted = false
           AND f.deleted_at IS NULL
         LIMIT 1;

        IF v_has_membership AND v_family_id IS NULL THEN
            RAISE EXCEPTION 'Acesso negado';
        END IF;
        IF v_family_id IS NOT NULL AND v_scope NOT IN ('all', 'trips_only', 'date_range', 'specific_trip') THEN
            RAISE EXCEPTION 'Escopo de compartilhamento inválido';
        END IF;
    END IF;

    WITH relevant_tx AS (
        SELECT t.id
          FROM public.transactions AS t
         WHERE (t.user_id = p_user_id OR t.creator_user_id = p_user_id)
           AND (t.is_shared = true OR t.domain = 'SHARED')
           AND t.source_transaction_id IS NULL
           AND t.deleted_at IS NULL
        UNION
        SELECT ts.transaction_id
          FROM public.transaction_splits AS ts
          JOIN public.transactions AS t ON t.id = ts.transaction_id
          LEFT JOIN public.accounts AS a ON a.id = t.account_id
         WHERE ts.deleted_at IS NULL
           AND t.deleted_at IS NULL
           AND (ts.user_id = p_user_id OR ts.member_id IN (
               SELECT fm.id FROM public.family_members AS fm
               WHERE (fm.linked_user_id = p_user_id OR fm.user_id = p_user_id)
                 AND fm.family_id = v_family_id
                 AND fm.status = 'active'
                 AND fm.removed_at IS NULL
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
          FROM public.transactions AS t
          JOIN relevant_tx AS rt ON rt.id = t.id
          LEFT JOIN public.categories AS cat ON cat.id = t.category_id
          LEFT JOIN public.accounts AS scope_account ON scope_account.id = t.account_id
         WHERE t.deleted_at IS NULL
           AND (
               v_is_owner OR v_family_id IS NULL
               OR t.user_id = p_user_id OR t.creator_user_id = p_user_id OR
               CASE v_scope
                   WHEN 'trips_only' THEN t.trip_id IS NOT NULL
                   WHEN 'specific_trip' THEN t.trip_id = v_scope_trip
                   WHEN 'date_range' THEN
                       (CASE
                           WHEN t.competence_date IS NULL THEN t.date
                           WHEN t.account_id IS NOT NULL AND scope_account.type = 'CREDIT_CARD'
                                AND COALESCE(scope_account.due_day, 10) <= COALESCE(scope_account.closing_day, 1)
                               THEN (t.competence_date + interval '1 month')::date
                           ELSE t.competence_date
                        END) >= COALESCE(v_scope_start, '-infinity'::date)
                       AND
                       (CASE
                           WHEN t.competence_date IS NULL THEN t.date
                           WHEN t.account_id IS NOT NULL AND scope_account.type = 'CREDIT_CARD'
                                AND COALESCE(scope_account.due_day, 10) <= COALESCE(scope_account.closing_day, 1)
                               THEN (t.competence_date + interval '1 month')::date
                           ELSE t.competence_date
                        END) <= COALESCE(v_scope_end, 'infinity'::date)
                   ELSE false
               END
           )
         ORDER BY t.date DESC
         LIMIT 500
    ),
    splits_data AS (
        SELECT ts.id, ts.transaction_id, ts.user_id, ts.member_id, ts.name,
               ts.amount, ts.percentage, ts.is_settled, ts.settled_at,
               ts.settled_by_debtor, ts.settled_by_creditor
          FROM public.transaction_splits AS ts
          JOIN tx_data AS td ON td.id = ts.transaction_id
         WHERE ts.deleted_at IS NULL
    ),
    accounts_data AS (
        SELECT DISTINCT ON (a.id) a.id, a.type, a.closing_day, a.due_day, a.user_id
          FROM public.accounts AS a
          JOIN tx_data AS td ON td.account_id = a.id
    ),
    splits_grouped AS (
        SELECT transaction_id, jsonb_agg(to_jsonb(s)) AS splits
          FROM splits_data AS s
         GROUP BY transaction_id
    )
    SELECT jsonb_build_object(
        'transactions', COALESCE((
            SELECT jsonb_agg(to_jsonb(td) || jsonb_build_object(
                'transaction_splits', COALESCE(sg.splits, '[]'::jsonb)
            ))
              FROM tx_data AS td
              LEFT JOIN splits_grouped AS sg ON sg.transaction_id = td.id
        ), '[]'::jsonb),
        'accounts', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM accounts_data AS a), '[]'::jsonb),
        'members', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', fm.id, 'user_id', fm.user_id, 'linked_user_id', fm.linked_user_id,
                'name', COALESCE(p.full_name, fm.name), 'role', fm.role,
                'family_id', fm.family_id, 'sharing_scope', fm.sharing_scope,
                'scope_start_date', fm.scope_start_date, 'scope_end_date', fm.scope_end_date,
                'scope_trip_id', fm.scope_trip_id
            ))
              FROM public.family_members AS fm
              LEFT JOIN public.profiles AS p ON p.id = COALESCE(fm.linked_user_id, fm.user_id)
             WHERE fm.family_id = v_family_id
               AND fm.status = 'active'
               AND fm.removed_at IS NULL
               AND (v_is_owner OR fm.id = v_member_row_id
                    OR COALESCE(fm.linked_user_id, fm.user_id) = v_family_owner_id)
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_family_consolidated_summary(
    p_family_id uuid,
    p_month_start date DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS TABLE(
    member_id uuid,
    linked_user_id uuid,
    member_name text,
    balance numeric,
    patrimony numeric,
    income numeric,
    expense numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_is_owner boolean := false;
    v_month_end date;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.families AS f
        WHERE f.id = p_family_id
          AND f.owner_id = auth.uid()
          AND f.deleted = false
          AND f.deleted_at IS NULL
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    v_month_end := (p_month_start + interval '1 month - 1 day')::date;

    RETURN QUERY
    SELECT fm.id,
           fm.linked_user_id,
           COALESCE(p.full_name, p.email, 'Membro')::text,
           COALESCE((
               SELECT SUM(a.balance)
                 FROM public.accounts AS a
                WHERE a.user_id = fm.linked_user_id
                  AND a.deleted_at IS NULL
                  AND a.type NOT IN ('CREDIT_CARD', 'INVESTMENT', 'EMERGENCY_FUND')
                  AND a.currency = 'BRL'
           ), 0)::numeric,
           COALESCE((
               SELECT SUM(a.balance)
                 FROM public.accounts AS a
                WHERE a.user_id = fm.linked_user_id
                  AND a.deleted_at IS NULL
                  AND a.type <> 'CREDIT_CARD'
                  AND a.currency = 'BRL'
           ), 0)::numeric,
           COALESCE((
               SELECT SUM(t.amount)
                 FROM public.transactions AS t
                WHERE t.user_id = fm.linked_user_id
                  AND t.deleted_at IS NULL
                  AND t.type = 'INCOME'
                  AND t.date BETWEEN p_month_start AND v_month_end
                  AND t.currency = 'BRL'
           ), 0)::numeric,
           COALESCE((
               SELECT SUM(t.amount)
                 FROM public.transactions AS t
                WHERE t.user_id = fm.linked_user_id
                  AND t.deleted_at IS NULL
                  AND t.type = 'EXPENSE'
                  AND t.date BETWEEN p_month_start AND v_month_end
                  AND t.currency = 'BRL'
           ), 0)::numeric
      FROM public.family_members AS fm
      JOIN public.profiles AS p ON p.id = fm.linked_user_id
     WHERE fm.family_id = p_family_id
       AND fm.linked_user_id IS NOT NULL
       AND fm.member_type = 'family'
       AND fm.status = 'active'
       AND fm.removed_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION private.guard_family_member_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_is_owner boolean;
    v_is_contact_inviter boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.families AS f
        WHERE f.id = OLD.family_id
          AND f.owner_id = auth.uid()
          AND f.deleted = false
          AND f.deleted_at IS NULL
    ) INTO v_is_owner;

    IF v_is_owner THEN
        RETURN NEW;
    END IF;

    v_is_contact_inviter := OLD.member_type = 'contact' AND OLD.invited_by = auth.uid();

    IF v_is_contact_inviter
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.family_id IS NOT DISTINCT FROM OLD.family_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND NEW.linked_user_id IS NOT DISTINCT FROM OLD.linked_user_id
       AND NEW.member_type IS NOT DISTINCT FROM OLD.member_type
       AND NEW.role IS NOT DISTINCT FROM OLD.role
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.sharing_scope IS NOT DISTINCT FROM OLD.sharing_scope
       AND NEW.scope_start_date IS NOT DISTINCT FROM OLD.scope_start_date
       AND NEW.scope_end_date IS NOT DISTINCT FROM OLD.scope_end_date
       AND NEW.scope_trip_id IS NOT DISTINCT FROM OLD.scope_trip_id
       AND NEW.invited_by IS NOT DISTINCT FROM OLD.invited_by
       AND NEW.removed_at IS NOT DISTINCT FROM OLD.removed_at
       AND NEW.removed_by IS NOT DISTINCT FROM OLD.removed_by
       AND NEW.removal_reason IS NOT DISTINCT FROM OLD.removal_reason THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS DISTINCT FROM OLD.linked_user_id
       AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Somente o proprietário pode alterar dados de outros membros';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.family_id IS DISTINCT FROM OLD.family_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.linked_user_id IS DISTINCT FROM OLD.linked_user_id
       OR NEW.member_type IS DISTINCT FROM OLD.member_type
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.sharing_scope IS DISTINCT FROM OLD.sharing_scope
       OR NEW.scope_start_date IS DISTINCT FROM OLD.scope_start_date
       OR NEW.scope_end_date IS DISTINCT FROM OLD.scope_end_date
       OR NEW.scope_trip_id IS DISTINCT FROM OLD.scope_trip_id
       OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
       OR NEW.removed_at IS DISTINCT FROM OLD.removed_at
       OR NEW.removed_by IS DISTINCT FROM OLD.removed_by
       OR NEW.removal_reason IS DISTINCT FROM OLD.removal_reason THEN
        RAISE EXCEPTION 'Somente o proprietário da família pode alterar o escopo e as permissões do membro';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_family_member_updates ON public.family_members;
CREATE TRIGGER guard_family_member_updates
BEFORE UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION private.guard_family_member_updates();

DROP POLICY IF EXISTS "Family owners and admins can delete members" ON public.family_members;
CREATE POLICY "Family owners and contact creators can delete members"
ON public.family_members
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.families AS f
        WHERE f.id = family_members.family_id
          AND f.owner_id = auth.uid()
    )
    OR (
        family_members.member_type = 'contact'
        AND family_members.invited_by = auth.uid()
    )
);

REVOKE ALL ON FUNCTION public.get_shared_invoice_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_invoice_data(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_family_consolidated_summary(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_consolidated_summary(uuid, date) TO authenticated, service_role;
