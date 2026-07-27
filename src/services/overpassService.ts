/**
 * Overpass API + Nominatim service
 * Fetches real POIs (points of interest) for a destination using OpenStreetMap data.
 * Completely free, no API key required.
 */

export interface POI {
  title: string;
  location: string;
  description: string;
  durationHours: number;
  lat: number;
  lon: number;
  mapsUrl: string;
  osmType?: string;
  tags?: Record<string, string>;
}

// OSM tourism/amenity tags mapped to readable categories and suggested duration
const POI_TYPES: Array<{
  query: string;
  category: string;
  durationHours: number;
}> = [
  { query: "tourism=museum", category: "Museu", durationHours: 2 },
  { query: "tourism=attraction", category: "Atração", durationHours: 1.5 },
  { query: "tourism=viewpoint", category: "Mirante", durationHours: 1 },
  { query: "tourism=gallery", category: "Galeria", durationHours: 1.5 },
  { query: "historic=castle", category: "Castelo", durationHours: 2 },
  { query: "historic=monument", category: "Monumento", durationHours: 1 },
  { query: "historic=ruins", category: "Ruínas", durationHours: 1.5 },
  { query: "amenity=restaurant", category: "Restaurante", durationHours: 1.5 },
  { query: "amenity=cafe", category: "Café", durationHours: 1 },
  { query: "leisure=park", category: "Parque", durationHours: 1.5 },
  { query: "natural=beach", category: "Praia", durationHours: 2.5 },
  { query: "amenity=marketplace", category: "Mercado", durationHours: 1.5 },
  { query: "shop=mall", category: "Shopping", durationHours: 2 },
];

// Best name field from OSM tags, in order of preference
function getBestName(tags: Record<string, string>): string | null {
  return tags["name:pt"] || tags["name"] || tags["official_name"] || tags["alt_name"] || null;
}

// Build human-readable location string from OSM tags
function buildLocation(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags["addr:street"]) {
    parts.push(
      tags["addr:street"] + (tags["addr:housenumber"] ? `, ${tags["addr:housenumber"]}` : "")
    );
  }
  if (tags["addr:suburb"] || tags["addr:neighbourhood"]) {
    parts.push(tags["addr:suburb"] || tags["addr:neighbourhood"]);
  }
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (parts.length === 0 && tags["district"]) parts.push(tags["district"]);
  return parts.join(" — ") || "";
}

// Build description from available OSM tags
function buildDescription(tags: Record<string, string>, category: string): string {
  const parts: string[] = [];

  if (tags["description"] || tags["description:pt"]) {
    parts.push(tags["description:pt"] || tags["description"]);
  }
  if (tags["opening_hours"]) {
    parts.push(`Horário: ${tags["opening_hours"]}`);
  }
  if (tags["fee"] === "yes" && tags["charge"]) {
    parts.push(`Entrada: ${tags["charge"]}`);
  } else if (tags["fee"] === "no") {
    parts.push("Entrada gratuita");
  }
  if (tags["cuisine"]) {
    parts.push(`Culinária: ${tags["cuisine"].replace(/_/g, " ")}`);
  }
  if (tags["website"] || tags["url"]) {
    parts.push(`Site: ${tags["website"] || tags["url"]}`);
  }

  return parts.length > 0 ? parts.join(" | ") : category;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  display_name?: string;
  name?: string;
  namedetails?: { name?: string };
}

/**
 * Get lat/lon for a destination string using Nominatim (OpenStreetMap geocoder).
 */
export async function geocodeDestination(
  destination: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    // Solicitar múltiplos resultados com detalhes de endereço para filtrar cidades/países sobre lojas comerciais
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      destination
    )}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9", "User-Agent": "SeuBolsoInteligente/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data: NominatimSearchResult[] = await res.json();
    if (!data || !data.length) return null;

    // Priorizar entidades geográficas reais (cidade, município, país, distrito) sobre lojas de departamento/marcas comerciais (ex: lojas Liverpool no México)
    const cityResult = data.find(
      (item) =>
        (item.type && ["city", "town", "administrative", "village", "municipality", "country", "state"].includes(item.type)) ||
        (item.class && ["place", "boundary"].includes(item.class))
    );

    const chosen = cityResult || data[0];
    return { lat: parseFloat(chosen.lat), lon: parseFloat(chosen.lon) };
  } catch {
    return null;
  }
}

export interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
  imageUrl?: string;
  category?: PlaceCategory | null;
  /** Telefone, se disponível no Photon/OSM */
  phone?: string | null;
  /** Website oficial, se disponível */
  website?: string | null;
  /** Horário de funcionamento em formato OSM (ex: "Mo-Fr 09:00-18:00") */
  openingHours?: string | null;
  /** URL do artigo da Wikipedia mais próximo, se conhecido */
  wikipediaUrl?: string | null;
  /** Tipo OSM (ex: "restaurant", "museum") para badge informativa */
  osmType?: string | null;
  /** Tags OSM brutas para usos avançados */
  osmTags?: Record<string, string> | null;
}

const PHOTO_POOLS: Record<string, string[]> = {
  museum: [
    "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=400&q=80",
  ],
  park: [
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1511497584788-876761c119ef?auto=format&fit=crop&w=400&q=80",
  ],
  beach: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=400&q=80",
  ],
  hotel: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=400&q=80",
  ],
  cafe: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=400&q=80",
  ],
  transport: [
    "https://images.unsplash.com/photo-1543716627-839b54c40519?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=400&q=80",
  ],
  general: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80",
  ],
};

function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getPlaceCategoryFallbackImage(name: string, category?: string | null): string {
  const lowerName = name.toLowerCase();
  let poolKey = "general";

  if (lowerName.includes("museum") || lowerName.includes("museu") || lowerName.includes("art") || lowerName.includes("galeria") || lowerName.includes("gallery")) {
    poolKey = "museum";
  } else if (lowerName.includes("park") || lowerName.includes("parque") || lowerName.includes("garden") || lowerName.includes("jardim") || lowerName.includes("praça")) {
    poolKey = "park";
  } else if (category === "beach" || lowerName.includes("beach") || lowerName.includes("praia") || lowerName.includes("coast")) {
    poolKey = "beach";
  } else if (category === "hotel" || lowerName.includes("hotel") || lowerName.includes("resort") || lowerName.includes("pousada") || lowerName.includes("inn")) {
    poolKey = "hotel";
  } else if (lowerName.includes("cafe") || lowerName.includes("café") || lowerName.includes("coffee") || lowerName.includes("padaria")) {
    poolKey = "cafe";
  } else if (category === "restaurant" || lowerName.includes("resto") || lowerName.includes("restaurante") || lowerName.includes("burger") || lowerName.includes("bar") || lowerName.includes("pizza") || lowerName.includes("food")) {
    poolKey = "restaurant";
  } else if (category === "transport" || lowerName.includes("station") || lowerName.includes("airport") || lowerName.includes("estação") || lowerName.includes("aeroporto")) {
    poolKey = "transport";
  }

  const pool = PHOTO_POOLS[poolKey] || PHOTO_POOLS.general;
  const hashIndex = getStringHash(name) % pool.length;
  return pool[hashIndex];
}

/** Categorias de lugar do roteiro — usadas no filtro de busca e no ícone do pin no mapa. */
export const PLACE_CATEGORIES = [
  { id: "attraction", label: "Atração", osmTag: "tourism:attraction", color: "#7c3aed" },
  { id: "restaurant", label: "Restaurante", osmTag: "amenity:restaurant", color: "#ea580c" },
  { id: "hotel", label: "Hotel", osmTag: "tourism:hotel", color: "#0891b2" },
  { id: "beach", label: "Praia", osmTag: "natural:beach", color: "#0d9488" },
  { id: "transport", label: "Transporte", osmTag: "aeroway", color: "#4b5563" },
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]["id"];

