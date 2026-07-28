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

/**
 * Gera um link do Google Maps priorizando o nome do estabelecimento e endereço/cidade
 * para que o Google abra a Ficha do Estabelecimento com Avaliações, Fotos e Estrelas.
 */
export function buildGoogleMapsUrl(
  latOrName?: number | string | null,
  lonOrAddress?: number | string | null,
  cityName?: string | null
): string {
  let searchQuery = "";

  if (typeof latOrName === "string" && latOrName.trim()) {
    const parts = [latOrName.trim()];
    if (typeof lonOrAddress === "string" && lonOrAddress.trim()) {
      parts.push(lonOrAddress.trim());
    } else if (cityName && cityName.trim()) {
      parts.push(cityName.trim());
    }
    searchQuery = parts.join(", ");
  } else if (typeof latOrName === "number" && typeof lonOrAddress === "number") {
    searchQuery = `${latOrName},${lonOrAddress}`;
  }

  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", searchQuery || "Google Maps");
  return url.toString();
}

/**
 * Gera um link de Rota / Navegação no Google Maps com pontos de origem, intermediários e destino
 * usando nomes amigáveis de locais e cidades para uma navegação perfeita.
 */
export function buildGoogleMapsDirectionsUrl(
  stops: Array<{ title: string; location?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null }>,
  destinationCity?: string | null,
  lodging?: { title?: string | null; location?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null } | null
): string {
  const pointsToRoute = [...(stops || [])];

  if (lodging && (lodging.latitude != null || Boolean(lodging.title))) {
    const first = pointsToRoute[0];
    const isSameByCoords =
      first &&
      first.latitude != null &&
      first.longitude != null &&
      lodging.latitude != null &&
      lodging.longitude != null &&
      Math.abs(first.latitude - lodging.latitude) < 0.0001 &&
      Math.abs((first.longitude || 0) - (lodging.longitude || 0)) < 0.0001;
    const isSameByTitle =
      first &&
      Boolean(first.title) &&
      first.title.trim().toLowerCase() === (lodging.title || "").trim().toLowerCase();

    if (!isSameByCoords && !isSameByTitle) {
      pointsToRoute.unshift(lodging as any);
    }
  }

  if (pointsToRoute.length === 0) return "https://www.google.com/maps";

  const formatPoint = (s: { title?: string | null; location?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null }) => {
    if (s.latitude != null && s.longitude != null && !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude))) {
      return `${s.latitude},${s.longitude}`;
    }
    const mainText = (s.title || "").trim();
    const locText = (s.location || s.address || destinationCity || "").trim();
    return [mainText, locText].filter(Boolean).join(", ");
  };

  const validPoints = pointsToRoute.map(formatPoint).filter(Boolean);

  if (validPoints.length === 0) return "https://www.google.com/maps";
  if (validPoints.length === 1) {
    const url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    url.searchParams.set("query", validPoints[0]);
    return url.toString();
  }

  const origin = validPoints[0];
  const destination = validPoints[validPoints.length - 1];
  const waypoints = validPoints.slice(1, -1).join("|");

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypoints) {
    url.searchParams.set("waypoints", waypoints);
  }
  url.searchParams.set("travelmode", "driving");
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
