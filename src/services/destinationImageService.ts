/**
 * Serviço de capas inteligentes e gratuitas para destinos de viagem.
 * Busca fotos HD via Wikipedia API e fallback de fotos autorizadas do Unsplash.
 */

const CURATED_CITY_COVERS: Record<string, string> = {
  liverpool: "https://images.unsplash.com/photo-1543832923-44667a44c804?auto=format&fit=crop&w=1200&q=80",
  madrid: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",
  madri: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a771deda?auto=format&fit=crop&w=1200&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
  londres: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
  roma: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
  lisboa: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=1200&q=80",
  lisbon: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=1200&q=80",
  porto: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  toquio: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  newyork: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
  novayork: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
  rio: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80",
  riodejaneiro: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80",
  saopaulo: "https://images.unsplash.com/photo-1543059080-f9b167a19d38?auto=format&fit=crop&w=1200&q=80",
  gramado: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=1200&q=80",
  buenosaires: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=1200&q=80",
  amsterdam: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
  orlando: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=1200&q=80",
  miami: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1200&q=80",
};

const cache = new Map<string, string>();

function cleanCityName(destination: string): string {
  const firstPart = destination.split(",")[0].trim();
  return firstPart
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Busca uma imagem de capa HD para a cidade/destino informada.
 * Tenta fotos curadas do Unsplash e fallback automático via Wikipedia API.
 */
export async function fetchDestinationCoverImage(destinationName: string): Promise<string> {
  if (!destinationName || !destinationName.trim()) {
    return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
  }

  const key = cleanCityName(destinationName);
  if (CURATED_CITY_COVERS[key]) {
    return CURATED_CITY_COVERS[key];
  }
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const rawCity = destinationName.split(",")[0].trim();

  for (const lang of ["pt", "en"] as const) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawCity)}`
      );
      if (res.ok) {
        const data = await res.json();
        const imgUrl = data?.originalimage?.source || data?.thumbnail?.source;
        if (imgUrl) {
          cache.set(key, imgUrl);
          return imgUrl;
        }
      }
    } catch {
      // Ignora erro e tenta próximo fallback
    }
  }

  const defaultCover = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
  cache.set(key, defaultCover);
  return defaultCover;
}

/**
 * Valida se uma string e uma URL de imagem legitima (comeca com http, https, etc).
 * Ignora textos simples salvos por engano no banco (ex: "Liverpool, UK").
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/")
  );
}

/**
 * Retorna a URL final da capa. Se `coverImage` for invalida ou nula,
 * calcula automaticamente a foto estatica/dinamica do destino.
 */
export function getTripCoverImage(
  coverImage: string | null | undefined,
  destinationName: string | null | undefined
): string {
  if (isValidImageUrl(coverImage)) {
    return coverImage!.trim();
  }
  return getFastDestinationCoverImage(destinationName);
}

/**
 * Retorna uma URL de imagem de capa imediata para o destino.
 */
export function getFastDestinationCoverImage(destinationName: string | null | undefined): string {
  if (!destinationName) {
    return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
  }
  const key = cleanCityName(destinationName);
  if (CURATED_CITY_COVERS[key]) return CURATED_CITY_COVERS[key];
  if (cache.has(key)) return cache.get(key)!;
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
}
