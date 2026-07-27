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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cacheKey(name: string, lat: number, lon: number) {
  return `${normalize(name)}|${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function articleScore(placeName: string, page: GeosearchPage) {
  const normalizedPlace = normalize(placeName);
  const normalizedTitle = normalize(page.title);
  if (!normalizedPlace || !normalizedTitle) return -Infinity;
  if (normalizedPlace === normalizedTitle) return 1000;

  const placeTokens = new Set(normalizedPlace.split(" ").filter((token) => token.length >= 3));
  const titleTokens = new Set(normalizedTitle.split(" ").filter((token) => token.length >= 3));
  const commonTokens = [...placeTokens].filter((token) => titleTokens.has(token));
  const overlap = placeTokens.size ? commonTokens.length / placeTokens.size : 0;
  const contains =
    normalizedPlace.includes(normalizedTitle) || normalizedTitle.includes(normalizedPlace);

  if (!contains && commonTokens.length === 0) return -Infinity;

  const distancePenalty = Math.min(page.dist ?? 0, 1000) / 25;
  return (contains ? 300 : 0) + overlap * 200 + commonTokens.length * 20 - distancePenalty;
}

async function findNearbyArticle(
  language: "pt" | "en",
  placeName: string,
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<GeosearchPage | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: "750",
    gslimit: "10",
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
  const ranked = pages
    .map((page) => ({ page, score: articleScore(placeName, page) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.page ?? null;
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
 * Busca um artigo enciclopédico próximo e confirma correspondência pelo nome.
 * Tenta primeiro a Wikipedia em português e usa a edição em inglês como fallback.
 */
export async function fetchNearbyWikipediaPlace(
  placeName: string,
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WikipediaPlaceSummary | null> {
  const key = cacheKey(placeName, lat, lon);
  if (summaryCache.has(key)) return summaryCache.get(key) ?? null;

  for (const language of ["pt", "en"] as const) {
    try {
      const article = await findNearbyArticle(language, placeName, lat, lon, signal);
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
