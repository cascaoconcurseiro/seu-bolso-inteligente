export interface WikipediaPlaceSummary {
  title: string;
  description: string | null;
  extract: string | null;
  thumbnailUrl: string | null;
  pageUrl: string;
}

const summaryCache = new Map<string, WikipediaPlaceSummary | null>();

interface GeosearchPage {
  pageid: number;
  title: string;
  dist?: number;
}

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

async function findNearbyArticle(
  language: "pt" | "en",
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<GeosearchPage | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: "750",
    gslimit: "3",
    gsnamespace: "0",
    format: "json",
    origin: "*",
  });

  const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params.toString()}`, {
    signal,
  });
  if (!response.ok) return null;

  const data = await response.json();
  const pages: GeosearchPage[] = data?.query?.geosearch ?? [];
  return pages[0] ?? null;
}

async function fetchSummary(
  language: "pt" | "en",
  title: string,
  signal?: AbortSignal
): Promise<WikipediaPlaceSummary | null> {
  const response = await fetch(
    `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { signal }
  );
  if (!response.ok) return null;

  const data = await response.json();
  const pageUrl =
    data?.content_urls?.desktop?.page ||
    `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

  return {
    title: data?.title || title,
    description: data?.description || null,
    extract: data?.extract || null,
    thumbnailUrl: data?.thumbnail?.source || null,
    pageUrl,
  };
}

/**
 * Busca um artigo enciclopédico próximo às coordenadas.
 * Tenta primeiro a Wikipedia em português e usa a edição em inglês como fallback.
 */
export async function fetchNearbyWikipediaPlace(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WikipediaPlaceSummary | null> {
  const key = cacheKey(lat, lon);
  if (summaryCache.has(key)) return summaryCache.get(key) ?? null;

  for (const language of ["pt", "en"] as const) {
    try {
      const article = await findNearbyArticle(language, lat, lon, signal);
      if (!article) continue;

      const summary = await fetchSummary(language, article.title, signal);
      if (summary) {
        summaryCache.set(key, summary);
        return summary;
      }
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") throw error;
    }
  }

  summaryCache.set(key, null);
  return null;
}