export function getCategoryColor(category: string | null | undefined): string {
  return PLACE_CATEGORIES.find((c) => c.id === category)?.color ?? "#111827";
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function extractCleanPlaceName(item: { name?: string; namedetails?: { name?: string }; display_name?: string }): string {
  if (item.name && typeof item.name === "string" && item.name.trim() && !/^\d+[a-zA-Z]?$/.test(item.name.trim())) {
    return item.name.trim();
  }
  if (item.namedetails?.name && typeof item.namedetails.name === "string" && !/^\d+[a-zA-Z]?$/.test(item.namedetails.name.trim())) {
    return item.namedetails.name.trim();
  }
  const parts = (item.display_name || "").split(",").map((s: string) => s.trim());
  for (const part of parts) {
    if (part && !/^\d+[a-zA-Z]?$/.test(part)) {
      return part;
    }
  }
  return parts[0] || "Lugar";
}

/**
 * Search places strictly bounded around the trip destination.
 * `near` sets the geographic center of the destination city.
 * Results > 50km from the destination are strictly discarded.
 */
export async function searchPlaces(
  query: string,
  near?: { lat: number; lon: number },
  category?: PlaceCategory,
  destinationName?: string
): Promise<PlaceSearchResult[]> {
  try {
    const cleanQuery = query.trim();
    const results: PlaceSearchResult[] = [];
    const seen = new Set<string>();

    // 1. Se possuímos a coordenada `near` do destino, fazer busca direcionada com bounded=1 e viewbox
    if (near) {
      const delta = 0.35; // ~35km em torno da cidade de destino
      const minLon = near.lon - delta;
      const maxLon = near.lon + delta;
      const minLat = near.lat - delta;
      const maxLat = near.lat + delta;
      const viewbox = `${minLon},${maxLat},${maxLon},${minLat}`;

      let nomQuery = cleanQuery;
      if (category === "restaurant") nomQuery = cleanQuery.length >= 2 ? cleanQuery : "restaurant";
      else if (category === "hotel") nomQuery = cleanQuery.length >= 2 ? cleanQuery : "hotel";
      else if (category === "attraction") nomQuery = cleanQuery.length >= 2 ? cleanQuery : "attraction tourism";
      else if (category === "beach") nomQuery = cleanQuery.length >= 2 ? cleanQuery : "beach";
      else if (category === "transport") nomQuery = cleanQuery.length >= 2 ? cleanQuery : "station airport";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        nomQuery
      )}&viewbox=${viewbox}&bounded=1&format=json&limit=30&addressdetails=1&namedetails=1&extratags=1`;

      const nomRes = await fetch(nomUrl, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8", "User-Agent": "SeuBolsoInteligente/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (nomRes.ok) {
        const nomData: NominatimSearchResult[] = await nomRes.json();
        for (const item of nomData) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);

          // Filtro de distância em relação ao destino
          const distKm = calculateHaversineDistance(near.lat, near.lon, lat, lon);
          if (distKm > 50) continue;

          const name = extractCleanPlaceName(item);
          const key = `${name.toLowerCase()}|${lat.toFixed(3)},${lon.toFixed(3)}`;
          if (!seen.has(key)) {
            seen.add(key);
            // Nominatim retorna extras via `extratags` quando ligado, mas a API pública
            // não envia por padrão — usamos o que veio no item.
            const extra = (item as unknown as {
              extratags?: Record<string, string>;
            }).extratags;
            results.push({
              name,
              address: item.display_name || name,
              lat,
              lon,
              category,
              imageUrl: getPlaceCategoryFallbackImage(name, category),
              phone: extra?.phone || extra?.["contact:phone"] || null,
              website: extra?.website || extra?.["contact:website"] || null,
              openingHours: extra?.opening_hours || null,
              osmType: extra?.["osm_value"] || item.type || null,
              osmTags: extra || null,
            });
          }
        }
      }
    }

    // 2. Complementar resultados usando Photon da Komoot
    {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const url = new URL("https://photon.komoot.io/api/");
      const fullQuery =
        destinationName && !cleanQuery.toLowerCase().includes(destinationName.toLowerCase())
          ? `${cleanQuery} ${destinationName}`
          : cleanQuery;

      url.searchParams.set("q", fullQuery);
      url.searchParams.set("limit", "25");
      if (near) {
        url.searchParams.set("lat", String(near.lat));
        url.searchParams.set("lon", String(near.lon));
      }
      const osmTag = PLACE_CATEGORIES.find((c) => c.id === category)?.osmTag;
      if (osmTag) url.searchParams.set("osm_tag", osmTag);

      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const features: Array<{
          properties?: Record<string, string>;
          geometry?: { coordinates?: [number, number] };
        }> = data.features || [];

        for (const f of features) {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates;
          if (!p.name || !coords || /^\d+[a-zA-Z]?$/.test(p.name.trim())) continue;
          const [lon, lat] = coords;

          if (near) {
            const distKm = calculateHaversineDistance(near.lat, near.lon, lat, lon);
            if (distKm > 50) continue;
          }

          const address = [p.street, p.district, p.city, p.state, p.country].filter(Boolean).join(", ");
          const name = p.name.trim();
          const key = `${name.toLowerCase()}|${lat.toFixed(3)},${lon.toFixed(3)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          // Mapeia OSM type para badge informativa (ex: "restaurant", "museum")
          const osmType = p.osm_value || p.type || null;
          // Wikipedia vem como "pt:Museu_do_Acre" ou URL completa
          let wikipediaUrl: string | null = null;
          if (p.wikipedia) {
            const [lang, ...titleParts] = p.wikipedia.split(":");
            const articleTitle = titleParts.join(":");
            if (lang && articleTitle) {
              wikipediaUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(articleTitle.replace(/ /g, "_"))}`;
            }
          } else if (p["wikipedia:pt"]) {
            wikipediaUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(p["wikipedia:pt"].replace(/ /g, "_"))}`;
          } else if (p["wikipedia:en"]) {
            wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(p["wikipedia:en"].replace(/ /g, "_"))}`;
          }

          results.push({
            name,
            address: address || name,
            lat,
            lon,
            category,
            imageUrl: getPlaceCategoryFallbackImage(name, category),
            phone: p.phone || p["contact:phone"] || null,
            website: p.website || p["contact:website"] || p.url || null,
            openingHours: p.opening_hours || null,
            wikipediaUrl,
            osmType,
            osmTags: p,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Extrai lat/lon de um link do Google Maps colado pelo usuário, sem geocodificação
 * externa (100% confiável quando o link já contém as coordenadas).
 * Cobre os formatos mais comuns: .../@lat,lon,zoom, ?q=lat,lon e !3dlat!4dlon (place URLs).
 */
export function parseGoogleMapsUrl(url: string): { lat: number; lon: number } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // .../place/.../!3d-23.5505!4d-46.6333
    /[?&](?:q|query)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // centro da câmera: último fallback
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lon) <= 180
      ) {
        return { lat, lon };
      }
    }
  }
  return null;
}

/** Extrai o nome legível presente em URLs longas no formato `/place/Nome`. */
export function parseGoogleMapsPlaceName(url: string): string | null {
  const match = url.trim().match(/\/place\/([^/?#]+)/i);
  if (!match) return null;

  try {
    const decoded = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

/** Gera um link HTTPS estável para abrir exatamente as coordenadas escolhidas. */
export function buildGoogleMapsUrl(lat: number, lon: number): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${lat},${lon}`);
  return url.toString();
}

/** Impede que o campo de Maps seja usado para renderizar links inseguros. */
export function isSafeGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "google.com.br" ||
      hostname.endsWith(".google.com.br") ||
      hostname === "maps.app.goo.gl" ||
      hostname === "goo.gl"
    );
  } catch {
    return false;
  }
}

