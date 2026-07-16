-- Coordenada base cacheada da viagem (evita re-geocodificar trips.destination toda vez)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE public.trips
  ADD CONSTRAINT trips_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Categoria do item do roteiro (ícone/cor do pin + filtro de busca)
ALTER TABLE public.trip_itinerary ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.trip_itinerary
  ADD CONSTRAINT trip_itinerary_category_check
  CHECK (category IS NULL OR category IN ('attraction','restaurant','hotel','beach','transport','other'));
