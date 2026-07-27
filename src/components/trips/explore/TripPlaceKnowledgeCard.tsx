import { BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PlaceSearchResult } from "@/services/overpassService";
import { fetchNearbyWikipediaPlace } from "@/services/wikipediaPlaceService";

interface TripPlaceKnowledgeCardProps {
  place: PlaceSearchResult | null;
}

export function TripPlaceKnowledgeCard({ place }: TripPlaceKnowledgeCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["wikipedia-place", place?.lat, place?.lon],
    queryFn: ({ signal }) => fetchNearbyWikipediaPlace(Number(place?.lat), Number(place?.lon), signal),
    enabled: Boolean(place),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 30,
    retry: 1,
  });

  if (!place) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Procurando contexto do lugar…
      </div>
    );
  }

  if (!data) return null;

  return (
    <article className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur">
      <div className="flex gap-3 p-3">
        {data.thumbnailUrl ? (
          <img
            src={data.thumbnailUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl bg-muted object-cover"
            loading="lazy"
          />
        ) : (
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Contexto da Wikipedia
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold">{data.title}</h3>
          {data.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{data.description}</p>
          )}
          {data.extract && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{data.extract}</p>
          )}
        </div>
      </div>

      <a
        href={data.pageUrl}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-10 items-center justify-center gap-2 border-t border-border/70 px-3 text-xs font-medium text-primary hover:bg-muted/40"
      >
        Saiba mais
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </article>
  );
}
