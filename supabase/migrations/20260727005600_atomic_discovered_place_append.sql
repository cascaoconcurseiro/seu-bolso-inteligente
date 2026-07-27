-- Atomically saves a discovered OSM place and appends it to one itinerary day.
-- Serializes additions through the trip row so collaborators cannot receive the
-- same order_index. Also advances itinerary_order_version to invalidate stale
-- reorder operations.

CREATE OR REPLACE FUNCTION public.add_discovered_place_to_itinerary_v1(
  p_trip_id uuid,
  p_date date,
  p_name text,
  p_address text DEFAULT NULL,
  p_maps_url text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_trip_start date;
  v_trip_end date;
  v_place_id uuid;
  v_itinerary_id uuid;
  v_order_index integer;
  v_new_version bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_trip_id IS NULL OR p_date IS NULL OR NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Trip, date and place name are required'
      USING ERRCODE = '22004';
  END IF;

  SELECT trip.start_date, trip.end_date
  INTO v_trip_start, v_trip_end
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

  IF p_date < v_trip_start OR p_date > v_trip_end THEN
    RAISE EXCEPTION 'Itinerary date is outside the trip period'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.trip_places (
    trip_id,
    created_by,
    name,
    description,
    address,
    maps_url,
    latitude,
    longitude,
    category,
    source_type,
    source_url,
    source_attribution,
    status
  )
  VALUES (
    p_trip_id,
    v_user_id,
    btrim(p_name),
    NULL,
    NULLIF(btrim(COALESCE(p_address, '')), ''),
    NULLIF(btrim(COALESCE(p_maps_url, '')), ''),
    p_latitude,
    p_longitude,
    NULLIF(btrim(COALESCE(p_category, '')), ''),
    'osm',
    NULLIF(btrim(COALESCE(p_maps_url, '')), ''),
    '© OpenStreetMap contributors',
    'want'
  )
  RETURNING id INTO v_place_id;

  SELECT COALESCE(MAX(itinerary.order_index), -1) + 1
  INTO v_order_index
  FROM public.trip_itinerary AS itinerary
  WHERE itinerary.trip_id = p_trip_id
    AND itinerary.date = p_date;

  INSERT INTO public.trip_itinerary (
    trip_id,
    date,
    title,
    description,
    location,
    start_time,
    end_time,
    order_index,
    maps_url,
    latitude,
    longitude,
    category,
    place_id,
    reservation_id,
    duration_minutes,
    transport_mode
  )
  VALUES (
    p_trip_id,
    p_date,
    btrim(p_name),
    NULL,
    NULLIF(btrim(COALESCE(p_address, '')), ''),
    NULL,
    NULL,
    v_order_index,
    NULLIF(btrim(COALESCE(p_maps_url, '')), ''),
    p_latitude,
    p_longitude,
    NULLIF(btrim(COALESCE(p_category, '')), ''),
    v_place_id,
    NULL,
    NULL,
    NULL
  )
  RETURNING id INTO v_itinerary_id;

  PERFORM set_config('app.trip_itinerary_reorder', p_trip_id::text, true);

  UPDATE public.trips
  SET itinerary_order_version = itinerary_order_version + 1
  WHERE id = p_trip_id
  RETURNING itinerary_order_version INTO v_new_version;

  RETURN jsonb_build_object(
    'place_id', v_place_id,
    'itinerary_id', v_itinerary_id,
    'order_index', v_order_index,
    'itinerary_order_version', v_new_version
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.add_discovered_place_to_itinerary_v1(
  uuid,
  date,
  text,
  text,
  text,
  double precision,
  double precision,
  text
) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.add_discovered_place_to_itinerary_v1(
  uuid,
  date,
  text,
  text,
  text,
  double precision,
  double precision,
  text
) TO authenticated;
