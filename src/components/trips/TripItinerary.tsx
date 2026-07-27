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
  Hotel,
  Layers3,
  MapPin,
  Navigation as NavigationIcon,
  Pencil,
  Plus,
  Route,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsUrl,
  geocodeDestination,
  isSafeGoogleMapsUrl,
  parseGoogleMapsPlaceName,
  parseGoogleMapsUrl,
  PLACE_CATEGORIES,
  reverseGeocode,
  searchPlaces,
  type PlaceCategory,
  type PlaceSearchResult,
} from "@/services/overpassService";
import type { Trip } from "@/hooks/useTrips";
import type { TripSuggestion } from "@/services/aiAdvisorService";
import { getErrorMessage } from "./types";
import type { Database } from "@/integrations/supabase/types";
import type { PlannerDay } from "./planner/PlannerDayRail";
import { ItineraryDaysRail } from "./itinerary/ItineraryDaysRail";
import { ItineraryStopCard } from "./itinerary/ItineraryStopCard";
import { parseStopMeta } from "./itinerary/types";
import { groupItineraryByDay, moveItineraryItem } from "./planner/itineraryOrder";
import { TripReservationsPanel } from "./planner/TripReservationsPanel";
import { PlaceDiscoveryDialog, type DiscoveredPlace } from "./planner/PlaceDiscoveryDialog";
import { fetchWeatherForecast } from "@/services/weatherService";
import { ImportPlacesDialog } from "./planner/ImportPlacesDialog";
import { RouteOptimizerDialog } from "./planner/RouteOptimizerDialog";
import { ItineraryHero } from "./itinerary/ItineraryHero";
import { exportTripToPdf } from "@/utils/tripPdfExporter";
import type { ParsedPlace } from "@/utils/gpxKmlParser";

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
  place_id: string | null;
  reservation_id: string | null;
  duration_minutes: number | null;
  transport_mode: string | null;
}

type TripPlace = Database["public"]["Tables"]["trip_places"]["Row"];

import { AITripSuggestions } from "./AITripSuggestions";
import { LodgingDialog, type LodgingSaveData } from "./itinerary/LodgingDialog";

interface TripItineraryProps {
  trip: Trip;
}

