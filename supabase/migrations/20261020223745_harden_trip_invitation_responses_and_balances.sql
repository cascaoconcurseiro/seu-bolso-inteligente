-- A trip invitation may only be answered once, by the invitee, with an
-- explicit supported response. Lock the pending row so concurrent replies
-- cannot both produce side effects.
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
    -- Serialize acceptance with concurrent trip deletion.
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
  WHERE related_id = p_invitation_id
    AND related_type = 'trip_invitation';

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$function$;

-- Only the trip owner or an active participant may see participant balances.
CREATE OR REPLACE FUNCTION public.get_trip_participant_balances_v2(p_trip_id uuid)
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
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := private.authenticated_uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = p_trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = v_uid
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = v_uid
            AND member.status = 'active'
        )
      )
  ) THEN
    RAISE EXCEPTION 'User is not an active trip participant'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM public.get_trip_participant_balances(p_trip_id);
END;
$function$;
