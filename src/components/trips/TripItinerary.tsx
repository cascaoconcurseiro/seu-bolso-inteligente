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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MapPin, Pencil, Plus, Route, Trash2 } from "lucide-react";
import { useState } from "react";

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
}

import { EmptyState } from "@/components/ui/empty-state";
import { AITripSuggestions } from "./AITripSuggestions";

interface TripItineraryProps {
  trip: any;
}

export function TripItinerary({ trip }: TripItineraryProps) {
  const tripId = trip.id;
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ItineraryItem | null>(null);
  const [isApplyingAI, setIsApplyingAI] = useState(false);

  // Form state
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        .order("start_time", { ascending: true });

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
      toast({ title: "Atividade adicionada" });
      resetForm();
      setShowDialog(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
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
      toast({ title: "Atividade atualizada" });
      resetForm();
      setShowDialog(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
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
      toast({ title: "Atividade removida" });
      setDeletingItem(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });

  const handleApplyAISuggestions = async (suggestions: any[]) => {
    setIsApplyingAI(true);
    const startDate = trip.start_date || dateFns.format(new Date(), "yyyy-MM-dd");

    try {
      const promises = suggestions.map((s, idx) => {
        // Embed mapsUrl and rating as JSON metadata in description
        const metadata = JSON.stringify({ mapsUrl: s.mapsUrl || "", rating: s.rating || null });
        const fullDescription = s.description
          ? `${s.description}\n<!--meta:${metadata}-->`
          : `<!--meta:${metadata}-->`;

        return supabase.from("trip_itinerary").insert({
          trip_id: tripId,
          date: startDate,
          title: s.title,
          description: fullDescription,
          location: s.location,
          start_time: null,
          end_time: null,
          order_index: items.length + idx,
        });
      });

      await Promise.all(promises);

      queryClient.invalidateQueries({ queryKey: ["trip-itinerary", tripId] });
      toast({
        title: "Sucesso",
        description: `${suggestions.length} atividades adicionadas no 1º dia.`,
      });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
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
  };

  const handleOpenDialog = (item?: ItineraryItem) => {
    if (item) {
      setEditingItem(item);
      setDate(item.date);
      setTitle(item.title);
      setDescription(item.description || "");
      setLocation(item.location || "");
      setStartTime(item.start_time || "");
      setEndTime(item.end_time || "");
    } else {
      setEditingItem(null);
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!date || !title) return;

    const itemData = {
      trip_id: tripId,
      date,
      title,
      description: description || null,
      location: location || null,
      start_time: startTime || null,
      end_time: endTime || null,
      order_index: items.length,
    };

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...itemData });
    } else {
      createItem.mutate(itemData);
    }
  };

  // Agrupar por data
  const groupedItems = items.reduce(
    (acc, item) => {
      const dateKey = item.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    },
    {} as Record<string, ItineraryItem[]>
  );

  // Estado vazio
  if (!isLoading && items.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Route}
          title="Roteiro vazio"
          description="Adicione atividades e passeios para organizar os dias da viagem."
          action={
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar atividade
              </Button>
              <AITripSuggestions
                type="itinerary"
                destination={trip.destination || trip.name}
                onApply={handleApplyAISuggestions}
              />
            </div>
          }
        />

        <ItineraryDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          isEditing={!!editingItem}
          isLoading={createItem.isPending || updateItem.isPending}
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
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
          Roteiro ({items.length} atividades)
        </h2>
        <div className="flex items-center gap-2">
          <AITripSuggestions
            type="itinerary"
            destination={trip.destination || trip.name}
            onApply={handleApplyAISuggestions}
          />
          <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Lista agrupada por data */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([dateKey, dayItems]) => (
          <div key={dateKey} className="space-y-3">
            {dateFns.format(new Date(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            <div className="space-y-2">
              {dayItems.map((item) => {
                const meta = parseMeta(item.description);
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.start_time && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.start_time.slice(0, 5)}
                            {item.end_time && ` - ${item.end_time.slice(0, 5)}`}
                          </span>
                        )}
                      </div>
                      <p className="font-medium mt-1">{item.title}</p>
                      {item.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </p>
                      )}
                      {meta.text && (
                        <p className="text-sm text-muted-foreground mt-2">{meta.text}</p>
                      )}
                      <div className="flex gap-1 mt-2">
                        <a
                          href={
                            meta.mapsUrl ||
                            `https://www.google.com/maps/place/${encodeURIComponent(item.title + ", " + (item.location || trip.destination || ""))}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900 transition-colors"
                          title="Abrir no Google Maps"
                        >
                          <MapPin className="h-3 w-3" />
                          Maps{meta.mapsUrl ? " ✓" : ""}
                        </a>
                        {meta.rating && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-1 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
                            ⭐ {meta.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItem(item)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog */}
      <ItineraryDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isEditing={!!editingItem}
        isLoading={createItem.isPending || updateItem.isPending}
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
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
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
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          <DialogDescription>Adicione uma atividade ao roteiro</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                id="itineraryDate"
                name="itineraryDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                id="itineraryTitle"
                name="itineraryTitle"
                placeholder="Ex: Visita ao museu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário início</Label>
              <Input
                id="itineraryStartTime"
                name="itineraryStartTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário fim</Label>
              <Input
                id="itineraryEndTime"
                name="itineraryEndTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Local</Label>
            <Input
              id="itineraryLocation"
              name="itineraryLocation"
              placeholder="Ex: Museu do Louvre"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              id="itineraryDescription"
              name="itineraryDescription"
              placeholder="Detalhes da atividade…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !date || !title}>
            {isLoading ? "Salvando…" : isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