export function TripItinerary({ trip }: TripItineraryProps) {
  const tripId = trip.id;
  const [showDialog, setShowDialog] = useState(false);
  const [showLodgingDialog, setShowLodgingDialog] = useState(false);
  const [showPlaceDialog, setShowPlaceDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showOptimizerDialog, setShowOptimizerDialog] = useState(false);
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
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [activeDate, setActiveDate] = useState(trip.start_date);
  const [liveMessage, setLiveMessage] = useState("");
  const [itineraryOrderVersion, setItineraryOrderVersion] = useState(trip.itinerary_order_version);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [editingSavedPlace, setEditingSavedPlace] = useState<{
    id: string;
    name: string;
    address: string;
    notes: string;
  } | null>(null);
  const [deletingSavedPlace, setDeletingSavedPlace] = useState<{
    id: string;
    name: string;
  } | null>(null);

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
  const [localDestCoords, setLocalDestCoords] = useState<{ lat: number; lon: number } | null>(
    trip.latitude !== null && trip.longitude !== null
      ? { lat: trip.latitude, lon: trip.longitude }
      : null
  );

  const destCoords = useMemo(
    () => localDestCoords || (trip.latitude !== null && trip.longitude !== null ? { lat: trip.latitude, lon: trip.longitude } : null),
    [localDestCoords, trip.latitude, trip.longitude]
  );

  useEffect(() => {
    const destName = trip.destination || trip.name;
    if (!destName) return;
    let cancelled = false;

    const res = geocodeDestination(destName);
    if (!res || typeof res.then !== "function") return;

    res.then((coords) => {
      if (!coords || cancelled) return;

      const currentLat = trip.latitude;
      const currentLon = trip.longitude;
      const isDivergent =
        currentLat === null ||
        currentLon === null ||
        Math.abs(currentLat - coords.lat) > 0.05 ||
        Math.abs(currentLon - coords.lon) > 0.05;

      if (isDivergent) {
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
      } else if (!localDestCoords) {
        setLocalDestCoords(coords);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trip.destination, trip.name, trip.id, trip.latitude, trip.longitude, queryClient, localDestCoords]);

  // Helper: calcula distância entre duas coordenadas (Haversine)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
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
  };

  // Helper: estimativa de tempo e distância entre duas paradas consecutivas
  const getTravelEstimate = (itemA: ItineraryItem, itemB: ItineraryItem): string | null => {
    if (
      itemA.latitude === null ||
      itemA.longitude === null ||
      itemB.latitude === null ||
      itemB.longitude === null
    ) {
      return null;
    }
    const dist = calculateDistanceKm(
      Number(itemA.latitude),
      Number(itemA.longitude),
      Number(itemB.latitude),
      Number(itemB.longitude)
    );
    if (dist < 0.05) return null;

    if (dist <= 1.5) {
      const walkMin = Math.max(3, Math.round(dist * 12));
      const meters = Math.round(dist * 1000);
      return `🚶 ${walkMin} min a pé (${meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`})`;
    } else {
      const driveMin = Math.max(5, Math.round(dist * 2.5));
      return `🚗 ${driveMin} min de carro (${dist.toFixed(1)} km)`;
    }
  };

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

  const { data: savedPlaces = [], isLoading: arePlacesLoading } = useQuery({
    queryKey: ["trip-places", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_places")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
      queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
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

  // Delete saved place mutation
  const deleteSavedPlace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
      toast.success("Lugar removido dos salvos");
      setDeletingSavedPlace(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover lugar", { description: error.message });
    },
  });

  // Update saved place mutation
  const updateSavedPlace = useMutation({
    mutationFn: async ({
      id,
      name,
      address,
      notes,
    }: {
      id: string;
      name: string;
      address: string | null;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from("trip_places")
        .update({ name, address, notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
      toast.success("Lugar salvo atualizado");
      setEditingSavedPlace(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar lugar", { description: error.message });
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
    setSelectedPlaceId(null);
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

  const handleOpenSavedPlace = (place: TripPlace) => {
    setEditingItem(null);
    resetForm();
    setSelectedPlaceId(place.id);
    setDate(activeDate || trip.start_date);
    setTitle(place.name);
    setDescription(place.description || "");
    setLocation(place.address || "");
    setMapsUrl(place.maps_url || "");
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setCategory((place.category as PlaceCategory) || null);
    setShowDialog(true);
  };

  const fillFormFromDiscoveredPlace = (place: DiscoveredPlace) => {
    resetForm();
    setDate(activeDate || trip.start_date);
    setTitle(place.name);
    setLocation(place.address);
    setMapsUrl(place.mapsUrl);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setCategory(place.category);
  };

  const handleAddDiscoveredPlaceToDay = (place: DiscoveredPlace) => {
    fillFormFromDiscoveredPlace(place);
    setShowPlaceDialog(false);
    setShowDialog(true);
  };

  const handleSaveDiscoveredPlace = async (place: DiscoveredPlace) => {
    setIsSavingPlace(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Entre novamente para salvar o lugar");
        return;
      }
      const { error } = await supabase.from("trip_places").insert({
        trip_id: tripId,
        created_by: user.id,
        name: place.name,
        description: null,
        address: place.address,
        maps_url: place.mapsUrl,
        latitude: place.latitude,
        longitude: place.longitude,
        category: place.category,
        source_type: "osm",
        source_url: place.mapsUrl,
        source_attribution: "© OpenStreetMap contributors",
        status: "idea",
      });
      if (error) {
        toast.error("Erro ao salvar lugar", { description: error.message });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
      toast.success("Lugar guardado nas ideias");
      setShowPlaceDialog(false);
    } finally {
      setIsSavingPlace(false);
    }
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
      updateItem.mutate({ id: editingItem.id, date, ...contentData });
    } else {
      const dayItemCount = items.filter((item) => item.date === date).length;
      let placeId = selectedPlaceId;
      if (!placeId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Entre novamente para salvar o lugar");
          return;
        }
        const { data: place, error: placeError } = await supabase
          .from("trip_places")
          .insert({
            trip_id: tripId,
            created_by: user.id,
            name: title,
            description: description || null,
            address: location || null,
            maps_url: mapsUrl || null,
            latitude: resolvedLatitude,
            longitude: resolvedLongitude,
            category,
            source_type: "manual",
            status: "want",
          })
          .select("id")
          .single();
        if (placeError) {
          toast.error("Erro ao salvar lugar", { description: placeError.message });
          return;
        }
        placeId = place.id;
      }
      createItem.mutate({
        trip_id: tripId,
        date,
        order_index: dayItemCount,
        place_id: placeId,
        reservation_id: null,
        duration_minutes: null,
        transport_mode: null,
        ...contentData,
      });
    }
  };

  const handleSaveOnly = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!title || !user) {
      toast.error("Entre novamente para salvar o lugar");
      return;
    }
    const { error } = await supabase.from("trip_places").insert({
      trip_id: tripId,
      created_by: user.id,
      name: title,
      description: description || null,
      address: location || null,
      maps_url: mapsUrl || null,
      latitude,
      longitude,
      category,
      source_type: "manual",
      status: "idea",
    });
    if (error) {
      toast.error("Erro ao salvar lugar", { description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
    toast.success("Lugar salvo para decidir depois");
    resetForm();
    setShowDialog(false);
  };

  const handleSaveLodging = async (data: LodgingSaveData) => {
    const rangeDays = plannerDays.filter(
      (day) => day.date >= data.checkInDate && day.date <= data.checkOutDate
    );
    const targetDates = rangeDays.length > 0 ? rangeDays.map((d) => d.date) : [data.checkInDate];

    // Inserção em lote (Bulk Insert) única e atômica no banco de dados
    const newItems = targetDates.map((d) => {
      const existingInDayCount = items.filter((item) => item.date === d).length;
      return {
        trip_id: tripId,
        date: d,
        order_index: existingInDayCount,
        title: data.title,
        location: data.location || data.title,
        latitude: data.latitude,
        longitude: data.longitude,
        category: "hotel",
        description: data.notes
          ? `Hospedagem (${data.type.toUpperCase()}) • ${data.notes}`
          : `Hospedagem (${data.type.toUpperCase()})`,
        maps_url: data.mapsUrl || null,
        place_id: null,
        reservation_id: null,
        duration_minutes: null,
        transport_mode: null,
        start_time: null,
        end_time: null,
      };
    });

    const { error } = await supabase.from("trip_itinerary").insert(newItems);

    if (error) {
      toast.error("Erro ao salvar hospedagem no banco de dados", { description: error.message });
      return;
    }

    // Invalidação única sem race condition
    queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });

    toast.success(`Hospedagem "${data.title}" cadastrada!`, {
      description: `Ativa para ${targetDates.length} ${targetDates.length === 1 ? "dia" : "dias"} da viagem. Busca por locais próximos ativada!`,
    });
  };

  const { data: weatherData = {} } = useQuery({
    queryKey: ["weather-forecast", destCoords?.lat, destCoords?.lon],
    queryFn: async () => {
      if (!destCoords) return {};
      return fetchWeatherForecast(destCoords.lat, destCoords.lon);
    },
    enabled: !!destCoords,
  });

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
      weather: weatherData[dayDate],
    }));
  }, [groupedItems, items, trip.end_date, trip.start_date, weatherData]);

  const activeWeather = useMemo(() => weatherData[activeDate], [weatherData, activeDate]);

  const handleShareItineraryWhatsApp = () => {
    const formattedDate = activeDate
      ? dateFns.format(dateFns.parseISO(activeDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
      : "";
    let text = `✈️ *Roteiro de Viagem — ${trip.destination || trip.name}*\n`;
    text += `📅 *${formattedDate}*\n\n`;

    if (lodgingStop) {
      text += `🏨 *Hospedagem:* ${lodgingStop.title}\n📍 ${lodgingStop.location || ""}\n\n`;
    }

    if (activeItems.length === 0) {
      text += `_Nenhuma atividade cadastrada para este dia._\n`;
    } else {
      text += `📌 *Programação do Dia (${activeItems.length} paradas):*\n`;
      activeItems.forEach((item, idx) => {
        const timeStr = item.start_time ? `[${item.start_time}${item.end_time ? ` - ${item.end_time}` : ""}] ` : "";
        text += `\n${idx + 1}. *${item.title}*\n   ${timeStr}${item.location || ""}\n`;
        if (item.maps_url) {
          text += `   🗺️ ${item.maps_url}\n`;
        }
      });
    }

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  useEffect(() => {
    if (plannerDays.length === 0) return;
    if (!plannerDays.some((day) => day.date === activeDate)) {
      setActiveDate(plannerDays[0].date);
    }
  }, [activeDate, plannerDays]);

  const activeItems = useMemo(
    () => groupedItems[activeDate] ?? [],
    [groupedItems, activeDate]
  );

  // Identifica a hospedagem (Hotel, Pousada, Airbnb, etc.) da viagem ou do dia
  const lodgingStop = useMemo(() => {
    const isLodgingText = (cat?: string | null, title?: string, loc?: string | null) => {
      const text = `${cat || ""} ${title || ""} ${loc || ""}`.toLowerCase();
      return (
        cat === "hotel" ||
        cat === "accommodation" ||
        text.includes("hotel") ||
        text.includes("pousada") ||
        text.includes("airbnb") ||
        text.includes("resort") ||
        text.includes("hostel") ||
        text.includes("hospedagem") ||
        text.includes("chale") ||
        text.includes("chalé") ||
        text.includes("flat") ||
        text.includes("apartamento")
      );
    };

    // Tenta primeiro encontrar uma hospedagem no dia ativo (mesmo que ainda sem coords)
    const activeLodging = activeItems.find(
      (item) => isLodgingText(item.category, item.title, item.location)
    );
    if (activeLodging) return activeLodging;

    // Senão busca em toda a viagem
    const anyLodging = items.find(
      (item) => isLodgingText(item.category, item.title, item.location)
    );
    return anyLodging || null;
  }, [activeItems, items]);

  const [geocodedLodgingCoords, setGeocodedLodgingCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!lodgingStop) {
      setGeocodedLodgingCoords(null);
      return;
    }

    if (lodgingStop.latitude !== null && lodgingStop.longitude !== null) {
      setGeocodedLodgingCoords({ lat: lodgingStop.latitude, lon: lodgingStop.longitude });
      return;
    }

    // Se o usuário adicionou um hotel/Airbnb mas ainda sem coordenadas, geocodifica silenciosamente no mapa
    const query = lodgingStop.location || lodgingStop.title;
    if (!query) return;

    let active = true;
    searchPlaces(query, destCoords ?? undefined, "hotel", trip.destination || trip.name)
      .then((results) => {
        if (!active || !results || results.length === 0) return;
        const top = results[0];
        setGeocodedLodgingCoords({ lat: top.lat, lon: top.lon });
        // Salva as coordenadas no banco para requisições futuras
        supabase
          .from("trip_itinerary")
          .update({
            latitude: top.lat,
            longitude: top.lon,
            maps_url: top.mapsUrl || buildGoogleMapsUrl(top.name, top.address || trip.destination || trip.name),
          })
          .eq("id", lodgingStop.id)
          .then(({ error }) => {
            if (!error) {
              queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
            }
          });
      });

    return () => {
      active = false;
    };
  }, [lodgingStop, destCoords, trip.destination, trip.name, tripId, queryClient]);

  const lodgingCoords = useMemo(() => {
    if (lodgingStop && lodgingStop.latitude !== null && lodgingStop.longitude !== null) {
      return { lat: lodgingStop.latitude, lon: lodgingStop.longitude };
    }
    return geocodedLodgingCoords;
  }, [lodgingStop, geocodedLodgingCoords]);

  const searchNearCoords = useMemo(() => {
    return lodgingCoords || destCoords;
  }, [lodgingCoords, destCoords]);

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

  const handleBulkImportPlaces = async (places: ParsedPlace[]) => {
    const targetDate = activeDate || trip.start_date;
    const currentCount = items.filter((i) => i.date === targetDate).length;

    const newItems = places.map((p, idx) => ({
      trip_id: tripId,
      date: targetDate,
      title: p.title,
      description: p.description || null,
      location: p.title,
      start_time: null,
      end_time: null,
      order_index: currentCount + idx,
      latitude: p.latitude || null,
      longitude: p.longitude || null,
      category: p.category || "sightseeing",
    }));

    const { error } = await supabase.from("trip_itinerary").insert(newItems);
    if (error) {
      toast.error("Erro ao importar paradas", { description: error.message });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
    toast.success(`${places.length} locais importados com sucesso para o dia!`);
  };

  const handleApplyRouteOptimization = (orderedIds: string[]) => {
    const activeItemMap = new Map(activeItems.map((item) => [item.id, item]));
    const reorderedActive = orderedIds
      .map((id, index) => {
        const item = activeItemMap.get(id);
        return item ? { ...item, order_index: index } : null;
      })
      .filter(Boolean) as ItineraryItem[];

    const otherItems = items.filter((item) => item.date !== activeDate);
    const nextItems = [...otherItems, ...reorderedActive];

    reorderItems.mutate({
      nextItems,
      announcement: "Rota otimizada aplicada com sucesso.",
    });
  };

  return (
    <div className="space-y-4">
      <a
        href="#itinerary-stops"
        className="sr-only rounded-md bg-background p-3 text-sm font-semibold focus:not-sr-only focus:absolute focus:z-[2000]"
      >
        Pular mapa e ir para o roteiro
      </a>

      <ItineraryHero
        trip={trip}
        totalStops={items.length}
        dayCount={plannerDays.length}
        geocoded={destCoords}
        onAddStop={() => handleOpenDialog()}
        onSearchPlaces={() => setShowPlaceDialog(true)}
        onOptimize={() => setShowOptimizerDialog(true)}
        onImport={() => setShowImportDialog(true)}
        onExportPdf={() => exportTripToPdf(trip, items)}
      />

      <ItineraryDaysRail days={plannerDays} activeDate={activeDate} onSelect={setActiveDate} />

      <div
        className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_440px]"
        aria-busy={isLoading || arePlacesLoading || reorderItems.isPending}
      >
        <section
          id="itinerary-stops"
          aria-labelledby="active-day-title"
          className="min-w-0 space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Dia {Math.max(1, plannerDays.findIndex((day) => day.date === activeDate) + 1)} de {plannerDays.length}
              </p>
              <h3
                id="active-day-title"
                className="mt-1 text-xl font-bold capitalize tracking-tight text-foreground sm:text-2xl"
              >
                {activeDate
                  ? dateFns.format(dateFns.parseISO(activeDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
                  : "Escolha um dia"}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeWeather && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-900 dark:text-sky-200"
                  title={`Previsão para ${activeDate}: ${activeWeather.description}`}
                >
                  <span className="text-sm">{activeWeather.icon}</span>
                  <span>
                    {activeWeather.description} ({Math.round(activeWeather.minTemp)}°C a {Math.round(activeWeather.maxTemp)}°C)
                    {activeWeather.precipitationProb ? ` • 🌧️ ${activeWeather.precipitationProb}%` : ""}
                  </span>
                </span>
              )}
              {lodgingStop ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200"
                  title={`Busca de lugares focada ao redor de ${lodgingStop.title}`}
                >
                  <Hotel className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  Hospedagem: {lodgingStop.title}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 px-3 text-xs border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 font-semibold"
                  onClick={() => setShowLodgingDialog(true)}
                >
                  <Hotel className="mr-1.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  + Adicionar Hospedagem / Hotel
                </Button>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
                {activeItems.length} {activeItems.length === 1 ? "parada" : "paradas"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 px-3 text-xs border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10 font-semibold"
                onClick={handleShareItineraryWhatsApp}
                title="Enviar resumo do roteiro formatado para o WhatsApp"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Compartilhar Roteiro
              </Button>
              {activeItems.length > 0 && (
                <Button asChild variant="outline" size="sm" className="min-h-9 px-3 text-xs text-primary hover:text-primary">
                  <a
                    href={buildGoogleMapsDirectionsUrl(activeItems, trip.destination || trip.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <NavigationIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Abrir Rota no Google Maps
                  </a>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="min-h-9"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Adicionar parada
              </Button>
            </div>
          </div>

          {activeItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <Route className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold text-foreground">Nenhuma parada neste dia</p>
              <p className="mt-1 max-w-md mx-auto text-sm text-muted-foreground">
                Escolha outra data no trilho acima, ou adicione atrações e restaurantes para montar seu roteiro.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button onClick={() => handleOpenDialog()} className="min-h-11 shadow-xs">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Adicionar parada
                </Button>
                <Button variant="outline" onClick={() => setShowPlaceDialog(true)} className="min-h-11">
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  Buscar lugares
                </Button>
              </div>
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
                <ol className="space-y-3">
                  {activeItems.map((item, index) => {
                    const meta = parseStopMeta(item.description);
                    const nextItem = activeItems[index + 1];
                    const travelEstimate = nextItem ? getTravelEstimate(item, nextItem) : null;

                    return (
                      <Fragment key={item.id}>
                        <ItineraryStopCard
                          stop={item}
                          position={index}
                          itemCount={activeItems.length}
                          destination={trip.destination}
                          meta={meta}
                          isFocused={focusedItemId === item.id}
                          dayOptions={dayOptions}
                          disabled={reorderItems.isPending}
                          onFocus={() => {
                            setFocusedItemId(focusedItemId === item.id ? null : item.id);
                          }}
                          onEdit={() => handleOpenDialog(item)}
                          onDelete={() => setDeletingItem(item)}
                          onMove={(targetDate, targetIndex) =>
                            persistMove(item.id, targetDate, targetIndex)
                          }
                        />
                        {travelEstimate && (
                          <div className="my-1.5 flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                              {travelEstimate}
                            </span>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          {/* Banco de Ideias / Lugares Salvos */}
          <div className="mt-8 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Lugares Salvos (Banco de Ideias)</h3>
                  <p className="text-xs text-muted-foreground">
                    {savedPlaces.length} {savedPlaces.length === 1 ? "lugar salvo" : "lugares salvos"} para organizar no seu roteiro
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9 text-xs"
                onClick={() => setShowPlaceDialog(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Buscar novos lugares
              </Button>
            </div>

            {savedPlaces.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum lugar salvo ainda. Use o botão acima para pesquisar atrações e restaurantes!
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {savedPlaces.map((place) => {
                  const scheduled = items.some((item) => item.place_id === place.id);
                  return (
                    <div
                      key={place.id}
                      className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-background/60 p-3.5 transition-all hover:border-primary/40 hover:shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground text-sm truncate">{place.name}</h4>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Editar lugar salvo"
                              onClick={() =>
                                setEditingSavedPlace({
                                  id: place.id,
                                  name: place.name,
                                  address: place.address || "",
                                  notes: place.notes || "",
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Excluir lugar salvo"
                              onClick={() =>
                                setDeletingSavedPlace({
                                  id: place.id,
                                  name: place.name,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        {place.address && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{place.address}</span>
                          </p>
                        )}
                        {place.notes && (
                          <p className="mt-1.5 text-xs text-muted-foreground/80 line-clamp-2">
                            {place.notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                        {scheduled ? (
                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            ✓ No roteiro
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="min-h-8 w-full text-xs font-semibold"
                            onClick={() => handleOpenSavedPlace(place)}
                          >
                            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                            Adicionar ao dia
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <TripReservationsPanel tripId={tripId} />

          <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">Sugestões IA</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gere ideias automáticas para o seu roteiro em {trip.destination || trip.name}.
            </p>
            <div className="mt-3">
              <AITripSuggestions
                type="itinerary"
                destination={trip.destination || trip.name}
                onApply={handleApplyAISuggestions}
              />
            </div>
          </div>
        </aside>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>

      {/* Dialog */}
      <ItineraryDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isEditing={!!editingItem}
        dateLocked={false}
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
        destinationName={trip.destination || trip.name}
        onSubmit={handleSubmit}
        onSaveOnly={handleSaveOnly}
      />

      <PlaceDiscoveryDialog
        open={showPlaceDialog}
        onOpenChange={setShowPlaceDialog}
        searchNear={searchNearCoords}
        destinationName={trip.destination || trip.name}
        lodgingName={lodgingStop?.title}
        lodgingCoords={lodgingCoords}
        isSaving={isSavingPlace}
        onSave={handleSaveDiscoveredPlace}
        onAddToDay={handleAddDiscoveredPlaceToDay}
      />

      {/* Dedicated Lodging Modal */}
      <LodgingDialog
        open={showLodgingDialog}
        onOpenChange={setShowLodgingDialog}
        dayOptions={dayOptions}
        defaultDate={activeDate}
        destinationName={trip.destination || trip.name}
        searchNear={destCoords}
        isLoading={createItem.isPending}
        onSave={handleSaveLodging}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
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
              onClick={() => {
                const targetId = deletingItem?.id;
                if (targetId) deleteItem.mutate(targetId);
              }}
              className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <ImportPlacesDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportPlaces={handleBulkImportPlaces}
      />

      <RouteOptimizerDialog
        open={showOptimizerDialog}
        onOpenChange={setShowOptimizerDialog}
        stops={activeItems}
        onApplyOptimization={handleApplyRouteOptimization}
      />

      {/* Dialog para Editar Lugar Salvo */}
      <Dialog
        open={!!editingSavedPlace}
        onOpenChange={(open) => {
          if (!open) setEditingSavedPlace(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar lugar salvo</DialogTitle>
            <DialogDescription>
              Atualize as informações sobre esta atração ou restaurante.
            </DialogDescription>
          </DialogHeader>
          {editingSavedPlace && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSavedPlace.mutate({
                  id: editingSavedPlace.id,
                  name: editingSavedPlace.name,
                  address: editingSavedPlace.address,
                  notes: editingSavedPlace.notes,
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="saved-place-name">Nome do lugar</Label>
                <Input
                  id="saved-place-name"
                  value={editingSavedPlace.name}
                  onChange={(e) =>
                    setEditingSavedPlace({ ...editingSavedPlace, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="saved-place-address">Endereço / Localização</Label>
                <Input
                  id="saved-place-address"
                  value={editingSavedPlace.address}
                  onChange={(e) =>
                    setEditingSavedPlace({ ...editingSavedPlace, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="saved-place-notes">Notas / Observações</Label>
                <Textarea
                  id="saved-place-notes"
                  value={editingSavedPlace.notes}
                  onChange={(e) =>
                    setEditingSavedPlace({ ...editingSavedPlace, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingSavedPlace(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateSavedPlace.isPending}>
                  {updateSavedPlace.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para Excluir Lugar Salvo */}
      <AlertDialog
        open={!!deletingSavedPlace}
        onOpenChange={(open) => {
          if (!open) setDeletingSavedPlace(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lugar salvo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{deletingSavedPlace?.name}&quot; dos seus lugares salvos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel onClick={() => setDeletingSavedPlace(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingSavedPlace) {
                  deleteSavedPlace.mutate(deletingSavedPlace.id);
                }
              }}
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
  destinationName,
  onSubmit,
  onSaveOnly,
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
  destinationName?: string;
  onSubmit: () => void;
  onSaveOnly: () => void;
}) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Autocomplete de lugares (Photon/OSM) — só busca quando o usuário digita
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
    const catLabel = PLACE_CATEGORIES.find((c) => c.id === category)?.label;
    const effectiveQuery = query.length >= 2 ? query : (category ? (catLabel || "") : "");

    if (!effectiveQuery) {
      setPlaceResults([]);
      return;
    }

    const requestId = ++searchRequestId.current;
    setIsSearchingPlaces(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaces(
        effectiveQuery,
        searchNear ?? undefined,
        category ?? undefined,
        destinationName
      );
      if (searchRequestId.current !== requestId) return;
      setPlaceResults(results);
      setIsSearchingPlaces(false);
      setActivePlaceIndex(results.length ? 0 : -1);
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

  const handlePlaceKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
    const requestId = ++mapsResolveRequestId.current;
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

    const resolved = await reverseGeocode(coordinates.lat, coordinates.lon);
    if (mapsResolveRequestId.current !== requestId) return;
    if (!resolved) return;
    setLocation(resolved.address || resolved.name);
    if (!title.trim() && !nameFromUrl) setTitle(resolved.name);
    setResolvedPlaceName(nameFromUrl || resolved.name);
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
                <Label htmlFor="itinerary-date" className="text-xs font-semibold">Data</Label>
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
                <Label htmlFor="itinerary-start-time" className="text-xs font-semibold">Início</Label>
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
                <Label htmlFor="itinerary-end-time" className="text-xs font-semibold">Fim</Label>
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
              <Label htmlFor="itinerary-title" className="text-xs font-semibold">Título da atividade *</Label>
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

            {/* Local + Categoria com sugestões automáticas do destino */}
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <Label htmlFor="itinerary-location" className="text-xs font-semibold text-foreground">Buscar local</Label>

              {/* Categoria — ativa busca direta das melhores atrações/restaurantes do destino */}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sugestões por categoria">
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

              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    id="itinerary-location"
                    role="combobox"
                    aria-label="Buscar local"
                    placeholder={category ? `Buscando sugestões de ${PLACE_CATEGORIES.find(c=>c.id===category)?.label}...` : "Digite o nome do lugar ou selecione uma categoria acima..."}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setPlaceQuery(e.target.value);
                      onCoordsChange(null);
                      setResolvedPlaceName("");
                    }}
                    onKeyDown={handlePlaceKeyDown}
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
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {(placeResults.length > 0 || isSearchingPlaces) && (
                  <div
                    id="itinerary-place-results"
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl"
                  >
                    {isSearchingPlaces && placeResults.length === 0 && (
                      <p className="px-3 py-2.5 text-xs text-muted-foreground">Buscando sugestões para esta cidade…</p>
                    )}
                    {placeResults.map((place, idx) => (
                      <button
                        key={`${place.lat}-${place.lon}-${idx}`}
                        id={`itinerary-place-result-${idx}`}
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
              </div>
              {hasCoords && (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <MapPin className="h-3 w-3" />
                  {resolvedPlaceName ? `Local selecionado: ${resolvedPlaceName}` : "Pin marcado no mapa"}
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
                {showMoreFields ? "− Ocultar opções avançadas" : "＋ Mais opções (Link do Maps, anotações)"}
              </button>

              {showMoreFields && (
                <div className="mt-3 space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
                  {/* Link do Maps */}
                  <div className="space-y-1.5">
                    <Label htmlFor="itinerary-maps-url" className="text-xs font-semibold flex items-center gap-1">
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
                    <Label htmlFor="itinerary-description" className="text-xs font-semibold">Descrição / Notas</Label>
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
