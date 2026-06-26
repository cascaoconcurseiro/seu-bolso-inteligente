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
import { Clock, ExternalLink, MapPin, Pencil, Plus, Route, Search, Trash2 } from "lucide-react";
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
  const [mapsUrl, setMapsUrl] = useState("");

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
    setMapsUrl("");
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
      setMapsUrl(meta.mapsUrl || "");
    } else {
      setEditingItem(null);
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!date || !title) return;

    // Embute mapsUrl nos metadados da descrição
    const metadata = JSON.stringify({ mapsUrl: mapsUrl || "", rating: null });
    const fullDescription = description
      ? `${description}\n<!--meta:${metadata}-->`
      : `<!--meta:${metadata}-->`;

    const itemData = {
      trip_id: tripId,
      date,
      title,
      description: fullDescription,
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
          date={date} setDate={setDate}
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          location={location} setLocation={setLocation}
          startTime={startTime} setStartTime={setStartTime}
          endTime={endTime} setEndTime={setEndTime}
          mapsUrl={mapsUrl} setMapsUrl={setMapsUrl}
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
            <h3 className="text-sm font-semibold capitalize text-foreground">
              {dateFns.format(new Date(dateKey + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
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
                          href={(() => {
                            if (meta.mapsUrl) return meta.mapsUrl;
                            const query = encodeURIComponent((item.location || item.title) + (trip.destination ? ", " + trip.destination : ""));
                            return `https://www.google.com/maps/search/?api=1&query=${query}`;
                          })()}
                          onClick={(e) => {
                            const query = encodeURIComponent((item.location || item.title) + (trip.destination ? ", " + trip.destination : ""));
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            if (isIOS) {
                              e.preventDefault();
                              // Tenta abrir o app do Google Maps; fallback para web
                              window.location.href = `comgooglemaps://?q=${query}`;
                              setTimeout(() => {
                                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                              }, 500);
                            }
                          }}
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
        date={date} setDate={setDate}
        title={title} setTitle={setTitle}
        description={description} setDescription={setDescription}
        location={location} setLocation={setLocation}
        startTime={startTime} setStartTime={setStartTime}
        endTime={endTime} setEndTime={setEndTime}
        mapsUrl={mapsUrl} setMapsUrl={setMapsUrl}
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
  open, onOpenChange, isEditing, isLoading,
  date, setDate, title, setTitle,
  description, setDescription,
  location, setLocation,
  startTime, setStartTime,
  endTime, setEndTime,
  mapsUrl, setMapsUrl,
  onSubmit,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
  isEditing: boolean; isLoading: boolean;
  date: string; setDate: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  startTime: string; setStartTime: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  mapsUrl: string; setMapsUrl: (v: string) => void;
  onSubmit: () => void;
}) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const openMapsSearch = () => {
    const query = encodeURIComponent(location || title);
    const url = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-3xl !rounded-b-none sm:!rounded-3xl transition-transform duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="w-full flex justify-center pt-4 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          <DialogDescription className="sr-only">Formulário de atividade do roteiro</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Data */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input placeholder="Ex: Visita ao museu" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Horário início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Horário fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11" />
            </div>
          </div>

          {/* Local + busca */}
          <div className="space-y-2">
            <Label>Local</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Museu do Louvre"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-11"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={openMapsSearch}
                disabled={!location && !title}
                title="Buscar no Maps"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Link do Maps */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Link do Google Maps
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Cole o link copiado do Maps…"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                className="h-11 text-sm"
              />
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 shrink-0 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Toque em 🔍 para buscar, copie o link no Maps e cole aqui.
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Detalhes da atividade…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="w-1/2 h-11" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="w-1/2 h-11 font-bold" onClick={onSubmit} disabled={isLoading || !date || !title}>
              {isLoading ? "Salvando…" : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
