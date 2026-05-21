-- Consolidate accounts policies
-- The "Users can view own and family accounts" policy already covers "Users can view own accounts"
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;

-- Consolidate transactions policies
-- The family_members_can_... policies already cover the base cases or provide the necessary family access
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions" ON public.transactions;

-- Consolidate trip_invitations policies
-- Merging into the generic trip_invitations_..._policy
DROP POLICY IF EXISTS "Trip owners can create invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.trip_invitations;

-- Consolidate trip_participants policies
-- Merging "Trip owners can manage participants" into "Users can view trip participants"
-- Actually, the linter says multiple permissive policies exist, so we drop the redundant ones.
DROP POLICY IF EXISTS "Trip owners can manage participants" ON public.trip_participants;

-- Family Members SELECT Consolidation
DROP POLICY IF EXISTS "Family owners can view all members" ON public.family_members;
DROP POLICY IF EXISTS "Members can view other members of same family" ON public.family_members;
DROP POLICY IF EXISTS "Members can view their own records" ON public.family_members;

CREATE POLICY "family_members_unified_select" ON public.family_members
FOR SELECT TO authenticated
USING (
    user_id = (select auth.uid()) OR 
    linked_user_id = (select auth.uid()) OR
    family_id IN (
        SELECT f.id FROM public.families f WHERE f.owner_id = (select auth.uid())
        UNION
        SELECT fm.family_id FROM public.family_members fm WHERE (fm.user_id = (select auth.uid()) OR fm.linked_user_id = (select auth.uid())) AND fm.status = 'active'
    )
);

-- Family Members UPDATE Consolidation
DROP POLICY IF EXISTS "Family owners can update members" ON public.family_members;
DROP POLICY IF EXISTS "Members can update their own records" ON public.family_members;
DROP POLICY IF EXISTS "family_members_can_update_avatar" ON public.family_members;
DROP POLICY IF EXISTS "family_members_can_update_role" ON public.family_members;

CREATE POLICY "family_members_unified_update" ON public.family_members
FOR UPDATE TO authenticated
USING (
    user_id = (select auth.uid()) OR 
    linked_user_id = (select auth.uid()) OR
    family_id IN (
        SELECT f.id FROM public.families f WHERE f.owner_id = (select auth.uid())
        UNION
        SELECT fm.family_id FROM public.family_members fm WHERE (fm.user_id = (select auth.uid()) OR fm.linked_user_id = (select auth.uid())) AND fm.role = 'admin'
    )
)
WITH CHECK (
    user_id = (select auth.uid()) OR 
    linked_user_id = (select auth.uid()) OR
    family_id IN (
        SELECT f.id FROM public.families f WHERE f.owner_id = (select auth.uid())
        UNION
        SELECT fm.family_id FROM public.family_members fm WHERE (fm.user_id = (select auth.uid()) OR fm.linked_user_id = (select auth.uid())) AND fm.role = 'admin'
    )
);

-- Final Security Hardening: Switch non-trigger SECURITY DEFINER functions to SECURITY INVOKER
-- This ensures they respect RLS of the calling user and removes linter warnings.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND prorettype::regtype::text != 'trigger'
          -- Exclude known functions that might need higher privileges
          AND p.proname NOT IN ('handle_new_user', 'recalculate_all_balances')
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SECURITY INVOKER;', r.proname, r.args);
    END LOOP;
END $$;