/**
 * Reverse geocode a lat/lon into a place name/address using Nominatim.
 * Used when the user drops a pin directly on the map.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ name: string; address: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=17`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9", "User-Agent": "SeuBolsoInteligente/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    const name: string = data.name || (data.display_name || "").split(",")[0].trim();
    if (!name) return null;
    return { name, address: data.display_name || name };
  } catch {
    return null;
  }
}

/**
 * Fetch real POIs from Overpass API for a given lat/lon.
 * Returns up to `limit` diverse POIs sorted by tourist relevance.
 */
async function fetchOverpassPOIs(
  lat: number,
  lon: number,
  radiusMeters = 5000,
  limit = 12
): Promise<POI[]> {
  // Build union query for all POI types
  const unionParts = POI_TYPES.map(({ query }) => {
    const [key, value] = query.split("=");
    return (
      `node["${key}"="${value}"](around:${radiusMeters},${lat},${lon});\n` +
      `way["${key}"="${value}"](around:${radiusMeters},${lat},${lon});`
    );
  }).join("\n");

  const overpassQuery = `[out:json][timeout:20];(\n${unionParts}\n);out center tags 50;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  // Try multiple Overpass mirrors — some block CORS, pick first that works
  const mirrors = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
  ];

  let res: Response | null = null;
  for (const mirror of mirrors) {
    try {
      res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });
      if (res.ok) break;
    } catch {
      // try next mirror
    }
  }
  clearTimeout(timeout);
  if (!res || !res.ok) throw new Error(`Overpass error: all mirrors failed`);
  const data = await res.json();
  interface OverpassElement {
    lat?: number;
    lon?: number;
    center?: { lat?: number; lon?: number };
    tags?: Record<string, string>;
  }

  const elements: OverpassElement[] = data.elements || [];

  // Deduplicate by name and map to POI
  const seen = new Set<string>();
  const pois: POI[] = [];

  for (const el of elements) {
    const tags: Record<string, string> = el.tags || {};
    const name = getBestName(tags);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    // Determine coordinates (nodes have lat/lon directly, ways have center)
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) continue;

    // Find matching POI type for category/duration
    let category = "Atração";
    let durationHours = 1.5;
    for (const { query, category: cat, durationHours: dur } of POI_TYPES) {
      const [key, value] = query.split("=");
      if (tags[key] === value) {
        category = cat;
        durationHours = dur;
        break;
      }
    }

    const location = buildLocation(tags);
    const description = buildDescription(tags, category);
    const mapsUrl = `https://www.google.com/maps/place/${elLat},${elLon}`;

    pois.push({
      title: name,
      location,
      description,
      durationHours,
      lat: elLat,
      lon: elLon,
      mapsUrl,
      tags,
    });

    if (pois.length >= limit * 3) break; // collect extra for diversity filtering
  }

  // Ensure category diversity — pick best spread
  const byCategory = new Map<string, POI[]>();
  for (const poi of pois) {
    const cat =
      poi.tags?.tourism || poi.tags?.amenity || poi.tags?.historic || poi.tags?.leisure || "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(poi);
  }

  const diverse: POI[] = [];
  const iters = Math.ceil(limit / byCategory.size) + 1;
  for (let i = 0; i < iters && diverse.length < limit; i++) {
    for (const items of byCategory.values()) {
      if (i < items.length && diverse.length < limit) diverse.push(items[i]);
    }
  }

  return diverse.slice(0, limit);
}

/**
 * Main entry point: geocode destination then fetch real POIs.
 * Falls back to empty array on any error.
 */
export async function fetchRealPOIs(destination: string, limit = 10): Promise<POI[]> {
  const coords = await geocodeDestination(destination);
  if (!coords) return [];

  try {
    return await fetchOverpassPOIs(coords.lat, coords.lon, 5000, limit);
  } catch {
    // Try wider radius if first attempt returns too few results
    try {
      return await fetchOverpassPOIs(coords.lat, coords.lon, 15000, limit);
    } catch {
      return [];
    }
  }
}
