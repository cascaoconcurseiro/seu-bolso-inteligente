 
 
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Route, Search } from "lucide-react";
import {
  buildGoogleMapsUrl,
  isSafeGoogleMapsUrl,
  parseGoogleMapsPlaceName,
  parseGoogleMapsUrl,
} from "@/services/mapsHelpers";
import { PLACE_CATEGORIES, type PlaceCategory, type PlaceSearchResult } from "./types";

interface ItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  dateLocked: boolean;
  isLoading: boolean;
  date: string;
  setDate: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  mapsUrl: string;
  setMapsUrl: (v: string) => void;
  hasCoords: boolean;
  onCoordsChange: (c: { lat: number; lon: number } | null) => void;
  searchNear: { lat: number; lon: number } | null;
  category: PlaceCategory | null;
  setCategory: (c: PlaceCategory | null) => void;
  destinationName?: string;
  onSubmit: () => void;
  onSaveOnly: () => void;
}

export function ItineraryDialog({
  open,
  onOpenChange,
  isEditing,
  dateLocked,
  isLoading,
  date,
  setDate,
  title,
  setTitle,
  description,
  setDescription,
  location,
  setLocation,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  mapsUrl,
  setMapsUrl,
  hasCoords,
  onCoordsChange,
  searchNear,
  category,
  setCategory,
  destinationName,
  onSubmit,
  onSaveOnly,
}: ItineraryDialogProps) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [activePlaceIndex, setActivePlaceIndex] = useState(-1);
  const [resolvedPlaceName, setResolvedPlaceName] = useState("");
  const [timeError, setTimeError] = useState("");
  const searchRequestId = useRef(0);
  const mapsResolveRequestId = useRef(0);
  const [showMoreFields, setShowMoreFields] = useState(false);

  useEffect(() => {
    if (!open) {
      searchRequestId.current += 1;
      mapsResolveRequestId.current += 1;
      setPlaceQuery("");
      setPlaceResults([]);
      setActivePlaceIndex(-1);
      setResolvedPlaceName("");
      setTimeError("");
      setShowMoreFields(false);
      return;
    }
    const query = placeQuery.trim();
    const effectiveQuery = query.length >= 2 ? query : category ? "" : "";

    if (!effectiveQuery) {
      setPlaceResults([]);
      return;
    }

    ++searchRequestId.current;
    setIsSearchingPlaces(true);
    const timer = setTimeout(async () => {
      setPlaceResults([]);
      setIsSearchingPlaces(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [placeQuery, open, searchNear, category, destinationName]);

  const handlePickPlace = (place: PlaceSearchResult) => {
    if (!title.trim()) setTitle(place.name);
    setLocation(place.address || place.name);
    setMapsUrl(buildGoogleMapsUrl(place.lat, place.lon));
    setShowMoreFields(true);
    onCoordsChange({ lat: place.lat, lon: place.lon });
    setResolvedPlaceName(place.name);
    setPlaceQuery("");
    setPlaceResults([]);
    setActivePlaceIndex(-1);
  };

  const _handlePlaceKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!placeResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActivePlaceIndex((index) => (index + 1) % placeResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActivePlaceIndex((index) => (index <= 0 ? placeResults.length - 1 : index - 1));
    } else if (event.key === "Enter" && activePlaceIndex >= 0) {
      event.preventDefault();
      handlePickPlace(placeResults[activePlaceIndex]);
    } else if (event.key === "Escape") {
      setPlaceResults([]);
      setActivePlaceIndex(-1);
    }
  };

  const handleMapsUrlChange = async (value: string) => {
    ++mapsResolveRequestId.current;
    setMapsUrl(value);
    if (!isSafeGoogleMapsUrl(value)) {
      onCoordsChange(null);
      setResolvedPlaceName("");
      return;
    }
    const coordinates = parseGoogleMapsUrl(value);
    if (!coordinates) return;

    onCoordsChange(coordinates);
    const nameFromUrl = parseGoogleMapsPlaceName(value);
    if (nameFromUrl && !title.trim()) setTitle(nameFromUrl);
    setResolvedPlaceName(nameFromUrl || "Lugar do Google Maps");
  };

  const openMapsSearch = () => {
    const query = encodeURIComponent(location || title);
    const url = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, "_blank");
  };

  const submitActivity = () => {
    if (startTime && endTime && endTime <= startTime) {
      setTimeError("O horário de fim deve ser posterior ao horário de início");
      return;
    }
    setTimeError("");
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-t-3xl p-0 shadow-2xl motion-safe:transition-transform sm:max-w-xl sm:rounded-3xl">
        <div className="flex w-full justify-center pt-3 sm:hidden" aria-hidden="true">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        <DialogHeader className="border-b border-border/70 px-5 pb-5 pt-3 pr-16 sm:px-6 sm:pt-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Route className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle>{isEditing ? "Editar atividade" : "Nova atividade"}</DialogTitle>
              <DialogDescription className="mt-1">
                {isEditing
                  ? "Atualize os detalhes desta parada."
                  : "Defina quando e onde ela entra no roteiro."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          aria-busy={isLoading || isSearchingPlaces}
          onSubmit={(event) => {
            event.preventDefault();
            submitActivity();
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {/* Data e Horários numa linha compacta */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="itinerary-date" className="text-xs font-semibold">
                  Data
                </Label>
                <Input
                  id="itinerary-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={dateLocked}
                  aria-required="true"
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="itinerary-start-time" className="text-xs font-semibold">
                  Início
                </Label>
                <Input
                  id="itinerary-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setTimeError("");
                  }}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="itinerary-end-time" className="text-xs font-semibold">
                  Fim
                </Label>
                <Input
                  id="itinerary-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setTimeError("");
                  }}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            {timeError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {timeError}
              </p>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="itinerary-title" className="text-xs font-semibold">
                Título da atividade *
              </Label>
              <Input
                id="itinerary-title"
                placeholder="Ex: Visita ao Museu, Jantar no Centro..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-required="true"
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Classificação e Endereço do Local */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              {/* Categoria / Tipo de Atração */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Tipo de atração</Label>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Classificar tipo de atração"
                >
                  {PLACE_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const nextCat = isSelected ? null : cat.id;
                          setCategory(nextCat);
                        }}
                        aria-pressed={isSelected}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                          isSelected
                            ? "text-white shadow-sm"
                            : "border-border/80 bg-background text-foreground hover:bg-accent"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: cat.color, borderColor: cat.color }
                            : undefined
                        }
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endereço do local com vínculo ao Google Maps */}
              <div className="space-y-1.5">
                <Label htmlFor="itinerary-location" className="text-xs font-semibold text-foreground">
                  Endereço do local
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="itinerary-location"
                    role="combobox"
                    aria-label="Buscar local"
                    placeholder="Ex: Av. Paulista, 1000 - São Paulo..."
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      onCoordsChange(null);
                      setResolvedPlaceName("");
                    }}
                    className="h-10 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={openMapsSearch}
                    disabled={!location && !title}
                    aria-label="Buscar local no Maps"
                    title="Abrir no Google Maps"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {hasCoords && (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <MapPin className="h-3 w-3" />
                  {resolvedPlaceName
                    ? `Local selecionado: ${resolvedPlaceName}`
                    : "Pin marcado no mapa"}
                </p>
              )}
            </div>

            {/* Toggle de Campos Opcionais Avançados */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 py-1"
              >
                {showMoreFields
                  ? "− Ocultar opções avançadas"
                  : "＋ Mais opções (Link do Maps, anotações)"}
              </button>

              {showMoreFields && (
                <div className="mt-3 space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
                  {/* Link do Maps */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="itinerary-maps-url"
                      className="text-xs font-semibold flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      Link do Google Maps
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="itinerary-maps-url"
                        placeholder="Cole o link do Maps aqui…"
                        value={mapsUrl}
                        onChange={(e) => void handleMapsUrlChange(e.target.value)}
                        className="h-10 text-xs"
                      />
                      {mapsUrl && isSafeGoogleMapsUrl(mapsUrl) && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <Label htmlFor="itinerary-description" className="text-xs font-semibold">
                      Descrição / Notas
                    </Label>
                    <Textarea
                      id="itinerary-description"
                      placeholder="Detalhes ou observações da atividade…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none text-xs"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2 border-t border-border/70 bg-background/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            {!isEditing && (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={onSaveOnly}
                disabled={isLoading || !title}
              >
                Guardar como ideia
              </Button>
            )}
            <Button
              type="submit"
              className={`min-h-11 font-semibold ${isEditing ? "sm:col-span-2" : ""}`}
              disabled={isLoading || !date || !title}
            >
              {isLoading ? "Salvando…" : isEditing ? "Salvar alterações" : "Adicionar ao roteiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
