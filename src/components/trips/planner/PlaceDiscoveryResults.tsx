import { Check, ExternalLink, Hotel, MapPin } from "lucide-react";
import type { PlaceSearchResult } from "@/services/overpassService";
import type { DiscoveredPlace } from "./PlaceDiscoveryDialog";
import { useMemo } from "react";

interface PlaceDiscoveryResultsProps {
  status: "idle" | "loading" | "empty" | "error";
  results: PlaceSearchResult[];
  selected: DiscoveredPlace | null;
  onChoose: (place: PlaceSearchResult) => void;
  lodgingName?: string | null;
  lodgingCoords?: { lat: number; lon: number } | null;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function PlaceDiscoveryResults({
  status,
  results,
  selected,
  onChoose,
  lodgingName,
  lodgingCoords,
}: PlaceDiscoveryResultsProps) {
  // Ordena resultados por proximidade da hospedagem se houver coordenadas de hotel
  const sortedResults = useMemo(() => {
    if (!lodgingCoords) return results;
    return [...results].sort((a, b) => {
      const distA = calculateDistanceKm(lodgingCoords.lat, lodgingCoords.lon, a.lat, a.lon);
      const distB = calculateDistanceKm(lodgingCoords.lat, lodgingCoords.lon, b.lat, b.lon);
      return distA - distB;
    });
  }, [results, lodgingCoords]);

  return (
    <>
      {lodgingName && lodgingCoords && results.length > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-2xs">
          <Hotel className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Priorizando locais próximos da sua hospedagem: <strong className="font-bold">{lodgingName}</strong>
          </span>
        </div>
      )}

      <div id="place-discovery-results" role="listbox" aria-label="Resultados de lugares">
        {sortedResults.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {sortedResults.map((place, index) => {
              const googleQuery = encodeURIComponent(`${place.name}, ${place.address}`);
              const googleReviewsUrl = `https://www.google.com/maps/search/?api=1&query=${googleQuery}`;
              const dist = lodgingCoords
                ? calculateDistanceKm(lodgingCoords.lat, lodgingCoords.lon, place.lat, place.lon)
                : null;

              return (
                <div
                  key={`${place.lat}-${place.lon}-${index}`}
                  className="flex min-h-16 w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left last:border-b-0 hover:bg-muted/40"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => onChoose(place)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {place.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-xl object-cover border border-border/50 shadow-xs"
                      />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{place.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {place.address || "Endereço não informado"}
                      </span>
                      {dist !== null && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          📍 ~{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`} da sua hospedagem
                        </span>
                      )}
                    </span>
                  </button>

                  <a
                    href={googleReviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted"
                    aria-label={`Ver avaliações de ${place.name} no Google`}
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    ⭐ Avaliações no Google
                  </a>
                </div>
              );
            })}
          </div>
        )}
        {status === "empty" && (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Não encontramos esse lugar. Inclua a cidade ou tente outro nome.
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="rounded-2xl border border-destructive/30 p-5 text-sm">
            A busca está indisponível. Você ainda pode adicionar a parada manualmente.
          </p>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4" role="status">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{selected.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{selected.address}</p>
              <p className="mt-2 text-sm font-medium text-primary">Pin confirmado no mapa</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
