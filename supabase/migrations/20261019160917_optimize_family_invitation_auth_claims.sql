-- Evaluate the JWT email once per statement in RLS policies instead of once
-- for every invitation row. This preserves the existing ownership checks.
DROP POLICY IF EXISTS "Users can create invitations" ON public.family_invitations;
CREATE POLICY "Users can create invitations"
  ON public.family_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = (SELECT auth.uid())
    AND to_user_id IS NULL
    AND to_email IS NOT NULL
    AND lower(to_email) <> lower(COALESCE((SELECT auth.jwt()) ->> 'email', ''))
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
      AND lower(to_email) = lower(COALESCE((SELECT auth.jwt()) ->> 'email', ''))
    )
  );
