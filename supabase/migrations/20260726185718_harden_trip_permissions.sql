CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_trip_owner(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips trip
    WHERE trip.id = p_trip_id
      AND trip.owner_id = (SELECT auth.uid())
      AND trip.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips trip
    WHERE trip.id = p_trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_trip_plan(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips trip
    WHERE trip.id = p_trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.role <> 'viewer'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_trip_details(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips trip
    WHERE trip.id = p_trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.can_edit_details = true
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_trip_expenses(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips trip
    WHERE trip.id = p_trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.can_manage_expenses = true
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_trip_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_view_trip(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_edit_trip_plan(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_edit_trip_details(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_trip_expenses(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_trip_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_trip_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_trip_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_trip_expenses(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_trip_protected_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id
    OR OLD.creator_user_id IS DISTINCT FROM NEW.creator_user_id
    OR OLD.source_trip_id IS DISTINCT FROM NEW.source_trip_id
  THEN
    RAISE EXCEPTION 'Protected trip identity fields cannot be changed directly'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.is_trip_owner(OLD.id)
    AND (
      OLD.budget IS DISTINCT FROM NEW.budget
      OR OLD.currency IS DISTINCT FROM NEW.currency
      OR OLD.status IS DISTINCT FROM NEW.status
      OR OLD.deleted IS DISTINCT FROM NEW.deleted
      OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
      OR OLD.deleted_by IS DISTINCT FROM NEW.deleted_by
      OR OLD.is_archived IS DISTINCT FROM NEW.is_archived
      OR OLD.archived_at IS DISTINCT FROM NEW.archived_at
    )
  THEN
    RAISE EXCEPTION 'Only the trip owner can change financial, status, archive, or deletion fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_trip_protected_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_trip_protected_update ON public.trips;
DROP TRIGGER IF EXISTS zz_guard_trip_protected_update ON public.trips;
CREATE TRIGGER zz_guard_trip_protected_update
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.guard_trip_protected_update();

DROP POLICY IF EXISTS trips_select ON public.trips;
DROP POLICY IF EXISTS trips_insert ON public.trips;
DROP POLICY IF EXISTS trips_update ON public.trips;
DROP POLICY IF EXISTS trips_delete ON public.trips;

CREATE POLICY trips_select
ON public.trips
FOR SELECT
TO authenticated
USING (private.can_view_trip(id));

CREATE POLICY trips_insert
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND creator_user_id = (SELECT auth.uid())
  AND (
    source_trip_id IS NULL
    OR private.can_view_trip(source_trip_id)
  )
  AND deleted = false
  AND deleted_at IS NULL
  AND deleted_by IS NULL
  AND COALESCE(is_archived, false) = false
  AND archived_at IS NULL
);

CREATE POLICY trips_update
ON public.trips
FOR UPDATE
TO authenticated
USING (private.can_edit_trip_details(id))
WITH CHECK (private.can_edit_trip_details(id));

CREATE POLICY trips_delete
ON public.trips
FOR DELETE
TO authenticated
USING (private.is_trip_owner(id));

REVOKE ALL ON public.trips FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;

ALTER TABLE public.trip_members
ADD CONSTRAINT trip_members_personal_budget_nonnegative
CHECK (personal_budget IS NULL OR personal_budget >= 0);

DROP POLICY IF EXISTS trip_members_select ON public.trip_members;
DROP POLICY IF EXISTS trip_members_insert ON public.trip_members;
DROP POLICY IF EXISTS trip_members_update ON public.trip_members;
DROP POLICY IF EXISTS trip_members_update_personal_budget ON public.trip_members;
DROP POLICY IF EXISTS trip_members_delete ON public.trip_members;

CREATE POLICY trip_members_select
ON public.trip_members
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_view_trip(trip_id)
);

CREATE POLICY trip_members_insert
ON public.trip_members
FOR INSERT
TO authenticated
WITH CHECK (private.is_trip_owner(trip_id));

CREATE POLICY trip_members_update_personal_budget
ON public.trip_members
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND status = 'active'
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status = 'active'
);

CREATE POLICY trip_members_delete
ON public.trip_members
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_trip_owner(trip_id)
);

REVOKE ALL ON public.trip_members FROM anon;
REVOKE UPDATE ON public.trip_members FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.trip_members TO authenticated;
GRANT UPDATE (personal_budget) ON public.trip_members TO authenticated;

DROP POLICY IF EXISTS "Trip members can add checklist items" ON public.trip_checklist;
DROP POLICY IF EXISTS "Trip members can delete checklist items" ON public.trip_checklist;
DROP POLICY IF EXISTS "Trip members can update checklist items" ON public.trip_checklist;
DROP POLICY IF EXISTS "Trip members can view checklist" ON public.trip_checklist;

CREATE POLICY "Active trip members can view checklist"
ON public.trip_checklist
FOR SELECT
TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY "Trip plan editors can add checklist items"
ON public.trip_checklist
FOR INSERT
TO authenticated
WITH CHECK (private.can_edit_trip_plan(trip_id));

CREATE POLICY "Trip plan editors can update checklist items"
ON public.trip_checklist
FOR UPDATE
TO authenticated
USING (private.can_edit_trip_plan(trip_id))
WITH CHECK (private.can_edit_trip_plan(trip_id));

CREATE POLICY "Trip plan editors can delete checklist items"
ON public.trip_checklist
FOR DELETE
TO authenticated
USING (private.can_edit_trip_plan(trip_id));

REVOKE ALL ON public.trip_checklist FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_checklist TO authenticated;
