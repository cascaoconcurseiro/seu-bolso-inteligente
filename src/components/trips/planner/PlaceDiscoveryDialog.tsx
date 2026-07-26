import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
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
  PLACE_CATEGORIES,
  searchPlaces,
  type PlaceCategory,
  type PlaceSearchResult,
} from "@/services/overpassService";
import { PlaceDiscoveryResults } from "./PlaceDiscoveryResults";

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
  isSaving: boolean;
  onSave: (place: DiscoveredPlace) => void;
  onAddToDay: (place: DiscoveredPlace) => void;
}

export function PlaceDiscoveryDialog({
  open,
  onOpenChange,
  searchNear,
  isSaving,
  onSave,
  onAddToDay,
}: PlaceDiscoveryDialogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selected, setSelected] = useState<DiscoveredPlace | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      requestId.current += 1;
      setQuery("");
      setCategory(null);
      setResults([]);
      setSelected(null);
      setStatus("idle");
      return;
    }

    const normalized = query.trim();
    if (normalized.length < 3 || selected) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const currentRequest = ++requestId.current;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchPlaces(
          normalized,
          searchNear ?? undefined,
          category ?? undefined
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
  }, [category, open, query, searchNear, selected]);

  const choosePlace = (place: PlaceSearchResult) => {
    const discovered: DiscoveredPlace = {
      name: place.name,
      address: place.address || place.name,
      latitude: place.lat,
      longitude: place.lon,
      mapsUrl: buildGoogleMapsUrl(place.lat, place.lon),
      category,
    };
    setSelected(discovered);
    setQuery(place.name);
    setResults([]);
    setStatus("idle");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/70 px-5 py-5 pr-16 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle>Buscar lugares</DialogTitle>
              <DialogDescription className="mt-1">
                Descubra e guarde ideias antes de montar os dias.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">O que você procura?</legend>
            <div className="flex flex-wrap gap-2">
              {PLACE_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(category === item.id ? null : item.id);
                    setSelected(null);
                  }}
                  aria-pressed={category === item.id}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
                    category === item.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="place-discovery-search" className="text-sm font-semibold">
              Nome ou endereço
            </label>
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
                  setSelected(null);
                }}
                placeholder="Museu, restaurante, praia ou endereço"
                className="h-12 pl-11"
                autoComplete="off"
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
            <p className="text-sm text-muted-foreground">
              A busca prioriza lugares próximos ao destino da viagem.
            </p>
          </div>

          <PlaceDiscoveryResults
            status={status}
            results={results}
            selected={selected}
            onChoose={choosePlace}
          />

          <p className="sr-only" aria-live="polite">
            {status === "loading"
              ? "Buscando lugares"
              : selected
                ? `${selected.name} selecionado e marcado no mapa`
                : results.length
                  ? `${results.length} lugares encontrados`
                  : ""}
          </p>
        </div>

        <div className="grid gap-2 border-t border-border/70 bg-background/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-6">
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
