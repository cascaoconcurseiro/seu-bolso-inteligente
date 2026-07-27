import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  buildGoogleMapsUrl,
  searchPlaces,
  type PlaceCategory,
  type PlaceSearchResult,
} from "@/services/overpassService";
import { PlaceDiscoveryResults } from "./PlaceDiscoveryResults";
import {
  MORE_PLACE_PRESETS,
  PLACE_DISCOVERY_PRESETS,
  QUICK_PLACE_PRESETS,
} from "./placeDiscoveryCatalog";

export interface DiscoveredPlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  category: PlaceCategory | null;
}

interface PlaceDiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchNear: { lat: number; lon: number } | null;
  destinationName?: string;
  isSaving: boolean;
  onSave: (place: DiscoveredPlace) => void;
  onAddToDay: (place: DiscoveredPlace) => void;
}

export function PlaceDiscoveryDialog({
  open,
  onOpenChange,
  searchNear,
  destinationName,
  isSaving,
  onSave,
  onAddToDay,
}: PlaceDiscoveryDialogProps) {
  const [query, setQuery] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selected, setSelected] = useState<DiscoveredPlace | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const requestId = useRef(0);

  const activePreset = useMemo(
    () => PLACE_DISCOVERY_PRESETS.find((item) => item.id === presetId) ?? null,
    [presetId]
  );

  useEffect(() => {
    if (!open) {
      requestId.current += 1;
      setQuery("");
      setPresetId(null);
      setShowMore(false);
      setResults([]);
      setSelected(null);
      setStatus("idle");
      return;
    }

    const normalized = query.trim();
    const effectiveQuery = normalized.length >= 2 ? normalized : activePreset?.query ?? "";
    if (!effectiveQuery || selected) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const currentRequest = ++requestId.current;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchPlaces(
          effectiveQuery,
          searchNear ?? undefined,
          activePreset?.category ?? undefined,
          destinationName
        );
        if (requestId.current !== currentRequest) return;
        setResults(places);
        setStatus(places.length ? "idle" : "empty");
      } catch {
        if (requestId.current !== currentRequest) return;
        setResults([]);
        setStatus("error");
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [activePreset, destinationName, open, query, searchNear, selected]);

  const selectPreset = (id: string) => {
    setPresetId((current) => (current === id ? null : id));
    setQuery("");
    setSelected(null);
  };

  const choosePlace = (place: PlaceSearchResult) => {
    const discovered: DiscoveredPlace = {
      name: place.name,
      address: place.address || place.name,
      latitude: place.lat,
      longitude: place.lon,
      mapsUrl: buildGoogleMapsUrl(place.lat, place.lon),
      category: activePreset?.category ?? place.category ?? null,
    };
    setSelected(discovered);
    setQuery(place.name);
    setResults([]);
    setStatus("idle");
  };

  const renderPreset = (item: (typeof PLACE_DISCOVERY_PRESETS)[number]) => (
    <button
      key={item.id}
      type="button"
      onClick={() => selectPreset(item.id)}
      aria-pressed={presetId === item.id}
      className={`min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors ${
        presetId === item.id
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      }`}
    >
      {item.label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,760px)] w-[calc(100%-0.75rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:h-auto sm:max-h-[90dvh]">
        <DialogHeader className="border-b border-border/70 px-4 py-4 pr-14 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Explorar lugares</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">
                Pesquise serviços e pontos de interesse próximos ao destino usando dados abertos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="sticky top-0 z-10 -mx-4 -mt-4 space-y-3 border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-5 sm:px-6 sm:py-5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="place-discovery-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPresetId(null);
                  setSelected(null);
                }}
                placeholder="Farmácia, mercado, academia ou endereço"
                className="h-12 rounded-2xl pl-11 pr-11"
                autoComplete="off"
                aria-label="Pesquisar lugares e serviços"
                aria-controls="place-discovery-results"
                aria-expanded={results.length > 0}
                aria-busy={status === "loading"}
                role="combobox"
              />
              {status === "loading" && (
                <Loader2
                  className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUICK_PLACE_PRESETS.map(renderPreset)}
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3.5 text-sm font-medium hover:bg-muted"
                aria-expanded={showMore}
              >
                Mais
                {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showMore && (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/25 p-3">
                {MORE_PLACE_PRESETS.map(renderPreset)}
              </div>
            )}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {destinationName
                ? `Resultados priorizados em ${destinationName}.`
                : "Resultados priorizados perto do destino da viagem."}
            </p>
          </div>

          <div className="pt-4">
            <PlaceDiscoveryResults
              status={status}
              results={results}
              selected={selected}
              onChoose={choosePlace}
            />
          </div>

          <p className="sr-only" aria-live="polite">
            {status === "loading"
              ? "Buscando lugares"
              : selected
                ? `${selected.name} selecionado`
                : results.length
                  ? `${results.length} lugares encontrados`
                  : ""}
          </p>
        </div>

        <div className="grid gap-2 border-t border-border/70 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!selected || isSaving}
            onClick={() => selected && onSave(selected)}
          >
            {isSaving ? "Salvando…" : "Guardar como ideia"}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={!selected || isSaving}
            onClick={() => selected && onAddToDay(selected)}
          >
            Adicionar ao dia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
