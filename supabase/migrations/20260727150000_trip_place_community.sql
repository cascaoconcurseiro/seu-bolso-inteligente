-- Comunidade privada de lugares por viagem: avaliações, favoritos, visitas e fotos.

CREATE TABLE IF NOT EXISTS public.trip_place_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  visited_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_place_reviews_place_fk
    FOREIGN KEY (place_id, trip_id)
    REFERENCES public.trip_places(id, trip_id)
    ON DELETE CASCADE,
  CONSTRAINT trip_place_reviews_one_per_user UNIQUE (trip_id, place_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.trip_place_favorites (
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, place_id, user_id),
  CONSTRAINT trip_place_favorites_place_fk
    FOREIGN KEY (place_id, trip_id)
    REFERENCES public.trip_places(id, trip_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.trip_place_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_place_visits_place_fk
    FOREIGN KEY (place_id, trip_id)
    REFERENCES public.trip_places(id, trip_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.trip_place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_place_photos_place_fk
    FOREIGN KEY (place_id, trip_id)
    REFERENCES public.trip_places(id, trip_id)
    ON DELETE CASCADE,
  CONSTRAINT trip_place_photos_unique_path UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS trip_place_reviews_lookup_idx
  ON public.trip_place_reviews (trip_id, place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trip_place_visits_lookup_idx
  ON public.trip_place_visits (trip_id, place_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS trip_place_photos_lookup_idx
  ON public.trip_place_photos (trip_id, place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trip_place_favorites_user_idx
  ON public.trip_place_favorites (user_id, trip_id);

DROP TRIGGER IF EXISTS update_trip_place_reviews_updated_at ON public.trip_place_reviews;
CREATE TRIGGER update_trip_place_reviews_updated_at
BEFORE UPDATE ON public.trip_place_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_place_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_place_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_place_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_place_photos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_trip_place_community(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = p_trip_id
      AND t.deleted_at IS NULL
      AND (
        t.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.trip_members m
          WHERE m.trip_id = t.id
            AND m.user_id = (SELECT auth.uid())
            AND m.status = 'active'
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_trip_place_community(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_trip_place_community(uuid) TO authenticated;

CREATE POLICY "Trip members can view place reviews"
ON public.trip_place_reviews FOR SELECT TO authenticated
USING (public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can create own place reviews"
ON public.trip_place_reviews FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can update own place reviews"
ON public.trip_place_reviews FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can delete own place reviews"
ON public.trip_place_reviews FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view own favorites"
ON public.trip_place_favorites FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can create own favorites"
ON public.trip_place_favorites FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can delete own favorites"
ON public.trip_place_favorites FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Trip members can view visits"
ON public.trip_place_visits FOR SELECT TO authenticated
USING (public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can create own visits"
ON public.trip_place_visits FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can update own visits"
ON public.trip_place_visits FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own visits"
ON public.trip_place_visits FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Trip members can view place photos"
ON public.trip_place_photos FOR SELECT TO authenticated
USING (public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can create own place photos"
ON public.trip_place_photos FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_view_trip_place_community(trip_id));
CREATE POLICY "Users can update own place photos"
ON public.trip_place_photos FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own place photos"
ON public.trip_place_photos FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-place-photos',
  'trip-place-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Trip members can read place photo objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-place-photos'
  AND public.can_view_trip_place_community((storage.foldername(name))[2]::uuid)
);
CREATE POLICY "Users can upload own place photo objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trip-place-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.can_view_trip_place_community((storage.foldername(name))[2]::uuid)
);
CREATE POLICY "Users can update own place photo objects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'trip-place-photos'
  AND owner_id = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'trip-place-photos'
  AND owner_id = (SELECT auth.uid()::text)
);
CREATE POLICY "Users can delete own place photo objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'trip-place-photos'
  AND owner_id = (SELECT auth.uid()::text)
);
