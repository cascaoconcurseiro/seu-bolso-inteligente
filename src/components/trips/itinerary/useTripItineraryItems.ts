/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { Trip } from "@/hooks/useTrips";
import type { TripSuggestion } from "@/services/aiAdvisorService";
import { getErrorMessage } from "../types";
import { PLACE_CATEGORIES } from "./types";
import * as dateFns from "date-fns";

export interface ItineraryItem {
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

export type TripPlace = Database["public"]["Tables"]["trip_places"]["Row"];

interface UseTripItineraryItemsProps {
  trip: Trip;
}

export function useTripItineraryItems({ trip }: UseTripItineraryItemsProps) {
  const tripId = trip.id;
  const queryClient = useQueryClient();
  const [itineraryOrderVersion, setItineraryOrderVersion] = useState<number>(
    trip.itinerary_order_version ?? 0
  );
  const [liveMessage, setLiveMessage] = useState<string>("");
  const [isApplyingAI, setIsApplyingAI] = useState(false);

  useEffect(() => {
    setItineraryOrderVersion(trip.itinerary_order_version ?? 0);
  }, [trip.itinerary_order_version]);

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
    },
    onError: (error) => {
      toast.error("Erro ao adicionar", { description: error.message });
    },
  });

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

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_itinerary").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success("Atividade removida");
    },
    onError: (error) => {
      toast.error("Erro ao remover", { description: error.message });
    },
  });

  const deleteSavedPlace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
      toast.success("Lugar removido dos salvos");
    },
    onError: (error) => {
      toast.error("Erro ao remover lugar", { description: error.message });
    },
  });

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
          category: matchedCategory,
        };
      });

      const { error } = await supabase.from("trip_itinerary").insert(suggestionsToInsert);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast.success(`${suggestions.length} sugestões adicionadas ao primeiro dia!`);
    } catch (error: any) {
      toast.error("Erro ao aplicar sugestões", { description: error.message });
    } finally {
      setIsApplyingAI(false);
    }
  };

  return {
    items,
    isLoading,
    savedPlaces,
    arePlacesLoading,
    createItem,
    updateItem,
    reorderItems,
    deleteItem,
    deleteSavedPlace,
    updateSavedPlace,
    handleApplyAISuggestions,
    isApplyingAI,
    itineraryOrderVersion,
    liveMessage,
    setLiveMessage,
  };
}
