CREATE TABLE public.trip_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  address text,
  notes text,
  latitude double precision,
  longitude double precision,
  category text,
  website_url text,
  phone text,
  maps_url text,
  source_type text NOT NULL DEFAULT 'manual',
  source_id text,
  source_url text,
  source_attribution text,
  status text NOT NULL DEFAULT 'idea',
  visited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_places_id_trip_unique UNIQUE (id, trip_id),
  CONSTRAINT trip_places_name_nonempty CHECK (btrim(name) <> ''),
  CONSTRAINT trip_places_name_length CHECK (char_length(name) <= 200),
  CONSTRAINT trip_places_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT trip_places_address_length
    CHECK (address IS NULL OR char_length(address) <= 500),
  CONSTRAINT trip_places_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CONSTRAINT trip_places_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT trip_places_longitude_range
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT trip_places_coordinates_pair
    CHECK (num_nonnulls(latitude, longitude) IN (0, 2)),
  CONSTRAINT trip_places_category_check CHECK (
    category IS NULL OR category IN (
      'attraction', 'museum', 'restaurant', 'cafe', 'nightlife',
      'hotel', 'beach', 'park', 'shopping', 'transport', 'other'
    )
  ),
  CONSTRAINT trip_places_source_type_check
    CHECK (source_type IN ('manual', 'osm', 'google_link', 'import')),
  CONSTRAINT trip_places_source_id_length
    CHECK (source_id IS NULL OR char_length(source_id) <= 500),
  CONSTRAINT trip_places_status_check CHECK (status IN ('idea', 'want', 'visited')),
  CONSTRAINT trip_places_visited_consistency CHECK (
    status <> 'visited' OR visited_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX trip_places_source_unique
ON public.trip_places (trip_id, source_type, source_id)
WHERE source_id IS NOT NULL;

CREATE INDEX trip_places_trip_status_idx
ON public.trip_places (trip_id, status, created_at DESC);

CREATE INDEX trip_places_trip_category_idx
ON public.trip_places (trip_id, category)
WHERE category IS NOT NULL;

CREATE TRIGGER set_trip_places_updated_at
BEFORE UPDATE ON public.trip_places
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view saved places"
ON public.trip_places FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY "Trip editors can add saved places"
ON public.trip_places FOR INSERT TO authenticated
WITH CHECK (
  private.can_edit_trip_plan(trip_id)
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "Trip editors can update saved places"
ON public.trip_places FOR UPDATE TO authenticated
USING (private.can_edit_trip_plan(trip_id))
WITH CHECK (private.can_edit_trip_plan(trip_id));

CREATE POLICY "Trip editors can delete saved places"
ON public.trip_places FOR DELETE TO authenticated
USING (private.can_edit_trip_plan(trip_id));

REVOKE ALL ON public.trip_places FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_places TO authenticated;

CREATE TABLE public.trip_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  place_id uuid,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  title text NOT NULL,
  confirmation_number text,
  provider_url text,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  start_timezone text,
  end_timezone text,
  all_day boolean NOT NULL DEFAULT false,
  external_source text,
  external_id text,
  external_synced_at timestamptz,
  sync_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  needs_review boolean NOT NULL DEFAULT false,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_reservations_place_fk
    FOREIGN KEY (place_id, trip_id)
    REFERENCES public.trip_places(id, trip_id)
    ON DELETE SET NULL (place_id),
  CONSTRAINT trip_reservations_id_trip_unique UNIQUE (id, trip_id),
  CONSTRAINT trip_reservations_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT trip_reservations_title_length CHECK (char_length(title) <= 200),
  CONSTRAINT trip_reservations_notes_length CHECK (notes IS NULL OR char_length(notes) <= 4000),
  CONSTRAINT trip_reservations_confirmation_length
    CHECK (confirmation_number IS NULL OR char_length(confirmation_number) <= 500),
  CONSTRAINT trip_reservations_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT trip_reservations_date_order
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT trip_reservations_type_check CHECK (
    type IN (
      'flight', 'train', 'bus', 'boat', 'lodging', 'restaurant',
      'rental_car', 'event', 'activity', 'other'
    )
  ),
  CONSTRAINT trip_reservations_status_check
    CHECK (status IN ('planned', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT trip_reservations_idempotency_key_nonempty
    CHECK (idempotency_key IS NULL OR btrim(idempotency_key) <> ''),
  CONSTRAINT trip_reservations_external_identity_pair
    CHECK (num_nonnulls(external_source, external_id) IN (0, 2))
);

CREATE INDEX trip_reservations_trip_start_idx
ON public.trip_reservations (trip_id, starts_at, id);

CREATE INDEX trip_reservations_trip_type_idx
ON public.trip_reservations (trip_id, type, starts_at);

CREATE UNIQUE INDEX trip_reservations_external_unique
ON public.trip_reservations (trip_id, external_source, external_id)
WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE UNIQUE INDEX trip_reservations_idempotency_unique
ON public.trip_reservations (trip_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER set_trip_reservations_updated_at
BEFORE UPDATE ON public.trip_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view reservations"
ON public.trip_reservations FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY "Trip editors can add reservations"
ON public.trip_reservations FOR INSERT TO authenticated
WITH CHECK (
  private.can_edit_trip_plan(trip_id)
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "Trip editors can update reservations"
ON public.trip_reservations FOR UPDATE TO authenticated
USING (private.can_edit_trip_plan(trip_id))
WITH CHECK (private.can_edit_trip_plan(trip_id));

CREATE POLICY "Trip editors can delete reservations"
ON public.trip_reservations FOR DELETE TO authenticated
USING (private.can_edit_trip_plan(trip_id));

REVOKE ALL ON public.trip_reservations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_reservations TO authenticated;

CREATE TABLE public.trip_reservation_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  role text NOT NULL,
  sequence integer NOT NULL,
  name text NOT NULL,
  code text,
  latitude double precision,
  longitude double precision,
  timezone text,
  local_date date,
  local_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_reservation_endpoints_reservation_fk
    FOREIGN KEY (reservation_id, trip_id)
    REFERENCES public.trip_reservations(id, trip_id)
    ON DELETE CASCADE,
  CONSTRAINT trip_reservation_endpoints_sequence_unique
    UNIQUE (reservation_id, sequence),
  CONSTRAINT trip_reservation_endpoints_role_check CHECK (role IN ('from', 'to', 'stop')),
  CONSTRAINT trip_reservation_endpoints_sequence_check CHECK (sequence >= 0),
  CONSTRAINT trip_reservation_endpoints_latitude_range
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT trip_reservation_endpoints_longitude_range
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT trip_reservation_endpoints_coordinates_pair
    CHECK (num_nonnulls(latitude, longitude) IN (0, 2))
);

ALTER TABLE public.trip_reservation_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view reservation endpoints"
ON public.trip_reservation_endpoints FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY "Trip editors can manage reservation endpoints"
ON public.trip_reservation_endpoints FOR ALL TO authenticated
USING (private.can_edit_trip_plan(trip_id))
WITH CHECK (private.can_edit_trip_plan(trip_id));

REVOKE ALL ON public.trip_reservation_endpoints FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_reservation_endpoints TO authenticated;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_id_trip_unique UNIQUE (id, trip_id);

CREATE TABLE public.trip_reservation_transactions (
  reservation_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  linked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reservation_id, transaction_id),
  CONSTRAINT trip_reservation_transactions_reservation_fk
    FOREIGN KEY (reservation_id, trip_id)
    REFERENCES public.trip_reservations(id, trip_id)
    ON DELETE CASCADE,
  CONSTRAINT trip_reservation_transactions_transaction_fk
    FOREIGN KEY (transaction_id, trip_id)
    REFERENCES public.transactions(id, trip_id)
    ON DELETE CASCADE
);

CREATE INDEX trip_reservation_transactions_transaction_idx
ON public.trip_reservation_transactions (transaction_id);

ALTER TABLE public.trip_reservation_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visible reservation transaction links can be viewed"
ON public.trip_reservation_transactions FOR SELECT TO authenticated
USING (
  private.can_view_trip(trip_id)
  AND EXISTS (
    SELECT 1
    FROM public.transactions tx
    WHERE tx.id = trip_reservation_transactions.transaction_id
      AND tx.trip_id = trip_reservation_transactions.trip_id
      AND tx.deleted_at IS NULL
  )
);

CREATE POLICY "Trip expense managers can add visible reservation transaction links"
ON public.trip_reservation_transactions FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_trip_expenses(trip_id)
  AND linked_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.transactions tx
    WHERE tx.id = trip_reservation_transactions.transaction_id
      AND tx.trip_id = trip_reservation_transactions.trip_id
      AND tx.deleted_at IS NULL
  )
);

CREATE POLICY "Trip expense managers can delete visible reservation transaction links"
ON public.trip_reservation_transactions FOR DELETE TO authenticated
USING (
  private.can_manage_trip_expenses(trip_id)
  AND EXISTS (
    SELECT 1
    FROM public.transactions tx
    WHERE tx.id = trip_reservation_transactions.transaction_id
      AND tx.trip_id = trip_reservation_transactions.trip_id
  )
);

REVOKE ALL ON public.trip_reservation_transactions FROM anon;
GRANT SELECT, INSERT, DELETE ON public.trip_reservation_transactions TO authenticated;

ALTER TABLE public.trip_itinerary
  ADD COLUMN place_id uuid,
  ADD COLUMN reservation_id uuid,
  ADD COLUMN duration_minutes integer,
  ADD COLUMN transport_mode text,
  ADD CONSTRAINT trip_itinerary_duration_minutes_check
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 0 AND 10080),
  ADD CONSTRAINT trip_itinerary_transport_mode_check
    CHECK (
      transport_mode IS NULL OR transport_mode IN (
        'walk', 'bike', 'car', 'transit', 'train', 'flight', 'boat', 'other'
      )
    ),
  ADD CONSTRAINT trip_itinerary_single_source_check
    CHECK (num_nonnulls(place_id, reservation_id) <= 1),
  ADD CONSTRAINT trip_itinerary_place_fk
    FOREIGN KEY (place_id, trip_id)
    REFERENCES public.trip_places(id, trip_id)
    ON DELETE SET NULL (place_id),
  ADD CONSTRAINT trip_itinerary_reservation_fk
    FOREIGN KEY (reservation_id, trip_id)
    REFERENCES public.trip_reservations(id, trip_id)
    ON DELETE CASCADE;

