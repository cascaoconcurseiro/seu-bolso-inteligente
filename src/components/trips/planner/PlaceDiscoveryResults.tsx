import { Check, MapPin } from "lucide-react";
import type { PlaceSearchResult } from "@/services/overpassService";
import type { DiscoveredPlace } from "./PlaceDiscoveryDialog";

interface PlaceDiscoveryResultsProps {
  status: "idle" | "loading" | "empty" | "error";
  results: PlaceSearchResult[];
  selected: DiscoveredPlace | null;
  onChoose: (place: PlaceSearchResult) => void;
}

export function PlaceDiscoveryResults({
  status,
  results,
  selected,
  onChoose,
}: PlaceDiscoveryResultsProps) {
  return (
    <>
      <div id="place-discovery-results" role="listbox" aria-label="Resultados de lugares">
        {results.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {results.map((place, index) => (
              <button
                key={`${place.lat}-${place.lon}-${index}`}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => onChoose(place)}
                className="flex min-h-14 w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left last:border-b-0 hover:bg-muted/60"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{place.name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {place.address || "Endereço não informado"}
                  </span>
                </span>
              </button>
            ))}
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
