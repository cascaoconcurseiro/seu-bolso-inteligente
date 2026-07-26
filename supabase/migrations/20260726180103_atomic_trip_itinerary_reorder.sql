-- Atomic, conflict-aware itinerary ordering. This migration intentionally does
-- not touch financial tables or introduce the future place library.

ALTER TABLE public.trips
  ADD COLUMN itinerary_order_version bigint NOT NULL DEFAULT 0;

ALTER TABLE public.trip_itinerary
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_trip_itinerary_updated_at
  ON public.trip_itinerary;

CREATE TRIGGER update_trip_itinerary_updated_at
BEFORE UPDATE ON public.trip_itinerary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

WITH normalized AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY trip_id, date
      ORDER BY order_index, start_time NULLS LAST, created_at, id
    ) - 1 AS normalized_order
  FROM public.trip_itinerary
)
UPDATE public.trip_itinerary AS itinerary
SET order_index = normalized.normalized_order
FROM normalized
WHERE normalized.id = itinerary.id
  AND itinerary.order_index IS DISTINCT FROM normalized.normalized_order;

ALTER TABLE public.trip_itinerary
  ADD CONSTRAINT trip_itinerary_order_nonnegative
  CHECK (order_index >= 0);

ALTER TABLE public.trip_itinerary
  ADD CONSTRAINT trip_itinerary_unique_day_position
  UNIQUE (trip_id, date, order_index)
  DEFERRABLE INITIALLY DEFERRED;

DROP INDEX IF EXISTS public.idx_trip_itinerary_trip_id;

CREATE OR REPLACE FUNCTION public.guard_trip_itinerary_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF OLD.trip_id IS DISTINCT FROM NEW.trip_id THEN
    RAISE EXCEPTION 'An itinerary item cannot be moved to another trip'
      USING ERRCODE = '42501';
  END IF;

  IF current_setting('app.trip_itinerary_reorder', true)
    IS DISTINCT FROM NEW.trip_id::text
  THEN
    RAISE EXCEPTION 'Itinerary date and position must be changed through reorder_trip_itinerary_v1'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_trip_itinerary_order_update()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_trip_itinerary_order_update
BEFORE UPDATE OF trip_id, date, order_index ON public.trip_itinerary
FOR EACH ROW
WHEN (
  OLD.trip_id IS DISTINCT FROM NEW.trip_id
  OR OLD.date IS DISTINCT FROM NEW.date
  OR OLD.order_index IS DISTINCT FROM NEW.order_index
)
EXECUTE FUNCTION public.guard_trip_itinerary_order_update();

CREATE OR REPLACE FUNCTION public.guard_trip_itinerary_order_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF current_setting('app.trip_itinerary_reorder', true)
    IS DISTINCT FROM NEW.id::text
  THEN
    RAISE EXCEPTION 'Itinerary order version is managed by reorder_trip_itinerary_v1'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_trip_itinerary_order_version()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_trip_itinerary_order_version
BEFORE UPDATE OF itinerary_order_version ON public.trips
FOR EACH ROW
WHEN (
  OLD.itinerary_order_version IS DISTINCT FROM NEW.itinerary_order_version
)
EXECUTE FUNCTION public.guard_trip_itinerary_order_version();

