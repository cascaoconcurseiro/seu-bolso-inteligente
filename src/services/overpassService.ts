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

/**
 * Get lat/lon for a destination string using Nominatim (OpenStreetMap geocoder).
 */
export async function geocodeDestination(
  destination: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9", "User-Agent": "SeuBolsoInteligente/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

/**
 * Search places by free text using Photon (komoot) — OSM-based geocoder
 * designed for autocomplete. Free, no API key.
 * `near` biases results toward the trip destination.
 */
export async function searchPlaces(
  query: string,
  near?: { lat: number; lon: number }
): Promise<PlaceSearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    if (near) {
      url.searchParams.set("lat", String(near.lat));
      url.searchParams.set("lon", String(near.lon));
    }
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const features: Array<{
      properties?: Record<string, string>;
      geometry?: { coordinates?: [number, number] };
    }> = data.features || [];

    const results: PlaceSearchResult[] = [];
    const seen = new Set<string>();
    for (const f of features) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!p.name || !coords) continue;
      const [lon, lat] = coords;
      const address = [p.street, p.district, p.city, p.state, p.country].filter(Boolean).join(", ");
      const key = `${p.name}|${address}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ name: p.name, address, lat, lon });
    }
    return results;
  } catch {
    return [];
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

  const elements: any[] = data.elements || [];

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
