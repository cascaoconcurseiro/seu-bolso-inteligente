CREATE OR REPLACE FUNCTION public.fn_respond_family_invitation(
  p_invitation_id uuid,
  p_status text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invitation public.family_invitations%ROWTYPE;
  v_email text;
  v_member_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Autenticação obrigatória');
  END IF;

  IF p_status NOT IN ('accepted', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Status inválido');
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.family_invitations
  WHERE id = p_invitation_id
    AND to_user_id = v_user_id
    AND status = 'pending'
    AND COALESCE(deleted, false) = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado ou já respondido');
  END IF;

  IF p_status = 'accepted' THEN
    SELECT email INTO v_email
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_email IS NOT NULL THEN
      UPDATE public.family_members
      SET
        user_id = v_user_id,
        linked_user_id = v_user_id,
        name = v_invitation.member_name,
        role = v_invitation.role,
        status = 'active',
        invited_by = v_invitation.from_user_id,
        sharing_scope = v_invitation.sharing_scope,
        scope_start_date = v_invitation.scope_start_date,
        scope_end_date = v_invitation.scope_end_date,
        scope_trip_id = v_invitation.scope_trip_id,
        member_type = 'family',
        active_in_form = true,
        removed_at = null,
        removed_by = null,
        removal_reason = null,
        updated_at = now()
      WHERE family_id = v_invitation.family_id
        AND linked_user_id IS NULL
        AND email = v_email
      RETURNING id INTO v_member_id;
    END IF;

    IF v_member_id IS NULL THEN
      INSERT INTO public.family_members (
        family_id,
        user_id,
        linked_user_id,
        name,
        email,
        role,
        status,
        invited_by,
        sharing_scope,
        scope_start_date,
        scope_end_date,
        scope_trip_id,
        member_type,
        active_in_form
      ) VALUES (
        v_invitation.family_id,
        v_user_id,
        v_user_id,
        v_invitation.member_name,
        v_email,
        v_invitation.role,
        'active',
        v_invitation.from_user_id,
        v_invitation.sharing_scope,
        v_invitation.scope_start_date,
        v_invitation.scope_end_date,
        v_invitation.scope_trip_id,
        'family',
        true
      )
      ON CONFLICT (family_id, linked_user_id) DO UPDATE
      SET
        user_id = excluded.user_id,
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        status = 'active',
        invited_by = excluded.invited_by,
        sharing_scope = excluded.sharing_scope,
        scope_start_date = excluded.scope_start_date,
        scope_end_date = excluded.scope_end_date,
        scope_trip_id = excluded.scope_trip_id,
        member_type = 'family',
        active_in_form = true,
        removed_at = null,
        removed_by = null,
        removal_reason = null,
        updated_at = now();
    END IF;
  END IF;

  UPDATE public.family_invitations
  SET status = p_status, updated_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'status', p_status);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_respond_family_invitation(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_respond_family_invitation(uuid, text) TO authenticated;
