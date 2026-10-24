-- Invite by email without revealing whether that address has an account.
-- Existing invites addressed to a profile remain readable through to_user_id;
-- new invites carry only the email supplied by the sender.
ALTER TABLE public.family_invitations
  ALTER COLUMN to_user_id DROP NOT NULL;

ALTER TABLE public.family_invitations
  ADD COLUMN IF NOT EXISTS to_email text;

ALTER TABLE public.family_invitations
  ADD CONSTRAINT family_invitations_recipient_required
  CHECK (to_user_id IS NOT NULL OR NULLIF(btrim(to_email), '') IS NOT NULL);

ALTER TABLE public.family_invitations
  ADD CONSTRAINT family_invitations_to_email_normalized
  CHECK (to_email IS NULL OR to_email = lower(btrim(to_email)));

CREATE UNIQUE INDEX IF NOT EXISTS family_invitations_pending_email_unique
  ON public.family_invitations (from_user_id, family_id, to_email)
  WHERE status = 'pending'
    AND deleted_at IS NULL
    AND to_user_id IS NULL
    AND to_email IS NOT NULL;

DROP POLICY IF EXISTS "Users can create invitations" ON public.family_invitations;
CREATE POLICY "Users can create invitations"
  ON public.family_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = (SELECT auth.uid())
    AND to_user_id IS NULL
    AND to_email IS NOT NULL
    AND lower(to_email) <> lower(COALESCE(auth.jwt() ->> 'email', ''))
    AND EXISTS (
      SELECT 1
      FROM public.families AS family
      WHERE family.id = family_id
        AND family.deleted_at IS NULL
        AND (
          family.owner_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.family_members AS member
            WHERE member.family_id = family.id
              AND (member.user_id = (SELECT auth.uid()) OR member.linked_user_id = (SELECT auth.uid()))
              AND member.role = 'admin'::public.family_role
              AND member.status = 'active'
              AND member.removed_at IS NULL
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can view own invitations" ON public.family_invitations;
CREATE POLICY "Users can view own invitations"
  ON public.family_invitations
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = (SELECT auth.uid())
    OR to_user_id = (SELECT auth.uid())
    OR (
      to_user_id IS NULL
      AND lower(to_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE OR REPLACE FUNCTION public.handle_family_invitation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_family_name text;
  v_inviter_name text;
  v_invitee_name text;
BEGIN
  SELECT family.name INTO v_family_name
  FROM public.families AS family
  WHERE family.id = COALESCE(NEW.family_id, OLD.family_id);

  SELECT COALESCE(profile.full_name, 'Alguém') INTO v_inviter_name
  FROM public.profiles AS profile
  WHERE profile.id = COALESCE(NEW.from_user_id, OLD.from_user_id);

  SELECT COALESCE(profile.full_name, NEW.member_name, 'Alguém') INTO v_invitee_name
  FROM public.profiles AS profile
  WHERE profile.id = COALESCE(NEW.to_user_id, OLD.to_user_id);
  v_invitee_name := COALESCE(v_invitee_name, NEW.member_name, 'Alguém');

  IF TG_OP = 'INSERT' AND NEW.to_user_id IS NOT NULL THEN
    PERFORM public.fn_create_notification(
      NEW.to_user_id,
      'Convite para família: ' || COALESCE(v_family_name, 'Família'),
      v_inviter_name || ' te convidou para fazer parte da família compartilhada.',
      'FAMILY_INVITE', NEW.id::text,
      jsonb_build_object('family_id', NEW.family_id, 'invitation_id', NEW.id),
      '/familia'
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    IF NEW.status = 'accepted' THEN
      PERFORM public.fn_create_notification(
        NEW.from_user_id, 'Convite de Família Aceito',
        v_invitee_name || ' aceitou seu convite e agora faz parte da família "' || COALESCE(v_family_name, 'Família') || '".',
        'GENERAL', NEW.id::text,
        jsonb_build_object('family_id', NEW.family_id, 'status', 'accepted'), '/familia'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.fn_create_notification(
        NEW.from_user_id, 'Convite de Família Recusado',
        v_invitee_name || ' recusou seu convite para a família "' || COALESCE(v_family_name, 'Família') || '".',
        'GENERAL', NEW.id::text,
        jsonb_build_object('family_id', NEW.family_id, 'status', 'rejected'), '/familia'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_respond_family_invitation(
  p_invitation_id uuid,
  p_status text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation public.family_invitations%ROWTYPE;
  v_member_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Autenticação obrigatória');
  END IF;

  IF p_status NOT IN ('accepted', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Status inválido');
  END IF;

  SELECT profile.email
  INTO v_email
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

  SELECT invitation.*
  INTO v_invitation
  FROM public.family_invitations AS invitation
  WHERE invitation.id = p_invitation_id
    AND invitation.status = 'pending'
    AND COALESCE(invitation.deleted, false) = false
    AND (
      invitation.to_user_id = v_user_id
      OR (
        invitation.to_user_id IS NULL
        AND lower(invitation.to_email) = lower(COALESCE(v_email, auth.jwt() ->> 'email', ''))
      )
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado ou já respondido');
  END IF;

  IF p_status = 'accepted' THEN
    IF v_email IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Perfil do usuário não encontrado');
    END IF;

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
      AND lower(email) = lower(v_email)
    RETURNING id INTO v_member_id;

    IF v_member_id IS NULL THEN
      INSERT INTO public.family_members (
        family_id, user_id, linked_user_id, name, email, role, status, invited_by,
        sharing_scope, scope_start_date, scope_end_date, scope_trip_id,
        member_type, active_in_form
      ) VALUES (
        v_invitation.family_id, v_user_id, v_user_id, v_invitation.member_name, v_email,
        v_invitation.role, 'active', v_invitation.from_user_id,
        v_invitation.sharing_scope, v_invitation.scope_start_date,
        v_invitation.scope_end_date, v_invitation.scope_trip_id, 'family', true
      )
      ON CONFLICT (family_id, linked_user_id) DO UPDATE
      SET
        user_id = EXCLUDED.user_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        status = 'active',
        invited_by = EXCLUDED.invited_by,
        sharing_scope = EXCLUDED.sharing_scope,
        scope_start_date = EXCLUDED.scope_start_date,
        scope_end_date = EXCLUDED.scope_end_date,
        scope_trip_id = EXCLUDED.scope_trip_id,
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
$function$;

REVOKE ALL ON FUNCTION public.find_profile_for_family_link_v2(text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_respond_family_invitation(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_respond_family_invitation(uuid, text)
  TO authenticated;
