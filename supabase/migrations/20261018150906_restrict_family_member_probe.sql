CREATE OR REPLACE FUNCTION public.is_family_member_v2(
  p_family_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- This helper is called by RLS with auth.uid(). Prevent direct RPC callers
  -- from probing membership for arbitrary user IDs.
  IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members AS member
    WHERE member.family_id = p_family_id
      AND (member.linked_user_id = v_user_id OR member.user_id = v_user_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.is_family_member_v2(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_family_member_v2(uuid, uuid) TO authenticated, service_role;
