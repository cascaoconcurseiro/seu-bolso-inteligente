import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers3,
  List,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Plus,
  Route,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  geocodeDestination,
  parseGoogleMapsUrl,
  PLACE_CATEGORIES,
  reverseGeocode,
  searchPlaces,
  type PlaceCategory,
  type PlaceSearchResult,
} from "@/services/overpassService";
import { TripRouteMap } from "./TripRouteMap";
import type { Trip } from "@/hooks/useTrips";
import type { TripSuggestion } from "@/services/aiAdvisorService";
import { getErrorMessage } from "./types";
import { PlannerDayRail, type PlannerDay } from "./planner/PlannerDayRail";
import { ItineraryStopCard } from "./planner/ItineraryStopCard";
import { groupItineraryByDay, moveItineraryItem } from "./planner/itineraryOrder";

interface ItineraryItem {
  id: string;
  trip_id: string;
  date: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  order_index: number;
  created_at: string;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
}

import { AITripSuggestions } from "./AITripSuggestions";

interface TripItineraryProps {
  trip: Trip;
}

export function TripItinerary({ trip }: TripItineraryProps) {
  const tripId = trip.id;
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ItineraryItem | null>(null);
  const [, setIsApplyingAI] = useState(false);

  // Form state
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [activeDate, setActiveDate] = useState(trip.start_date);
  const [mapScope, setMapScope] = useState<"day" | "all">("day");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [adjustLocations, setAdjustLocations] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [itineraryOrderVersion, setItineraryOrderVersion] = useState(trip.itinerary_order_version);

  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setItineraryOrderVersion(trip.itinerary_order_version);
  }, [trip.itinerary_order_version]);

  // Coordenada base da viagem — cacheada em trips.latitude/longitude para não
  // re-geocodificar trip.destination toda vez que a tela abre. Se ainda não
  // existir, geocodifica uma vez e persiste silenciosamente pra próxima carga.
  const [localDestCoords, setLocalDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const destCoords = useMemo(
    () =>
      trip.latitude !== null && trip.longitude !== null
        ? { lat: trip.latitude, lon: trip.longitude }
        : localDestCoords,
    [localDestCoords, trip.latitude, trip.longitude]
  );

  useEffect(() => {
    if (destCoords || !trip.destination) return;
    let cancelled = false;
    geocodeDestination(trip.destination).then((coords) => {
      if (!coords || cancelled) return;
      setLocalDestCoords(coords);
      supabase
        .from("trips")
        .update({ latitude: coords.lat, longitude: coords.lon })
        .eq("id", trip.id)
        .then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ["trips"] });
            queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [destCoords, trip.destination, trip.id, queryClient]);

  // Helper: extrai metadados embedados no description (mapsUrl, rating)
  const parseMeta = (
    desc: string | null
  ): { text: string; mapsUrl: string; rating: number | null } => {
    if (!desc) return { text: "", mapsUrl: "", rating: null };
    const match = desc.match(/<!--meta:(.+?)-->/);
    if (!match) return { text: desc, mapsUrl: "", rating: null };
    try {
      const meta = JSON.parse(match[1]);
      return {
        text: desc.replace(/<!--meta:.+?-->/, "").trim(),
        mapsUrl: meta.mapsUrl || "",
        rating: meta.rating || null,
      };
    } catch {
      return { text: desc.replace(/<!--meta:.+?-->/, "").trim(), mapsUrl: "", rating: null };
    }
  };

  // Fetch itinerary items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["trip-itinerary", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_itinerary")
        .select("*")
        .eq("trip_id", tripId)
        .order("date", { ascending: true })
        .order("order_index", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      return data as ItineraryItem[];
    },
  });

  // Create mutation
  const createItem = useMutation({
    mutationFn: async (item: Omit<ItineraryItem, "id" | "created_at">) => {
      const { data, error } = await supabase.from("trip_itinerary").insert(item).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Atividade adicionada");
      resetForm();
      setShowDialog(false);
    },
    onError: (error) => {
      toast.error("Erro ao adicionar", { description: error.message });
    },
  });

  // Update mutation
  const updateItem = useMutation({
    mutationFn: async ({ id, ...item }: Partial<ItineraryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("trip_itinerary")
        .update(item)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Atividade atualizada");
      resetForm();
      setShowDialog(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar", { description: error.message });
    },
  });

  // Move mutation (arrastar marcador no mapa — só atualiza coordenadas)
  const moveItem = useMutation({
    mutationFn: async ({
      id,
      latitude,
      longitude,
    }: {
      id: string;
      latitude: number;
      longitude: number;
    }) => {
      const { error } = await supabase
        .from("trip_itinerary")
        .update({ latitude, longitude })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Localização atualizada");
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.error("Erro ao mover", { description: error.message });
    },
  });

  const reorderItems = useMutation({
    mutationFn: async ({ nextItems }: { nextItems: ItineraryItem[]; announcement: string }) => {
      const { data, error } = await supabase.rpc("reorder_trip_itinerary_v1", {
        p_trip_id: tripId,
        p_expected_version: itineraryOrderVersion,
        p_items: nextItems.map(({ id, date: itemDate, order_index }) => ({
          id,
          date: itemDate,
          order_index,
        })),
      });

      if (error) throw error;
      return Number(data);
    },
    onMutate: async ({ nextItems }) => {
      setLiveMessage("Salvando nova ordem…");
      await queryClient.cancelQueries({ queryKey: ["trip-itinerary", tripId] });
      const previousItems = queryClient.getQueryData<ItineraryItem[]>(["trip-itinerary", tripId]);
      queryClient.setQueryData(["trip-itinerary", tripId], nextItems);
      return { previousItems };
    },
    onSuccess: (newVersion, { announcement }) => {
      setItineraryOrderVersion(newVersion);
      setLiveMessage(announcement);
      queryClient.setQueryData<Trip | undefined>(["trip", tripId], (cachedTrip) =>
        cachedTrip ? { ...cachedTrip, itinerary_order_version: newVersion } : cachedTrip
      );
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Roteiro atualizado");
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["trip-itinerary", tripId], context.previousItems);
      }
      const errorCode = (error as { code?: string }).code;
      if (errorCode === "40001") {
        setLiveMessage("O roteiro mudou em outro dispositivo. A ordem mais recente foi carregada.");
        toast.error("O roteiro foi atualizado por outra pessoa", {
          description:
            "Recarregamos a ordem mais recente. Repita o movimento se ainda for preciso.",
        });
      } else {
        setLiveMessage("Não foi possível salvar a nova ordem. A alteração foi desfeita.");
        toast.error("Não foi possível reordenar", {
          description: getErrorMessage(error, "A alteração foi desfeita."),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });

  // Delete mutation
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_itinerary").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Atividade removida");
      setDeletingItem(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover", { description: error.message });
    },
  });

  const handleApplyAISuggestions = async (suggestions: TripSuggestion[]) => {
    setIsApplyingAI(true);
    const startDate = trip.start_date || dateFns.format(new Date(), "yyyy-MM-dd");

    try {
      const firstDayItemCount = items.filter((item) => item.date === startDate).length;
      const suggestionsToInsert = suggestions.map((s, idx) => {
        // Embed mapsUrl and rating as JSON metadata in description
        const metadata = JSON.stringify({ mapsUrl: s.mapsUrl || "", rating: s.rating || null });
        const fullDescription = s.description
          ? `${s.description}\n<!--meta:${metadata}-->`
          : `<!--meta:${metadata}-->`;

        const matchedCategory = PLACE_CATEGORIES.find((c) => c.id === s.category)?.id ?? null;

        return {
          trip_id: tripId,
          date: startDate,
          title: s.title || "Atividade sugerida",
          description: fullDescription,
          location: s.location || null,
          start_time: null,
          end_time: null,
          order_index: firstDayItemCount + idx,
          maps_url: s.mapsUrl || null,
          latitude: s.lat ?? null,
          longitude: s.lon ?? null,
          category: matchedCategory,
        };
      });

      const { error } = await supabase.from("trip_itinerary").insert(suggestionsToInsert);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Sucesso", {
        description: `${suggestions.length} atividades adicionadas no 1º dia.`,
      });
    } catch (error: unknown) {
      toast.error("Erro ao salvar", {
        description: getErrorMessage(error, "Não foi possível salvar as sugestões"),
      });
    } finally {
      setIsApplyingAI(false);
    }
  };

  // Toque no mapa → abre dialog de nova atividade com pin já posicionado
  const handleMapPick = async (pick: { lat: number; lon: number }) => {
    setEditingItem(null);
    resetForm();
    setDate(activeDate || trip.start_date || dateFns.format(new Date(), "yyyy-MM-dd"));
    setLatitude(pick.lat);
    setLongitude(pick.lon);
    setShowDialog(true);
    // Descobre o nome do lugar em segundo plano
    const place = await reverseGeocode(pick.lat, pick.lon);
    if (place) {
      setLocation(place.name);
      setTitle((current) => current || place.name);
    }
  };

  const handleMarkerMove = (id: string, lat: number, lon: number) => {
    moveItem.mutate({ id, latitude: lat, longitude: lon });
  };

  // Rota do dia no Google Maps (multi-paradas) — é isso que "leva você"
  const buildDayNavUrl = (dayItems: ItineraryItem[]): string | null => {
    const points = dayItems
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => `${i.latitude},${i.longitude}`);
    if (points.length < 2) return null;
    const origin = points[0];
    const destination = points[points.length - 1];
    // Google aceita no máx. 9 waypoints intermediários
    const waypoints = points.slice(1, -1).slice(0, 9).join("|");
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    if (waypoints) url.searchParams.set("waypoints", waypoints);
    return url.toString();
  };

  const resetForm = () => {
    setDate("");
    setTitle("");
    setDescription("");
    setLocation("");
    setStartTime("");
    setEndTime("");
    setMapsUrl("");
    setLatitude(null);
    setLongitude(null);
    setCategory(null);
  };

  const handleOpenDialog = (item?: ItineraryItem) => {
    if (item) {
      setEditingItem(item);
      setDate(item.date);
      setTitle(item.title);
      const meta = parseMeta(item.description);
      setDescription(meta.text);
      setLocation(item.location || "");
      setStartTime(item.start_time || "");
      setEndTime(item.end_time || "");
      setMapsUrl(item.maps_url || meta.mapsUrl || "");
      setLatitude(item.latitude);
      setLongitude(item.longitude);
      setCategory((item.category as PlaceCategory) || null);
    } else {
      setEditingItem(null);
      resetForm();
      setDate(activeDate || trip.start_date);
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!date || !title) return;

    let resolvedLatitude = latitude;
    let resolvedLongitude = longitude;
    if (location && (resolvedLatitude === null || resolvedLongitude === null)) {
      setIsGeocoding(true);
      const coordinates = await geocodeDestination(
        `${location}${trip.destination ? `, ${trip.destination}` : ""}`
      );
      setIsGeocoding(false);
      resolvedLatitude = coordinates?.lat ?? null;
      resolvedLongitude = coordinates?.lon ?? null;
    }

    const contentData = {
      title,
      description: description || null,
      location: location || null,
      start_time: startTime || null,
      end_time: endTime || null,
      maps_url: mapsUrl || null,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      category,
    };

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...contentData });
    } else {
      const dayItemCount = items.filter((item) => item.date === date).length;
      createItem.mutate({
        trip_id: tripId,
        date,
        order_index: dayItemCount,
        ...contentData,
      });
    }
  };

  const groupedItems = useMemo(() => groupItineraryByDay(items), [items]);
  const plannerDays = useMemo<PlannerDay[]>(() => {
    const dates = new Set(items.map((item) => item.date));
    const tripStart = dateFns.parseISO(trip.start_date);
    const tripEnd = dateFns.parseISO(trip.end_date);

    if (
      dateFns.isValid(tripStart) &&
      dateFns.isValid(tripEnd) &&
      !dateFns.isBefore(tripEnd, tripStart)
    ) {
      dateFns.eachDayOfInterval({ start: tripStart, end: tripEnd }).forEach((day) => {
        dates.add(dateFns.format(day, "yyyy-MM-dd"));
      });
    }

    return [...dates].sort().map((dayDate) => ({
      date: dayDate,
      label: dateFns.format(dateFns.parseISO(dayDate), "EEE, dd MMM", { locale: ptBR }),
      itemCount: groupedItems[dayDate]?.length ?? 0,
    }));
  }, [groupedItems, items, trip.end_date, trip.start_date]);

  useEffect(() => {
    if (plannerDays.length === 0) return;
    if (!plannerDays.some((day) => day.date === activeDate)) {
      setActiveDate(plannerDays[0].date);
    }
  }, [activeDate, plannerDays]);

  const activeItems = groupedItems[activeDate] ?? [];
  const activeDayIndex = plannerDays.findIndex((day) => day.date === activeDate);
  const mapItems = mapScope === "all" ? items : activeItems;
  const activeDayNavUrl = buildDayNavUrl(activeItems);
  const dayOptions = plannerDays.map(({ date: dayDate, label }) => ({
    date: dayDate,
    label,
  }));

  const persistMove = (itemId: string, targetDate: string, requestedIndex: number) => {
    const targetLength = items.filter(
      (item) => item.date === targetDate && item.id !== itemId
    ).length;
    const targetIndex = Math.min(requestedIndex, targetLength);
    const currentItem = items.find((item) => item.id === itemId);
    if (!currentItem) return;

    const nextItems = moveItineraryItem(items, itemId, targetDate, targetIndex) as ItineraryItem[];
    const movedItem = nextItems.find((item) => item.id === itemId);
    if (
      !movedItem ||
      (movedItem.date === currentItem.date && movedItem.order_index === currentItem.order_index)
    ) {
      return;
    }

    setActiveDate(targetDate);
    setFocusedItemId(itemId);
    const dayNumber = plannerDays.findIndex((day) => day.date === targetDate) + 1;
    const targetDayCount = nextItems.filter((item) => item.date === targetDate).length;
    reorderItems.mutate({
      nextItems,
      announcement: `${currentItem.title} movido para o dia ${dayNumber}, posição ${
        movedItem.order_index + 1
      } de ${targetDayCount}.`,
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const targetIndex = activeItems.findIndex((item) => item.id === over.id);
    if (targetIndex < 0) return;
    persistMove(String(active.id), activeDate, targetIndex);
  };

  return (
    <div className="space-y-4">
      <a
        href="#itinerary-stops"
        className="sr-only rounded-md bg-background p-3 text-sm font-semibold focus:not-sr-only focus:absolute focus:z-[2000]"
      >
        Pular mapa e ir para o roteiro
      </a>

      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Planejar</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {trip.destination || trip.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "parada" : "paradas"} em {plannerDays.length}{" "}
            {plannerDays.length === 1 ? "dia" : "dias"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeDayNavUrl && (
            <Button asChild variant="outline" className="min-h-11">
              <a href={activeDayNavUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-2 h-4 w-4" aria-hidden="true" />
                Navegar dia
              </a>
            </Button>
          )}
          <Button className="min-h-11" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Adicionar parada
          </Button>
        </div>
      </div>

      <div
        className="grid gap-4 xl:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)_minmax(18rem,20rem)]"
        aria-busy={isLoading || reorderItems.isPending}
      >
        <aside
          id="itinerary-stops"
          className={`${mobileView === "map" ? "hidden xl:block" : "block"} min-w-0 space-y-4 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1`}
          aria-label="Roteiro do dia"
        >
          <PlannerDayRail days={plannerDays} activeDate={activeDate} onSelect={setActiveDate} />

          <section aria-labelledby="active-day-title">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Dia {Math.max(1, plannerDays.findIndex((day) => day.date === activeDate) + 1)}
                </p>
                <h3
                  id="active-day-title"
                  className="text-sm font-semibold capitalize text-foreground"
                >
                  {activeDate
                    ? dateFns.format(dateFns.parseISO(activeDate), "EEEE, dd 'de' MMMM", {
                        locale: ptBR,
                      })
                    : "Escolha um dia"}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {activeItems.length} {activeItems.length === 1 ? "parada" : "paradas"}
              </span>
            </div>

            {activeItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <Route className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
                <p className="mt-3 font-semibold text-foreground">Nenhuma parada neste dia</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Adicione um lugar ou mova uma parada de outro dia.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 min-h-11"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Adicionar parada
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol className="space-y-2">
                    {activeItems.map((item, index) => {
                      const meta = parseMeta(item.description);
                      return (
                        <ItineraryStopCard
                          key={item.id}
                          item={item}
                          position={index}
                          itemCount={activeItems.length}
                          destination={trip.destination}
                          description={meta.text}
                          rating={meta.rating}
                          isFocused={focusedItemId === item.id}
                          dayOptions={dayOptions}
                          disabled={reorderItems.isPending}
                          onFocus={() => {
                            setFocusedItemId(focusedItemId === item.id ? null : item.id);
                            setMobileView("map");
                          }}
                          onEdit={() => handleOpenDialog(item)}
                          onDelete={() => setDeletingItem(item)}
                          onMove={(targetDate, targetIndex) =>
                            persistMove(item.id, targetDate, targetIndex)
                          }
                        />
                      );
                    })}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </aside>

        <main
          className={`${mobileView === "list" ? "hidden xl:block" : "block"} min-w-0 space-y-3`}
          aria-label="Mapa e rota do dia"
        >
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-1 py-1 xl:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              disabled={activeDayIndex <= 0}
              onClick={() => setActiveDate(plannerDays[activeDayIndex - 1]?.date ?? activeDate)}
              aria-label="Ver dia anterior"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="min-w-0 px-2 text-center">
              <p className="text-xs text-muted-foreground">
                Dia {Math.max(1, activeDayIndex + 1)} de {plannerDays.length}
              </p>
              <p className="truncate text-sm font-semibold capitalize text-foreground">
                {activeDate
                  ? dateFns.format(dateFns.parseISO(activeDate), "EEE, dd MMM", { locale: ptBR })
                  : "Escolha um dia"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              disabled={activeDayIndex < 0 || activeDayIndex >= plannerDays.length - 1}
              onClick={() => setActiveDate(plannerDays[activeDayIndex + 1]?.date ?? activeDate)}
              aria-label="Ver próximo dia"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setMapScope("day")}
                  aria-pressed={mapScope === "day"}
                  className={`min-h-11 rounded-lg px-3 text-xs font-semibold ${
                    mapScope === "day"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Dia atual
                </button>
                <button
                  type="button"
                  onClick={() => setMapScope("all")}
                  aria-pressed={mapScope === "all"}
                  className={`min-h-11 rounded-lg px-3 text-xs font-semibold ${
                    mapScope === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Todos os dias
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAdjustLocations((current) => !current)}
                aria-pressed={adjustLocations}
                className={`min-h-11 rounded-lg px-3 text-xs font-semibold ${
                  adjustLocations
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <LocateFixed className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                {adjustLocations ? "Concluir ajustes" : "Ajustar pins"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {adjustLocations
                ? "Arraste um pin; também é possível corrigir o local editando a parada."
                : mapScope === "day"
                  ? "Pins numerados na ordem do dia"
                  : "Visão geral da viagem"}
            </p>
          </div>

          {destCoords || mapItems.some((item) => item.latitude !== null) ? (
            <TripRouteMap
              items={mapItems}
              fallbackCenter={destCoords ?? null}
              onMapPick={handleMapPick}
              onMarkerMove={adjustLocations ? handleMarkerMove : undefined}
              focusedId={focusedItemId}
              activeDateLabel={
                activeDate
                  ? dateFns.format(dateFns.parseISO(activeDate), "dd 'de' MMMM", { locale: ptBR })
                  : undefined
              }
            />
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <div>
                <MapPin className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                <p className="mt-3 font-semibold text-foreground">Seu roteiro começa aqui</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Busque um lugar ou adicione manualmente a primeira parada.
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className="hidden min-w-0 space-y-4 xl:block" aria-label="Adicionar lugares">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">Lugares</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Busque perto de {trip.destination || "seu destino"} e já salve o pin no dia ativo.
            </p>
            <Button className="mt-4 min-h-11 w-full" onClick={() => handleOpenDialog()}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Buscar lugares
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">Sugestões para o roteiro</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Gere uma primeira versão e ajuste a ordem arrastando ou usando os controles dos
              cartões.
            </p>
            <div className="mt-4">
              <AITripSuggestions
                type="itinerary"
                destination={trip.destination || trip.name}
                onApply={handleApplyAISuggestions}
              />
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-3 bottom-20 z-[1100] flex rounded-2xl border border-border bg-background/95 p-1 shadow-xl backdrop-blur xl:hidden">
        <button
          type="button"
          onClick={() => setMobileView("map")}
          aria-pressed={mobileView === "map"}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
            mobileView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Map className="h-4 w-4" aria-hidden="true" />
          Mapa
        </button>
        <button
          type="button"
          onClick={() => setMobileView("list")}
          aria-pressed={mobileView === "list"}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
            mobileView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <List className="h-4 w-4" aria-hidden="true" />
          Roteiro ({activeItems.length})
        </button>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>

      {/* Dialog */}
      <ItineraryDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isEditing={!!editingItem}
        dateLocked={!!editingItem}
        isLoading={createItem.isPending || updateItem.isPending || isGeocoding}
        date={date}
        setDate={setDate}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        location={location}
        setLocation={setLocation}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        mapsUrl={mapsUrl}
        setMapsUrl={setMapsUrl}
        hasCoords={latitude !== null && longitude !== null}
        onCoordsChange={(c) => {
          setLatitude(c?.lat ?? null);
          setLongitude(c?.lon ?? null);
        }}
        searchNear={destCoords ?? null}
        category={category}
        setCategory={setCategory}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-2xl !rounded-b-none sm:!rounded-b-2xl p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-2 bg-muted rounded-full" />
          </div>
          <AlertDialogHeader className="px-6 pt-2 pb-2 text-left">
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 py-4 flex gap-3 justify-end border-t border-border/50">
            <AlertDialogCancel className="rounded-xl h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteItem.mutate(deletingItem.id)}
              className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dialog component
function ItineraryDialog({
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
  onSubmit,
}: {
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
  onSubmit: () => void;
}) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Autocomplete de lugares (Photon/OSM) — só busca quando o usuário digita
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  useEffect(() => {
    if (!open) {
      setPlaceQuery("");
      setPlaceResults([]);
      return;
    }
    const query = placeQuery.trim();
    if (query.length < 3) {
      setPlaceResults([]);
      return;
    }
    setIsSearchingPlaces(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaces(query, searchNear ?? undefined, category ?? undefined);
      setPlaceResults(results);
      setIsSearchingPlaces(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [placeQuery, open, searchNear, category]);

  const handlePickPlace = (place: PlaceSearchResult) => {
    setLocation(place.name);
    onCoordsChange({ lat: place.lat, lon: place.lon });
    setPlaceQuery("");
    setPlaceResults([]);
  };

  const openMapsSearch = () => {
    const query = encodeURIComponent(location || title);
    const url = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-3xl !rounded-b-none sm:!rounded-3xl transition-transform duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl">
        <div className="w-full flex justify-center pt-4 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de atividade do roteiro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="itinerary-date">Data *</Label>
            <Input
              id="itinerary-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={dateLocked}
              className="h-11"
            />
            {dateLocked && (
              <p className="text-xs text-muted-foreground">
                Para trocar o dia, use “Mover para outro dia” no cartão.
              </p>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="itinerary-title">Título *</Label>
            <Input
              id="itinerary-title"
              placeholder="Ex: Visita ao museu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="itinerary-start-time">Horário início</Label>
              <Input
                id="itinerary-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itinerary-end-time">Horário fim</Label>
              <Input
                id="itinerary-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Local + busca com autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="itinerary-location">Local</Label>

            {/* Categoria — filtra a busca e define a cor do pin no mapa */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria do lugar">
              {PLACE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(isSelected ? null : cat.id)}
                    aria-pressed={isSelected}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      isSelected ? "text-white" : "border-border text-foreground hover:bg-accent/50"
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

            <div className="relative">
              <div className="flex gap-2">
                <Input
                  id="itinerary-location"
                  placeholder="Ex: Museu do Louvre"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setPlaceQuery(e.target.value);
                    onCoordsChange(null);
                  }}
                  className="h-11"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={placeResults.length > 0 || isSearchingPlaces}
                  aria-controls="itinerary-place-results"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={openMapsSearch}
                  disabled={!location && !title}
                  aria-label="Buscar local no Maps"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {(placeResults.length > 0 || isSearchingPlaces) && (
                <div
                  id="itinerary-place-results"
                  role="listbox"
                  aria-label="Resultados de lugares"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg"
                >
                  {isSearchingPlaces && placeResults.length === 0 && (
                    <p className="px-3 py-2.5 text-sm text-muted-foreground">Buscando lugares…</p>
                  )}
                  {placeResults.map((place, idx) => (
                    <button
                      key={`${place.lat}-${place.lon}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                      onClick={() => handlePickPlace(place)}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">
                          {place.name}
                        </span>
                        {place.address && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {place.address}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {hasCoords ? (
              <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <MapPin className="h-3 w-3" />
                Pin fixado no mapa
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Digite para buscar e fixar o lugar no mapa do roteiro.
              </p>
            )}
          </div>

          {/* Link do Maps */}
          <div className="space-y-2">
            <Label htmlFor="itinerary-maps-url" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Link do Google Maps
            </Label>
            <div className="flex gap-2">
              <Input
                id="itinerary-maps-url"
                placeholder="Cole o link copiado do Maps…"
                value={mapsUrl}
                onChange={(e) => {
                  const value = e.target.value;
                  setMapsUrl(value);
                  const coords = parseGoogleMapsUrl(value);
                  if (coords) onCoordsChange(coords);
                }}
                className="h-11 text-sm"
              />
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 shrink-0 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
                  aria-label="Abrir link do Google Maps"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {parseGoogleMapsUrl(mapsUrl)
                ? "Coordenadas do link detectadas — o pin vai aparecer no mapa do roteiro."
                : "Toque em 🔍 para buscar, copie o link no Maps e cole aqui."}
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="itinerary-description">Descrição</Label>
            <Textarea
              id="itinerary-description"
              placeholder="Detalhes da atividade…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2 pb-2">
            <Button
              type="button"
              variant="outline"
              className="w-1/2 h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="w-1/2 h-11 font-bold"
              onClick={onSubmit}
              disabled={isLoading || !date || !title}
            >
              {isLoading ? "Salvando…" : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
