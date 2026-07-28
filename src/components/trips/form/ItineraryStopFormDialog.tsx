import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Compass } from "lucide-react";

export interface ItineraryStopFormData {
  id?: string;
  date: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  category: string;
  transport_mode: string;
  maps_url: string;
  latitude: number | null;
  longitude: number | null;
}

interface ItineraryStopFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<ItineraryStopFormData> | null;
  onSubmit: (data: ItineraryStopFormData) => void;
  isSubmitting?: boolean;
}

export function ItineraryStopFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting = false,
}: ItineraryStopFormDialogProps) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [category, setCategory] = useState("sightseeing");
  const [transportMode, setTransportMode] = useState("walk");
  const [mapsUrl, setMapsUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);


  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || "");
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setLocation(initialData.location || "");
      setStartTime(initialData.start_time || "");
      setEndTime(initialData.end_time || "");
      setDurationMinutes(initialData.duration_minutes ?? "");
      setCategory(initialData.category || "sightseeing");
      setTransportMode(initialData.transport_mode || "walk");
      setMapsUrl(initialData.maps_url || "");
      setLatitude(initialData.latitude ?? null);
      setLongitude(initialData.longitude ?? null);
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setDate("");
    setTitle("");
    setDescription("");
    setLocation("");
    setStartTime("");
    setEndTime("");
    setDurationMinutes("");
    setCategory("sightseeing");
    setTransportMode("walk");
    setMapsUrl("");
    setLatitude(null);
    setLongitude(null);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    onSubmit({
      id: initialData?.id,
      date,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes === "" ? null : Number(durationMinutes),
      category,
      transport_mode: transportMode,
      maps_url: mapsUrl.trim(),
      latitude,
      longitude,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-600" />
            {initialData?.id ? "Editar Atividade do Roteiro" : "Nova Atividade do Roteiro"}
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes da parada ou atração para organizar seu dia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data do Dia *</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sightseeing">🏛️ Atração / Turístico</SelectItem>
                  <SelectItem value="restaurant">🍽️ Alimentação / Resto</SelectItem>
                  <SelectItem value="accommodation">🏨 Hospedagem</SelectItem>
                  <SelectItem value="transit">🚌 Transporte / Deslocamento</SelectItem>
                  <SelectItem value="shopping">🛍️ Compras</SelectItem>
                  <SelectItem value="leisure">🏖️ Lazer / Passeio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Título da Atividade / Local *</Label>
            <Input
              id="title"
              placeholder="Ex: Visita ao Museu do Louver, Almoço no Centro..."
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Horário Início</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime">Horário Fim</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 90"
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(e.target.value ? parseInt(e.target.value) : "")
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Endereço / Localização</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Ex: Av. Paulista, 1000 - São Paulo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            {latitude && longitude && (
              <span className="text-[10px] text-emerald-600 font-medium">
                ✓ Coordenadas identificadas ({latitude.toFixed(4)}, {longitude.toFixed(4)})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="transportMode">Deslocamento para este local</Label>
              <Select value={transportMode} onValueChange={setTransportMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">🚶 A pé / Caminhada</SelectItem>
                  <SelectItem value="car">🚗 Carro / Uber</SelectItem>
                  <SelectItem value="transit">🚌 Transporte Público</SelectItem>
                  <SelectItem value="bicycle">🚲 Bicicleta</SelectItem>
                  <SelectItem value="flight">✈️ Voo / Trem Longa Distância</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mapsUrl">Link do Google Maps</Label>
              <Input
                id="mapsUrl"
                placeholder="https://maps.app.goo.gl/..."
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição / Dicas / Anotações</Label>
            <Textarea
              id="description"
              placeholder="Ex: Comprar ingresso com antecedência, código de reserva #123..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar Atividade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