CREATE INDEX trip_itinerary_place_idx
ON public.trip_itinerary (place_id)
WHERE place_id IS NOT NULL;

CREATE INDEX trip_itinerary_reservation_idx
ON public.trip_itinerary (reservation_id)
WHERE reservation_id IS NOT NULL;

INSERT INTO public.trip_places (
  id,
  trip_id,
  created_by,
  name,
  description,
  address,
  latitude,
  longitude,
  category,
  maps_url,
  source_type,
  status,
  created_at,
  updated_at
)
SELECT
  item.id,
  item.trip_id,
  trip.owner_id,
  item.title,
  item.description,
  item.location,
  item.latitude,
  item.longitude,
  item.category,
  item.maps_url,
  'manual',
  'want',
  item.created_at,
  item.updated_at
FROM public.trip_itinerary item
JOIN public.trips trip ON trip.id = item.trip_id
ON CONFLICT (id) DO NOTHING;

UPDATE public.trip_itinerary
SET place_id = id
WHERE place_id IS NULL
  AND reservation_id IS NULL;

CREATE OR REPLACE FUNCTION public.guard_trip_owned_record_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.trip_id IS DISTINCT FROM NEW.trip_id THEN
    RAISE EXCEPTION 'A trip child record cannot be moved to another trip'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'The record creator cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_trip_owned_record_identity()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_trip_places_identity
BEFORE UPDATE OF trip_id, created_by ON public.trip_places
FOR EACH ROW
EXECUTE FUNCTION public.guard_trip_owned_record_identity();

CREATE TRIGGER guard_trip_reservations_identity
BEFORE UPDATE OF trip_id, created_by ON public.trip_reservations
FOR EACH ROW
EXECUTE FUNCTION public.guard_trip_owned_record_identity();

CREATE OR REPLACE FUNCTION public.guard_trip_reservation_endpoint_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.trip_id IS DISTINCT FROM NEW.trip_id
    OR OLD.reservation_id IS DISTINCT FROM NEW.reservation_id
  THEN
    RAISE EXCEPTION 'A reservation endpoint cannot be moved to another reservation'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_trip_reservation_endpoint_identity()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_trip_reservation_endpoint_identity
BEFORE UPDATE OF trip_id, reservation_id ON public.trip_reservation_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.guard_trip_reservation_endpoint_identity();
