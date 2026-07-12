ALTER TABLE public.trip_itinerary
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.trip_itinerary
  ADD CONSTRAINT trip_itinerary_latitude_range
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT trip_itinerary_longitude_range
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

COMMENT ON COLUMN public.trip_itinerary.maps_url IS 'Optional deep link supplied by the user for the itinerary stop.';
COMMENT ON COLUMN public.trip_itinerary.latitude IS 'WGS84 latitude used to render the in-app route map.';
COMMENT ON COLUMN public.trip_itinerary.longitude IS 'WGS84 longitude used to render the in-app route map.';
