import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const ALLOWED_ORIGINS = [
  "https://pedemeia.vercel.app",
  "https://meupedemeia.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function corsHeaders(origin: string | null) {
  const isAllowed =
    origin && (ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) || origin.endsWith(".vercel.app"));
  const allowed = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";
const PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";

interface PlaceSuggestion {
  title: string;
  location: string;
  description: string;
  durationHours: number;
  rating: number | null;
  totalRatings: number | null;
  placeId: string;
  mapsUrl: string;
  photoUrl: string | null;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    // [SEC] JWT authentication required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { destination } = await req.json();

    if (!destination || typeof destination !== "string" || destination.length > 200) {
      return new Response(
        JSON.stringify({ error: "destination é obrigatório (max 200 caracteres)" }),
        {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY não configurada", suggestions: [] }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Buscar atrações turísticas
    const attractionsUrl = new URL(PLACES_BASE_URL);
    attractionsUrl.searchParams.set("query", `melhores atrações turísticas em ${destination}`);
    attractionsUrl.searchParams.set("language", "pt-BR");
    attractionsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    // Buscar restaurantes recomendados
    const restaurantsUrl = new URL(PLACES_BASE_URL);
    restaurantsUrl.searchParams.set("query", `melhores restaurantes em ${destination}`);
    restaurantsUrl.searchParams.set("language", "pt-BR");
    restaurantsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    const [attractionsRes, restaurantsRes] = await Promise.all([
      fetch(attractionsUrl.toString()),
      fetch(restaurantsUrl.toString()),
    ]);

    const attractionsData = await attractionsRes.json();
    const restaurantsData = await restaurantsRes.json();

    const allPlaces: PlaceSuggestion[] = [];

    const processResults = (results: any[], defaultDuration: number, typeLabel: string) => {
      for (const place of results) {
        const photoUrl = place.photos?.[0]
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
          : null;

        const mapsUrl = place.place_id
          ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`
          : `https://www.google.com/maps/search/${encodeURIComponent(place.name + " " + (place.formatted_address || ""))}`;

        allPlaces.push({
          title: place.name,
          location: place.formatted_address || destination,
          description: `${typeLabel} com nota ${place.rating ?? "N/A"} (${place.user_ratings_total ?? 0} avaliações)`,
          durationHours: defaultDuration,
          rating: place.rating ?? null,
          totalRatings: place.user_ratings_total ?? null,
          placeId: place.place_id,
          mapsUrl,
          photoUrl,
        });
      }
    };

    processResults(attractionsData.results?.slice(0, 6) || [], 2, "Atração turística");
    processResults(restaurantsData.results?.slice(0, 4) || [], 1.5, "Restaurante");

    // Remover duplicatas por place_id
    const seen = new Set<string>();
    const unique = allPlaces.filter((p) => {
      if (seen.has(p.placeId)) return false;
      seen.add(p.placeId);
      return true;
    });

    return new Response(JSON.stringify({ suggestions: unique.slice(0, 10) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro get-place-suggestions:", error);
    return new Response(JSON.stringify({ error: "Erro interno", suggestions: [] }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
