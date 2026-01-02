import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Route, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface TripItineraryProps {
  tripId: string;
}

export function TripItinerary({ tripId }: TripItineraryProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ItineraryItem | null>(null);
  
  // Form state
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      const { data, error } = await supabase
        .from("trip_itinerary")
        .insert(item)
        .select()
        .single();

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
      const { error } = await supabase
        .from("trip_itinerary")
        .delete()
        .eq("id", id);

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
  const groupedItems = items.reduce((acc, item) => {
    const dateKey = item.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, ItineraryItem[]>);

  // Estado vazio
  if (!isLoading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Roteiro da viagem</h3>
          <p className="text-muted-foreground mb-6">Adicione atividades e passeios</p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar atividade
          </Button>
        </div>

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
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Roteiro ({items.length} atividades)
        </h2>
        <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Lista agrupada por data */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([dateKey, dayItems]) => (
          <div key={dateKey} className="space-y-3">
            <h3 className="font-medium text-sm border-b border-border pb-2">
              {format(new Date(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <div className="space-y-2">
              {dayItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.start_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
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
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    )}
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
              ))}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteItem.mutate(deletingItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          <DialogDescription>Adicione uma atividade ao roteiro</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Ex: Visita ao museu" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horário fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Local</Label>
            <Input placeholder="Ex: Museu do Louvre" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea placeholder="Detalhes da atividade..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isLoading || !date || !title}>
            {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
