import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Save,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import {
  buildGoogleMapsUrl,
  isSafeGoogleMapsUrl,
  parseGoogleMapsPlaceName,
  parseGoogleMapsUrl,
  PLACE_CATEGORIES,
  reverseGeocode,
  searchPlaces,
  type PlaceCategory,
  type PlaceSearchResult,
} from "@/services/overpassService";
import { fetchNearbyWikipediaPlace } from "@/services/wikipediaPlaceService";
import { motion } from "framer-motion";

interface ItineraryStopEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues: {
    date: string;
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    mapsUrl: string;
    latitude: number | null;
    longitude: number | null;
    category: PlaceCategory | null;
    notes: string;
    phone: string;
    website: string;
    openingHours: string;
  };
  dayOptions: Array<{ date: string; label: string }>;
  destinationName?: string;
  searchNear: { lat: number; lon: number } | null;
  isLoading: boolean;
  isGeocoding: boolean;
  onSubmit: () => void;
  onSaveOnly?: () => void;
  onChange: (next: Partial<ItineraryStopEditDialogProps["initialValues"]>) => void;
}

export function ItineraryStopEditDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  dayOptions,
  destinationName,
  searchNear,
  isLoading,
  isGeocoding,
  onSubmit,
  onSaveOnly,
  onChange,
}: ItineraryStopEditDialogProps) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [activePlaceIndex, setActivePlaceIndex] = useState(-1);
  const [resolvedPlaceName, setResolvedPlaceName] = useState("");
  const [timeError, setTimeError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "info" | "advanced">("details");
  const searchRequestId = useRef(0);
  const mapsResolveRequestId = useRef(0);

  // Limpa quando fecha
  useEffect(() => {
    if (!open) {
      searchRequestId.current += 1;
      mapsResolveRequestId.current += 1;
      setPlaceQuery("");
      setPlaceResults([]);
      setActivePlaceIndex(-1);
      setResolvedPlaceName("");
      setTimeError("");
      setActiveTab("details");
      return;
    }
  }, [open]);

  // Auto-sugestão de lugares
  useEffect(() => {
    if (!open) return;
    const q = placeQuery.trim();
    const catLabel = PLACE_CATEGORIES.find((c) => c.id === initialValues.category)?.label;
    const effectiveQuery = q.length >= 2 ? q : initialValues.category ? catLabel || "" : "";
    if (!effectiveQuery) {
      setPlaceResults([]);
      return;
    }
    const reqId = ++searchRequestId.current;
    setIsSearchingPlaces(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaces(
        effectiveQuery,
        searchNear ?? undefined,
        initialValues.category ?? undefined,
        destinationName
      );
      if (searchRequestId.current !== reqId) return;
      setPlaceResults(results);
      setIsSearchingPlaces(false);
      setActivePlaceIndex(results.length ? 0 : -1);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    placeQuery,
    open,
    searchNear,
    initialValues.category,
    destinationName,
  ]);

  const handlePickPlace = (place: PlaceSearchResult) => {
    onChange({
      title: initialValues.title.trim() ? initialValues.title : place.name,
      location: place.address || place.name,
      mapsUrl: buildGoogleMapsUrl(place.name, place.address || destinationName),
      latitude: place.lat,
      longitude: place.lon,
      phone: place.phone ?? initialValues.phone,
      website: place.website ?? initialValues.website,
      openingHours: place.openingHours ?? initialValues.openingHours,
      category: place.category ?? initialValues.category,
    });
    setResolvedPlaceName(place.name);
    setPlaceQuery("");
    setPlaceResults([]);
    setActivePlaceIndex(-1);
    setActiveTab("details");
  };

  const handlePlaceKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!placeResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActivePlaceIndex((i) => (i + 1) % placeResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActivePlaceIndex((i) => (i <= 0 ? placeResults.length - 1 : i - 1));
    } else if (event.key === "Enter" && activePlaceIndex >= 0) {
      event.preventDefault();
      handlePickPlace(placeResults[activePlaceIndex]);
    } else if (event.key === "Escape") {
      setPlaceResults([]);
      setActivePlaceIndex(-1);
    }
  };

  const handleMapsUrlChange = async (value: string) => {
    const reqId = ++mapsResolveRequestId.current;
    onChange({ mapsUrl: value });
    if (!isSafeGoogleMapsUrl(value)) {
      onChange({ latitude: null, longitude: null });
      setResolvedPlaceName("");
      return;
    }
    const coordinates = parseGoogleMapsUrl(value);
    if (!coordinates) return;
    onChange({ latitude: coordinates.lat, longitude: coordinates.lon });
    const nameFromUrl = parseGoogleMapsPlaceName(value);
    if (nameFromUrl && !initialValues.title.trim()) onChange({ title: nameFromUrl });
    setResolvedPlaceName(nameFromUrl || "Lugar do Google Maps");
    const resolved = await reverseGeocode(coordinates.lat, coordinates.lon);
    if (mapsResolveRequestId.current !== reqId) return;
    if (!resolved) return;
    onChange({ location: resolved.address || resolved.name });
  };

  const openMapsSearch = () => {
    const q = encodeURIComponent(initialValues.location || initialValues.title);
    const url = isIOS
      ? `https://maps.apple.com/?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank");
  };

  const submit = () => {
    if (
      initialValues.startTime &&
      initialValues.endTime &&
      initialValues.endTime <= initialValues.startTime
    ) {
      setTimeError("O horário de fim deve ser posterior ao horário de início");
      return;
    }
    setTimeError("");
    onSubmit();
  };

  // Wikipedia (extra) — pré-carrega quando temos lat/lon
  const hasCoords = initialValues.latitude !== null && initialValues.longitude !== null;
  const { data: wiki } = useQuery({
    queryKey: ["wikipedia-stop-dialog", initialValues.title, initialValues.latitude, initialValues.longitude],
    queryFn: ({ signal }) =>
      hasCoords
        ? fetchNearbyWikipediaPlace(
            initialValues.title,
            initialValues.latitude!,
            initialValues.longitude!,
            signal
          )
        : Promise.resolve(null),
    enabled: hasCoords && open,
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-t-3xl p-0 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="flex w-full justify-center pt-3 sm:hidden" aria-hidden="true">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        <DialogHeader className="border-b border-border/70 px-5 pb-4 pt-3 pr-16 sm:px-6 sm:pt-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle>{mode === "edit" ? "Editar parada" : "Nova parada"}</DialogTitle>
              <DialogDescription className="mt-1">
                {mode === "edit"
                  ? "Atualize os detalhes desta atividade no roteiro."
                  : "Defina quando e onde essa atividade acontece no roteiro."}
              </DialogDescription>
            </div>
          </div>

          {/* Tabs internas */}
          <div className="mt-4 flex gap-1 rounded-xl border border-border/60 bg-muted/30 p-0.5 text-xs">
            {(
              [
                { id: "details", label: "Básico", icon: Calendar },
                { id: "info", label: "Detalhes", icon: Tag },
                { id: "advanced", label: "Avançado", icon: Sparkles },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold transition-colors ${
                  activeTab === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={activeTab === id}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          aria-busy={isLoading || isGeocoding || isSearchingPlaces}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {activeTab === "details" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Data e horário */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="itinerary-date" className="text-xs font-semibold">
                      Data
                    </Label>
                    <select
                      id="itinerary-date"
                      value={initialValues.date}
                      onChange={(e) => onChange({ date: e.target.value })}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      required
                    >
                      {dayOptions.map((d) => (
                        <option key={d.date} value={d.date}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="itinerary-start-time" className="text-xs font-semibold">
                      Início
                    </Label>
                    <Input
                      id="itinerary-start-time"
                      type="time"
                      value={initialValues.startTime}
                      onChange={(e) => {
                        onChange({ startTime: e.target.value });
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
                      value={initialValues.endTime}
                      onChange={(e) => {
                        onChange({ endTime: e.target.value });
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
                    placeholder="Ex: Visita ao Museu do Amanhã, Jantar no centro…"
                    value={initialValues.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    aria-required="true"
                    required
                    className="h-10 text-sm"
                  />
                </div>

                {/* Categoria — chips */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Categoria</Label>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria da parada">
                    {PLACE_CATEGORIES.map((cat) => {
                      const isSelected = initialValues.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            onChange({ category: isSelected ? null : (cat.id as PlaceCategory) })
                          }
                          aria-pressed={isSelected}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                            isSelected
                              ? "text-white shadow-sm"
                              : "border-border/80 bg-background text-foreground hover:bg-accent"
                          }`}
                          style={
                            isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : undefined
                          }
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "info" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Local + autocomplete */}
                <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <Label htmlFor="itinerary-location" className="text-xs font-semibold">
                    Local
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="itinerary-location"
                      placeholder="Endereço ou nome do lugar…"
                      value={initialValues.location}
                      onChange={(e) => {
                        onChange({ location: e.target.value });
                        setPlaceQuery(e.target.value);
                      }}
                      onKeyDown={handlePlaceKeyDown}
                      className="h-10 text-sm"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={openMapsSearch}
                      disabled={!initialValues.location && !initialValues.title}
                      aria-label="Buscar local no Maps"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {(placeResults.length > 0 || isSearchingPlaces) && (
                    <div
                      id="itinerary-place-results"
                      role="listbox"
                      className="max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl"
                    >
                      {isSearchingPlaces && placeResults.length === 0 && (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">
                          Buscando sugestões…
                        </p>
                      )}
                      {placeResults.map((place, idx) => (
                        <button
                          key={`${place.lat}-${place.lon}-${idx}`}
                          type="button"
                          role="option"
                          aria-selected={idx === activePlaceIndex}
                          className={`flex min-h-10 w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                            idx === activePlaceIndex ? "bg-accent" : "hover:bg-accent/50"
                          }`}
                          onClick={() => handlePickPlace(place)}
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold leading-tight text-foreground">
                              {place.name}
                            </span>
                            {place.address && (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {place.address}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {hasCoords && (
                    <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <MapPin className="h-3 w-3" />
                      {resolvedPlaceName
                        ? `Local selecionado: ${resolvedPlaceName}`
                        : "Coordenadas confirmadas"}
                    </p>
                  )}
                </div>

                {/* Link do Google Maps */}
                <div className="space-y-1.5">
                  <Label htmlFor="itinerary-maps-url" className="text-xs font-semibold flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    Link do Google Maps
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="itinerary-maps-url"
                      placeholder="Cole um link do Google Maps para extrair coordenadas…"
                      value={initialValues.mapsUrl}
                      onChange={(e) => void handleMapsUrlChange(e.target.value)}
                      className="h-10 text-xs"
                    />
                    {initialValues.mapsUrl && isSafeGoogleMapsUrl(initialValues.mapsUrl) && (
                      <a
                        href={initialValues.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-input bg-background hover:bg-accent"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Horário, telefone, site */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="itinerary-hours" className="text-xs font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      Horário de funcionamento
                    </Label>
                    <Input
                      id="itinerary-hours"
                      placeholder="Ex: Seg-Sex 09:00-18:00"
                      value={initialValues.openingHours}
                      onChange={(e) => onChange({ openingHours: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="itinerary-phone" className="text-xs font-semibold flex items-center gap-1">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      Telefone
                    </Label>
                    <Input
                      id="itinerary-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={initialValues.phone}
                      onChange={(e) => onChange({ phone: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="itinerary-website" className="text-xs font-semibold flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      Site oficial
                    </Label>
                    <Input
                      id="itinerary-website"
                      type="url"
                      placeholder="https://exemplo.com"
                      value={initialValues.website}
                      onChange={(e) => onChange({ website: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Notas pessoais */}
                <div className="space-y-1.5">
                  <Label htmlFor="itinerary-notes" className="text-xs font-semibold">
                    Notas pessoais
                  </Label>
                  <Textarea
                    id="itinerary-notes"
                    placeholder="Lembretes, observações, o que não esquecer…"
                    value={initialValues.notes}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    className="resize-none text-sm"
                    rows={3}
                  />
                </div>

                {/* Wikipedia card */}
                {wiki && (
                  <div className="flex gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
                    {wiki.thumbnailUrl && (
                      <img
                        src={wiki.thumbnailUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl bg-muted object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Contexto
                      </p>
                      <p className="text-sm font-semibold text-foreground">{wiki.title}</p>
                      {wiki.description && (
                        <p className="text-[11px] text-muted-foreground">{wiki.description}</p>
                      )}
                      {wiki.extract && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {wiki.extract}
                        </p>
                      )}
                      <a
                        href={wiki.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        Ler na Wikipedia
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "advanced" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="itinerary-description" className="text-xs font-semibold">
                    Descrição / observações da atividade
                  </Label>
                  <Textarea
                    id="itinerary-description"
                    placeholder="Detalhes da atividade, contexto, dicas…"
                    value={initialValues.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="resize-none text-sm"
                    rows={4}
                  />
                </div>

                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Coordenadas</p>
                  <p className="mt-1">
                    Lat: <code>{initialValues.latitude ?? "—"}</code> · Lon:{" "}
                    <code>{initialValues.longitude ?? "—"}</code>
                  </p>
                  {!hasCoords && (
                    <p className="mt-2 text-xs">
                      Sem coordenadas — a parada não aparecerá no mapa. Use a aba "Detalhes" para
                      buscar ou colar um link do Google Maps.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
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
            {mode === "create" && onSaveOnly && (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={onSaveOnly}
                disabled={isLoading || !initialValues.title}
              >
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Guardar ideia
              </Button>
            )}
            <Button
              type="submit"
              className={`min-h-11 font-semibold ${mode === "edit" ? "sm:col-span-2" : ""}`}
              disabled={isLoading || !initialValues.date || !initialValues.title}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {mode === "edit" ? "Salvar alterações" : "Adicionar ao roteiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
