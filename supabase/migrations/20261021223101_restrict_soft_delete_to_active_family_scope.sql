-- A family editor must remain active and the transaction must be within the
-- member's sharing scope before a SECURITY DEFINER delete can affect another
-- user's transaction. Series cascades are checked row by row as well.
CREATE OR REPLACE FUNCTION public.soft_delete_transaction(
  p_transaction_id uuid,
  p_cascade text DEFAULT 'NONE'::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tx public.transactions%ROWTYPE;
  v_family_member_id uuid;
  v_family_id uuid;
  v_sharing_scope text;
  v_scope_start date;
  v_scope_end date;
  v_scope_trip_id uuid;
  v_now timestamptz := now();
  v_count integer := 0;
  v_mirror_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_cascade IS NULL OR p_cascade NOT IN ('NONE', 'NEXT', 'ALL') THEN
    RAISE EXCEPTION 'Tipo de cascata inválido: %', p_cascade USING ERRCODE = '22023';
  END IF;

  SELECT transaction_row.*
  INTO v_tx
  FROM public.transactions AS transaction_row
  WHERE transaction_row.id = p_transaction_id
    AND transaction_row.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada ou já excluída' USING ERRCODE = 'P0002';
  END IF;

  IF v_tx.user_id IS DISTINCT FROM v_uid THEN
    SELECT member.id, member.family_id, member.sharing_scope,
           member.scope_start_date, member.scope_end_date, member.scope_trip_id
    INTO v_family_member_id, v_family_id, v_sharing_scope,
         v_scope_start, v_scope_end, v_scope_trip_id
    FROM public.family_members AS member
    JOIN public.families AS family ON family.id = member.family_id
    LEFT JOIN public.accounts AS account ON account.id = v_tx.account_id
    WHERE (member.linked_user_id = v_uid OR member.user_id = v_uid)
      AND member.member_type = 'family'
      AND member.status = 'active'
      AND member.removed_at IS NULL
      AND member.role IN ('admin', 'editor')
      AND family.deleted = false
      AND family.deleted_at IS NULL
      AND (
        family.owner_id = v_tx.user_id
        OR EXISTS (
          SELECT 1
          FROM public.family_members AS transaction_owner
          WHERE transaction_owner.family_id = family.id
            AND (transaction_owner.linked_user_id = v_tx.user_id
                 OR transaction_owner.user_id = v_tx.user_id)
            AND transaction_owner.member_type = 'family'
            AND transaction_owner.status = 'active'
            AND transaction_owner.removed_at IS NULL
        )
      )
      AND CASE member.sharing_scope
        WHEN 'all' THEN true
        WHEN 'trips_only' THEN v_tx.trip_id IS NOT NULL
        WHEN 'specific_trip' THEN
          member.scope_trip_id IS NOT NULL AND v_tx.trip_id = member.scope_trip_id
        WHEN 'date_range' THEN
          (CASE
            WHEN v_tx.competence_date IS NULL THEN v_tx.date
            WHEN v_tx.account_id IS NOT NULL
                 AND account.type = 'CREDIT_CARD'
                 AND COALESCE(account.due_day, 10) <= COALESCE(account.closing_day, 1)
              THEN (v_tx.competence_date + interval '1 month')::date
            ELSE v_tx.competence_date
          END) >= COALESCE(member.scope_start_date, '-infinity'::date)
          AND
          (CASE
            WHEN v_tx.competence_date IS NULL THEN v_tx.date
            WHEN v_tx.account_id IS NOT NULL
                 AND account.type = 'CREDIT_CARD'
                 AND COALESCE(account.due_day, 10) <= COALESCE(account.closing_day, 1)
              THEN (v_tx.competence_date + interval '1 month')::date
            ELSE v_tx.competence_date
          END) <= COALESCE(member.scope_end_date, 'infinity'::date)
        ELSE false
      END
      AND (
        COALESCE(v_tx.creator_user_id, v_tx.user_id) = v_uid
        OR v_tx.is_shared = true
        OR v_tx.domain = 'SHARED'
        OR EXISTS (
          SELECT 1
          FROM public.transaction_splits AS split
          WHERE split.transaction_id = v_tx.id
            AND split.deleted_at IS NULL
            AND (
              split.user_id = v_uid
              OR split.member_id IN (
                SELECT family_member.id
                FROM public.family_members AS family_member
                WHERE family_member.family_id = member.family_id
                  AND family_member.member_type = 'family'
                  AND family_member.status = 'active'
                  AND family_member.removed_at IS NULL
              )
            )
        )
      )
    ORDER BY (family.owner_id = v_tx.user_id) DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sem permissão para excluir esta transação' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Espelho: excluir o original, não o espelho.
  IF v_tx.source_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'Esta é uma transação espelhada. Exclua a transação original.'
      USING ERRCODE = '22023';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _sdt_targets (id uuid PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE TABLE pg_temp._sdt_targets;

  IF p_cascade = 'ALL' AND v_tx.series_id IS NOT NULL THEN
    INSERT INTO pg_temp._sdt_targets (id)
    SELECT installment.id
    FROM public.transactions AS installment
    WHERE installment.series_id = v_tx.series_id
      AND installment.user_id = v_tx.user_id
      AND installment.deleted_at IS NULL;
  ELSIF p_cascade = 'NEXT' AND v_tx.series_id IS NOT NULL THEN
    INSERT INTO pg_temp._sdt_targets (id)
    SELECT installment.id
    FROM public.transactions AS installment
    WHERE installment.series_id = v_tx.series_id
      AND installment.user_id = v_tx.user_id
      AND installment.deleted_at IS NULL
      AND COALESCE(installment.current_installment, 1) >= COALESCE(v_tx.current_installment, 1);
  ELSE
    INSERT INTO pg_temp._sdt_targets (id) VALUES (p_transaction_id);
  END IF;

  -- Do not let a visible installment authorize deleting other users' rows or
  -- installments outside this editor's sharing scope.
  IF v_family_member_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM pg_temp._sdt_targets AS target
    JOIN public.transactions AS installment ON installment.id = target.id
    LEFT JOIN public.accounts AS account ON account.id = installment.account_id
    WHERE installment.user_id IS DISTINCT FROM v_tx.user_id
       OR CASE v_sharing_scope
         WHEN 'all' THEN false
         WHEN 'trips_only' THEN installment.trip_id IS NULL
         WHEN 'specific_trip' THEN installment.trip_id IS DISTINCT FROM v_scope_trip_id
         WHEN 'date_range' THEN
           (CASE
             WHEN installment.competence_date IS NULL THEN installment.date
             WHEN installment.account_id IS NOT NULL
                  AND account.type = 'CREDIT_CARD'
                  AND COALESCE(account.due_day, 10) <= COALESCE(account.closing_day, 1)
               THEN (installment.competence_date + interval '1 month')::date
             ELSE installment.competence_date
           END) < COALESCE(v_scope_start, '-infinity'::date)
           OR
           (CASE
             WHEN installment.competence_date IS NULL THEN installment.date
             WHEN installment.account_id IS NOT NULL
                  AND account.type = 'CREDIT_CARD'
                  AND COALESCE(account.due_day, 10) <= COALESCE(account.closing_day, 1)
               THEN (installment.competence_date + interval '1 month')::date
             ELSE installment.competence_date
           END) > COALESCE(v_scope_end, 'infinity'::date)
         ELSE true
       END
       OR NOT (
         COALESCE(installment.creator_user_id, installment.user_id) = v_uid
         OR installment.is_shared = true
         OR installment.domain = 'SHARED'
         OR EXISTS (
           SELECT 1
           FROM public.transaction_splits AS split
           WHERE split.transaction_id = installment.id
             AND split.deleted_at IS NULL
             AND (
               split.user_id = v_uid
               OR split.member_id IN (
                 SELECT family_member.id
                 FROM public.family_members AS family_member
                 WHERE family_member.family_id = v_family_id
                   AND family_member.member_type = 'family'
                   AND family_member.status = 'active'
                   AND family_member.removed_at IS NULL
               )
             )
         )
       )
  ) THEN
    RAISE EXCEPTION 'A série contém transações fora do seu escopo de compartilhamento'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transactions AS transaction_row
    JOIN pg_temp._sdt_targets AS target ON target.id = transaction_row.id
    WHERE transaction_row.is_settled = true
  ) THEN
    RAISE EXCEPTION 'Transação já liquidada/acertada. Desfaça o acerto antes de excluí-la.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transaction_splits AS split
    JOIN pg_temp._sdt_targets AS target ON target.id = split.transaction_id
    WHERE split.is_settled = true
       OR split.settled_by_debtor = true
       OR split.settled_by_creditor = true
  ) THEN
    RAISE EXCEPTION 'Transação possui acertos. Desfaça os acertos antes de excluí-la.';
  END IF;

  -- A family editor may remove mirrors only when their owner still belongs to
  -- this family. Otherwise deleting the source would mutate another user's
  -- private ledger outside the caller's family authority.
  IF v_family_member_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.transactions AS mirror
    JOIN pg_temp._sdt_targets AS target ON target.id = mirror.source_transaction_id
    WHERE mirror.deleted_at IS NULL
      AND NOT (
        mirror.user_id = (
          SELECT family.owner_id
          FROM public.families AS family
          WHERE family.id = v_family_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.family_members AS mirror_owner
          WHERE mirror_owner.family_id = v_family_id
            AND (mirror_owner.linked_user_id = mirror.user_id
                 OR mirror_owner.user_id = mirror.user_id)
            AND mirror_owner.member_type IN ('family', 'contact')
            AND mirror_owner.status = 'active'
            AND mirror_owner.removed_at IS NULL
        )
      )
  ) THEN
    RAISE EXCEPTION 'A transação possui espelho fora da família autorizada'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.transactions AS transaction_row
  SET deleted_at = v_now
  FROM pg_temp._sdt_targets AS target
  WHERE transaction_row.id = target.id
    AND transaction_row.deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.transactions AS mirror
  SET deleted_at = v_now
  WHERE mirror.source_transaction_id IN (
      SELECT target.id FROM pg_temp._sdt_targets AS target
    )
    AND mirror.deleted_at IS NULL;
  GET DIAGNOSTICS v_mirror_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma transação foi excluída';
  END IF;

  RETURN v_count + v_mirror_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_transaction(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.soft_delete_transaction(uuid, text) TO authenticated;
