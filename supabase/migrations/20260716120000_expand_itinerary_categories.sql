-- Amplia as categorias de item do roteiro de 6 para 11 valores, alinhando com as
-- categorias detectadas automaticamente na busca de lugares (padrão dos apps de
-- roteiro: café, museu, parque, compras e bar/vida noturna são tipos de parada
-- de primeira classe, não "outros").
ALTER TABLE public.trip_itinerary DROP CONSTRAINT IF EXISTS trip_itinerary_category_check;

ALTER TABLE public.trip_itinerary
  ADD CONSTRAINT trip_itinerary_category_check
  CHECK (category IS NULL OR category IN (
    'attraction','museum','restaurant','cafe','nightlife',
    'hotel','beach','park','shopping','transport','other'
  ));