CREATE OR REPLACE FUNCTION public.reorder_trip_itinerary_v1(
  p_trip_id uuid,
  p_expected_version bigint,
  p_items jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_current_version bigint;
  v_new_version bigint;
  v_locked_item_count bigint;
  v_updated_count bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_trip_id IS NULL OR p_expected_version IS NULL OR p_items IS NULL THEN
    RAISE EXCEPTION 'Trip, expected version and complete itinerary are required'
      USING ERRCODE = '22004';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Itinerary payload must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  SELECT trip.itinerary_order_version
  INTO v_current_version
  FROM public.trips AS trip
  WHERE trip.id = p_trip_id
    AND trip.deleted_at IS NULL
    AND (
      trip.owner_id = v_user_id
      OR EXISTS (
        SELECT 1
        FROM public.trip_members AS member
        WHERE member.trip_id = trip.id
          AND member.user_id = v_user_id
          AND member.status = 'active'
          AND member.role <> 'viewer'
      )
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or permission denied'
      USING ERRCODE = '42501';
  END IF;

  IF v_current_version <> p_expected_version THEN
    RAISE EXCEPTION 'Itinerary changed since it was loaded'
      USING ERRCODE = '40001';
  END IF;

  SELECT count(*)
  INTO v_locked_item_count
  FROM (
    SELECT itinerary.id
    FROM public.trip_itinerary AS itinerary
    WHERE itinerary.trip_id = p_trip_id
    ORDER BY itinerary.id
    FOR UPDATE
  ) AS locked_items;

  IF jsonb_array_length(p_items) <> v_locked_item_count THEN
    RAISE EXCEPTION 'Itinerary payload must contain exactly the trip items'
      USING ERRCODE = '40001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS payload(
      id text,
      date date,
      order_index integer
    )
    WHERE payload.id IS NULL
      OR payload.date IS NULL
      OR payload.order_index IS NULL
      OR payload.order_index < 0
  ) THEN
    RAISE EXCEPTION 'Every itinerary item needs an id, date and non-negative position'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(*)
    FROM jsonb_to_recordset(p_items) AS payload(
      id text,
      date date,
      order_index integer
    )
  ) <> (
    SELECT count(DISTINCT payload.id)
    FROM jsonb_to_recordset(p_items) AS payload(
      id text,
      date date,
      order_index integer
    )
  ) THEN
    RAISE EXCEPTION 'Itinerary payload contains duplicate ids'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        payload.date,
        min(payload.order_index) AS first_position,
        max(payload.order_index) AS last_position,
        count(*) AS item_count,
        count(DISTINCT payload.order_index) AS distinct_positions
      FROM jsonb_to_recordset(p_items) AS payload(
        id text,
        date date,
        order_index integer
      )
      GROUP BY payload.date
    ) AS day_order
    WHERE day_order.first_position <> 0
      OR day_order.last_position <> day_order.item_count - 1
      OR day_order.distinct_positions <> day_order.item_count
  ) THEN
    RAISE EXCEPTION 'Positions must be unique and contiguous within each day'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    (
      SELECT itinerary.id
      FROM public.trip_itinerary AS itinerary
      WHERE itinerary.trip_id = p_trip_id
      EXCEPT
      SELECT payload.id::uuid
      FROM jsonb_to_recordset(p_items) AS payload(
        id text,
        date date,
        order_index integer
      )
    )
    UNION ALL
    (
      SELECT payload.id::uuid
      FROM jsonb_to_recordset(p_items) AS payload(
        id text,
        date date,
        order_index integer
      )
      EXCEPT
      SELECT itinerary.id
      FROM public.trip_itinerary AS itinerary
      WHERE itinerary.trip_id = p_trip_id
    )
  ) THEN
    RAISE EXCEPTION 'Itinerary payload must contain exactly the trip items'
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.trip_itinerary_reorder', p_trip_id::text, true);

  UPDATE public.trip_itinerary AS itinerary
  SET
    date = payload.date,
    order_index = payload.order_index
  FROM (
    SELECT
      parsed.id::uuid AS id,
      parsed.date,
      parsed.order_index
    FROM jsonb_to_recordset(p_items) AS parsed(
      id text,
      date date,
      order_index integer
    )
  ) AS payload
  WHERE itinerary.id = payload.id
    AND itinerary.trip_id = p_trip_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> v_locked_item_count THEN
    RAISE EXCEPTION 'Itinerary changed while the new order was being saved'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.trips
  SET itinerary_order_version = itinerary_order_version + 1
  WHERE id = p_trip_id
  RETURNING itinerary_order_version INTO v_new_version;

  RETURN v_new_version;
END;
$function$;

REVOKE ALL ON FUNCTION public.reorder_trip_itinerary_v1(uuid, bigint, jsonb)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_trip_itinerary_v1(uuid, bigint, jsonb)
  TO authenticated;

DROP POLICY IF EXISTS "Trip members can add itinerary items"
  ON public.trip_itinerary;
DROP POLICY IF EXISTS "Trip members can delete itinerary items"
  ON public.trip_itinerary;
DROP POLICY IF EXISTS "Trip members can update itinerary items"
  ON public.trip_itinerary;
DROP POLICY IF EXISTS "Trip members can view itinerary"
  ON public.trip_itinerary;

CREATE POLICY "Active trip members can view itinerary"
ON public.trip_itinerary
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = trip_itinerary.trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
        )
      )
  )
);

CREATE POLICY "Editors can add itinerary items"
ON public.trip_itinerary
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = trip_itinerary.trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.role <> 'viewer'
        )
      )
  )
);

CREATE POLICY "Editors can update itinerary items"
ON public.trip_itinerary
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = trip_itinerary.trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.role <> 'viewer'
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = trip_itinerary.trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.role <> 'viewer'
        )
      )
  )
);

CREATE POLICY "Editors can delete itinerary items"
ON public.trip_itinerary
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = trip_itinerary.trip_id
      AND trip.deleted_at IS NULL
      AND (
        trip.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = (SELECT auth.uid())
            AND member.status = 'active'
            AND member.role <> 'viewer'
        )
      )
  )
);

REVOKE ALL ON public.trip_itinerary FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON public.trip_itinerary
  FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.trip_itinerary
  TO authenticated;
