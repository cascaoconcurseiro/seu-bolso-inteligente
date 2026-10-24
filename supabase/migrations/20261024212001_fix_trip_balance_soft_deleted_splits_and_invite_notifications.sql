-- Soft-deleted splits must not affect trip participant balances.
CREATE OR REPLACE FUNCTION public.get_trip_participant_balances(p_trip_id uuid)
RETURNS TABLE(
  participant_id uuid,
  user_id uuid,
  name text,
  paid numeric,
  owes numeric,
  balance numeric,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH trip_tx AS (
    SELECT t.id, t.amount, t.currency, t.user_id AS payer_id, t.domain
    FROM transactions t
    WHERE t.trip_id = p_trip_id
      AND t.deleted_at IS NULL
      AND t.source_transaction_id IS NULL
  ),
  splits_data AS (
    SELECT
      ts.member_id,
      ts.user_id,
      ts.amount AS split_amount,
      tt.amount AS tx_amount,
      tt.currency,
      tt.payer_id,
      tt.id AS tx_id
    FROM transaction_splits ts
    JOIN trip_tx tt ON ts.transaction_id = tt.id
    WHERE ts.deleted_at IS NULL
  ),
  participant_paid AS (
    SELECT
      tt.payer_id AS user_id,
      tt.currency,
      COALESCE(SUM(tt.amount), 0) AS paid
    FROM trip_tx tt
    GROUP BY tt.payer_id, tt.currency
  ),
  participant_owes AS (
    SELECT
      sd.user_id,
      sd.currency,
      COALESCE(SUM(sd.split_amount), 0) AS owes
    FROM splits_data sd
    GROUP BY sd.user_id, sd.currency
  ),
  all_participants AS (
    SELECT DISTINCT pp.user_id FROM participant_paid pp
    UNION
    SELECT DISTINCT po.user_id FROM participant_owes po
  )
  SELECT
    tm.id AS participant_id,
    ap.user_id,
    COALESCE(p.full_name, tm.guest_name, 'Participante') AS name,
    COALESCE(pp.paid, 0) AS paid,
    COALESCE(po.owes, 0) AS owes,
    COALESCE(pp.paid, 0) - COALESCE(po.owes, 0) AS balance,
    COALESCE(pp.currency, po.currency, 'BRL') AS currency
  FROM all_participants ap
  LEFT JOIN trip_members tm ON tm.user_id = ap.user_id AND tm.trip_id = p_trip_id
  LEFT JOIN profiles p ON p.id = ap.user_id
  LEFT JOIN participant_paid pp ON pp.user_id = ap.user_id
  LEFT JOIN participant_owes po ON po.user_id = ap.user_id;
END;
$function$;

-- The current invitation notification stores the trip ID, not the invitation ID.
-- Match the invitee, trip and type; accept both the new invitation metadata and
-- legacy notifications that predate the metadata field.
CREATE OR REPLACE FUNCTION public.fn_respond_trip_invitation(
  p_invitation_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_invitation public.trip_invitations%ROWTYPE;
  v_trip_name text;
  v_invitee_name text;
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported invitation response'
      USING ERRCODE = '22023';
  END IF;

  SELECT invitation.*
  INTO v_invitation
  FROM public.trip_invitations AS invitation
  WHERE invitation.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.invitee_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF v_invitation.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Invitation has already been answered'
      USING ERRCODE = '55000';
  END IF;

  IF p_status = 'accepted' THEN
    SELECT trip.name
    INTO v_trip_name
    FROM public.trips AS trip
    WHERE trip.id = v_invitation.trip_id
      AND trip.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Trip is unavailable' USING ERRCODE = '55000';
    END IF;
  END IF;

  UPDATE public.trip_invitations
  SET status = p_status,
      responded_at = now(),
      updated_at = now()
  WHERE id = p_invitation_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation has already been answered'
      USING ERRCODE = '55000';
  END IF;

  IF v_trip_name IS NULL THEN
    SELECT trip.name INTO v_trip_name
    FROM public.trips AS trip
    WHERE trip.id = v_invitation.trip_id;
  END IF;

  SELECT profile.full_name INTO v_invitee_name
  FROM public.profiles AS profile
  WHERE profile.id = v_invitation.invitee_id;

  IF p_status = 'accepted' THEN
    INSERT INTO public.trip_members (trip_id, user_id, role, status)
    VALUES (v_invitation.trip_id, v_invitation.invitee_id, 'member', 'active')
    ON CONFLICT (trip_id, user_id) DO UPDATE
      SET status = 'active';

    PERFORM public.fn_create_notification(
      v_invitation.inviter_id,
      'Convite Aceito',
      COALESCE(v_invitee_name, 'Alguém') || ' aceitou seu convite para a viagem "' || COALESCE(v_trip_name, 'Sem nome') || '".',
      'GENERAL',
      v_invitation.trip_id::text,
      jsonb_build_object('trip_id', v_invitation.trip_id),
      '/viagens'
    );
  ELSE
    PERFORM public.fn_create_notification(
      v_invitation.inviter_id,
      'Convite Recusado',
      COALESCE(v_invitee_name, 'Alguém') || ' recusou seu convite para a viagem "' || COALESCE(v_trip_name, 'Sem nome') || '".',
      'GENERAL',
      v_invitation.trip_id::text,
      jsonb_build_object('trip_id', v_invitation.trip_id),
      '/viagens'
    );
  END IF;

  UPDATE public.notifications
  SET is_read = true,
      read_at = now(),
      is_dismissed = true,
      dismissed_at = now()
  WHERE user_id = v_invitation.invitee_id
    AND type = 'TRIP_INVITE'
    AND related_id = v_invitation.trip_id
    AND related_type = 'trip'
    AND (
      metadata ->> 'trip_invitation_id' = p_invitation_id::text
      OR NOT (COALESCE(metadata, '{}'::jsonb) ? 'trip_invitation_id')
    );

  -- Retain cleanup compatibility for older notification payloads.
  UPDATE public.notifications
  SET is_read = true,
      read_at = now(),
      is_dismissed = true,
      dismissed_at = now()
  WHERE user_id = v_invitation.invitee_id
    AND type = 'TRIP_INVITE'
    AND related_id = p_invitation_id
    AND related_type = 'trip_invitation';

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$function$;
