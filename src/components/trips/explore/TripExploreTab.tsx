import { addDays, format, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Compass, Heart, List, Loader2, Map as MapIcon, MapPin, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { searchPlaces, type PlaceCategory, type PlaceSearchResult } from "@/services/overpassService";
import type { Trip } from "@/hooks/useTrips";
import { MORE_PLACE_PRESETS, QUICK_PLACE_PRESETS, type PlaceDiscoveryPreset } from "../planner/placeDiscoveryCatalog";
import { TripExploreMap } from "./TripExploreMap";

interface TripExploreTabProps {
  trip: Trip;
}

type SearchStatus = "idle" | "loading" | "empty" | "error";

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function buildOsmUrl(lat: number, lon: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

function getTripDays(startDate: string, endDate: string) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days: Date[] = [];
  let current = start;

  while (!isAfter(current, end) && days.length < 120) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export function TripExploreTab({ trip }: TripExploreTabProps) {
  const fallbackCenter = useMemo(
    () => ({ lat: trip.latitude ?? -23.5505, lon: trip.longitude ?? -46.6333 }),
    [trip.latitude, trip.longitude]
  );
  const [center, setCenter] = useState(fallbackCenter);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<PlaceDiscoveryPreset | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [mobileMode, setMobileMode] = useState<"map" | "list">("map");
  const [activeDate, setActiveDate] = useState(trip.start_date);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => setCenter(fallbackCenter), [fallbackCenter]);

  const days = useMemo(() => getTripDays(trip.start_date, trip.end_date), [trip.start_date, trip.end_date]);
  const selected = selectedIndex === null ? null : places[selectedIndex];

  const effectiveQuery = query.trim().length >= 2 ? query.trim() : preset?.query ?? "";
  const category = preset?.category ?? undefined;

  useEffect(() => {
    if (!effectiveQuery) {
      setPlaces([]);
      setSelectedIndex(null);
      setStatus("idle");
      return;
    }

    const current = ++requestId.current;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchPlaces(effectiveQuery, center, category, trip.destination || trip.name);
        if (current !== requestId.current) return;
        const sorted = [...results].sort(
          (left, right) =>
            distanceKm(center, { lat: left.lat, lon: left.lon }) -
            distanceKm(center, { lat: right.lat, lon: right.lon })
        );
        setPlaces(sorted);
        setSelectedIndex(sorted.length ? 0 : null);
        setStatus(sorted.length ? "idle" : "empty");
      } catch {
        if (current !== requestId.current) return;
        setPlaces([]);
        setSelectedIndex(null);
        setStatus("error");
      }
    }, 420);

    return () => window.clearTimeout(timer);
  }, [category, center, effectiveQuery, trip.destination, trip.name]);

  const choosePreset = (item: PlaceDiscoveryPreset) => {
    setPreset((current) => (current?.id === item.id ? null : item));
    setQuery("");
    setSelectedIndex(null);
  };

  const savePlace = async (place: PlaceSearchResult) => {
    const key = `${place.lat}-${place.lon}-save`;
    setSavingKey(key);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const osmUrl = buildOsmUrl(place.lat, place.lon);
      const { error } = await supabase.from("trip_places").insert({
        trip_id: trip.id,
        created_by: auth.user.id,
        name: place.name,
        description: null,
        address: place.address || null,
        maps_url: osmUrl,
        latitude: place.lat,
        longitude: place.lon,
        category: place.category ?? category ?? null,
        source_type: "osm",
        source_url: osmUrl,
        source_attribution: "© OpenStreetMap contributors",
        status: "idea",
      });
      if (error) throw error;
      toast.success("Lugar salvo nas ideias");
    } catch (error) {
      toast.error("Não foi possível salvar", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const addToItinerary = async (place: PlaceSearchResult) => {
    const key = `${place.lat}-${place.lon}-add`;
    setSavingKey(key);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const osmUrl = buildOsmUrl(place.lat, place.lon);
      const resolvedCategory = (place.category ?? category ?? null) as PlaceCategory | null;
      const { data: savedPlace, error: placeError } = await supabase
        .from("trip_places")
        .insert({
          trip_id: trip.id,
          created_by: auth.user.id,
          name: place.name,
          description: null,
          address: place.address || null,
          maps_url: osmUrl,
          latitude: place.lat,
          longitude: place.lon,
          category: resolvedCategory,
          source_type: "osm",
          source_url: osmUrl,
          source_attribution: "© OpenStreetMap contributors",
          status: "want",
        })
        .select("id")
        .single();
      if (placeError) throw placeError;

      const { count, error: countError } = await supabase
        .from("trip_itinerary")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", trip.id)
        .eq("date", activeDate);
      if (countError) throw countError;

      const { error: itineraryError } = await supabase.from("trip_itinerary").insert({
        trip_id: trip.id,
        date: activeDate,
        title: place.name,
        description: null,
        location: place.address || null,
        start_time: null,
        end_time: null,
        order_index: count ?? 0,
        maps_url: osmUrl,
        latitude: place.lat,
        longitude: place.lon,
        category: resolvedCategory,
        place_id: savedPlace.id,
        reservation_id: null,
        duration_minutes: null,
        transport_mode: null,
      });
      if (itineraryError) throw itineraryError;
      toast.success("Lugar adicionado ao roteiro", {
        description: format(parseISO(activeDate), "dd 'de' MMMM", { locale: ptBR }),
      });
    } catch (error) {
      toast.error("Não foi possível adicionar", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="space-y-4" aria-label="Explorar lugares">
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Explorar {trip.destination || trip.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Encontre serviços e lugares usando dados gratuitos do OpenStreetMap.
            </p>
          </div>
        </div>

        <div className="sticky top-0 z-20 -mx-1 mt-4 bg-card/95 px-1 pb-3 pt-1 backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPreset(null);
              }}
              placeholder="Farmácia, mercado, academia, museu…"
              className="h-12 rounded-2xl pl-11 pr-11"
              aria-label="Pesquisar qualquer lugar ou serviço"
            />
            {status === "loading" && (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {QUICK_PLACE_PRESETS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={preset?.id === item.id ? "default" : "outline"}
              className="shrink-0 rounded-full"
              onClick={() => choosePreset(item)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            type="button"
            variant={showMore ? "secondary" : "outline"}
            className="shrink-0 rounded-full"
            onClick={() => setShowMore((value) => !value)}
          >
            Mais
          </Button>
        </div>

        {showMore && (
          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-muted/40 p-3">
            {MORE_PLACE_PRESETS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={preset?.id === item.id ? "default" : "ghost"}
                className="rounded-full"
                onClick={() => choosePreset(item)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 md:hidden">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <Button size="sm" variant={mobileMode === "map" ? "secondary" : "ghost"} onClick={() => setMobileMode("map")}>
            <MapIcon className="mr-2 h-4 w-4" /> Mapa
          </Button>
          <Button size="sm" variant={mobileMode === "list" ? "secondary" : "ghost"} onClick={() => setMobileMode("list")}>
            <List className="mr-2 h-4 w-4" /> Lista
          </Button>
        </div>
        <select
          value={activeDate}
          onChange={(event) => setActiveDate(event.target.value)}
          className="h-10 max-w-[170px] rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="Dia para adicionar ao roteiro"
        >
          {days.map((day) => {
            const value = format(day, "yyyy-MM-dd");
            return <option key={value} value={value}>{format(day, "dd MMM, EEE", { locale: ptBR })}</option>;
          })}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <div className={mobileMode === "list" ? "hidden md:block" : "block"}>
          <TripExploreMap center={center} places={places} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </div>

        <div className={mobileMode === "map" ? "hidden md:flex" : "flex min-h-[390px] flex-col rounded-2xl border border-border bg-card"}>
          <div className="hidden items-center justify-between border-b border-border px-4 py-3 md:flex">
            <div>
              <p className="font-semibold">Resultados</p>
              <p className="text-xs text-muted-foreground">{places.length ? `${places.length} encontrados` : "Faça uma busca"}</p>
            </div>
            <select
              value={activeDate}
              onChange={(event) => setActiveDate(event.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              aria-label="Dia para adicionar ao roteiro"
            >
              {days.map((day) => {
                const value = format(day, "yyyy-MM-dd");
                return <option key={value} value={value}>{format(day, "dd MMM", { locale: ptBR })}</option>;
              })}
            </select>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {status === "idle" && !effectiveQuery && (
              <div className="grid min-h-[300px] place-items-center px-6 text-center">
                <div>
                  <MapPin className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 font-semibold">O que você precisa por perto?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pesquise livremente ou escolha uma categoria.</p>
                </div>
              </div>
            )}
            {status === "loading" && (
              <div className="grid min-h-[300px] place-items-center text-sm text-muted-foreground">
                <Loader2 className="mb-3 h-6 w-6 animate-spin" /> Buscando lugares…
              </div>
            )}
            {status === "empty" && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lugar encontrado nesta região.</div>}
            {status === "error" && <div className="p-8 text-center text-sm text-destructive">A busca gratuita está indisponível agora. Tente novamente.</div>}

            {places.map((place, index) => {
              const active = selectedIndex === index;
              const km = distanceKm(center, { lat: place.lat, lon: place.lon });
              const saveKey = `${place.lat}-${place.lon}-save`;
              const addKey = `${place.lat}-${place.lon}-add`;
              return (
                <article
                  key={`${place.name}-${place.lat}-${place.lon}`}
                  className={`rounded-2xl border p-3 transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/35"}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="flex gap-3">
                    <img
                      src={place.imageUrl}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl bg-muted object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{place.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{place.address || "Endereço não informado"}</p>
                      <p className="mt-2 text-xs font-medium text-primary">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} do centro</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingKey !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void savePlace(place);
                      }}
                    >
                      {savingKey === saveKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingKey !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void addToItinerary(place);
                      }}
                    >
                      {savingKey === addKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Roteiro
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {selected && mobileMode === "map" && (
        <div className="sticky bottom-3 z-30 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{selected.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{selected.address}</p>
            </div>
            <Button size="sm" onClick={() => void addToItinerary(selected)} disabled={savingKey !== null}>
              <Plus className="mr-2 h-4 w-4" /> Roteiro
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
