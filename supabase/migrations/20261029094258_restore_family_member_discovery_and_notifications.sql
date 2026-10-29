-- Restore profile discovery for family invites and ensure invited members receive notifications

-- 1. Grant execute on find_profile_for_family_link_v2 to authenticated users so the family dialog can recognize registered members
GRANT EXECUTE ON FUNCTION public.find_profile_for_family_link_v2(text, text) TO authenticated, service_role;

-- 2. Allow invitations to optionally include to_user_id when the invited member is already registered
ALTER POLICY "Users can create invitations" ON public.family_invitations WITH CHECK (
  from_user_id = (SELECT auth.uid())
  AND (to_email IS NOT NULL OR to_user_id IS NOT NULL)
  AND (to_email IS NULL OR lower(to_email) <> lower(COALESCE(auth.jwt() ->> 'email', '')))
  AND (to_user_id IS NULL OR to_user_id <> (SELECT auth.uid()))
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

ALTER POLICY "Users can view own invitations" ON public.family_invitations USING (
  from_user_id = (SELECT auth.uid())
  OR to_user_id = (SELECT auth.uid())
  OR (
    lower(to_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);

-- 3. Notify the invited user in-app (resolving recipient from to_user_id or to_email)
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
  v_target_user_id uuid;
BEGIN
  SELECT family.name INTO v_family_name
  FROM public.families AS family
  WHERE family.id = COALESCE(NEW.family_id, OLD.family_id);

  SELECT COALESCE(profile.full_name, 'Alguém') INTO v_inviter_name
  FROM public.profiles AS profile
  WHERE profile.id = COALESCE(NEW.from_user_id, OLD.from_user_id);

  v_target_user_id := COALESCE(NEW.to_user_id, OLD.to_user_id);
  IF v_target_user_id IS NULL AND NEW.to_email IS NOT NULL THEN
    SELECT p.id INTO v_target_user_id
    FROM public.profiles AS p
    WHERE lower(p.email) = lower(btrim(NEW.to_email))
    LIMIT 1;
  END IF;

  SELECT COALESCE(profile.full_name, NEW.member_name, 'Alguém') INTO v_invitee_name
  FROM public.profiles AS profile
  WHERE profile.id = v_target_user_id;
  v_invitee_name := COALESCE(v_invitee_name, NEW.member_name, 'Alguém');

  IF TG_OP = 'INSERT' AND v_target_user_id IS NOT NULL THEN
    PERFORM public.fn_create_notification(
      v_target_user_id,
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
