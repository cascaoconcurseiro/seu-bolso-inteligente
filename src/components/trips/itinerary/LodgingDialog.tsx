import { useState, useEffect } from "react";
import {
  Hotel,
  MapPin,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  Home,
  BedDouble,
  Palmtree,
  Loader2,
} from "lucide-react";
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
import {
  buildGoogleMapsUrl,
  parseGoogleMapsUrl,
  parseGoogleMapsPlaceName,
} from "@/services/mapsHelpers";
import { toast } from "sonner";

export interface LodgingSaveData {
  title: string;
  location: string;
  checkInDate: string;
  checkOutDate: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
  notes?: string;
}

export interface LodgingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOptions: Array<{ date: string; label: string }>;
  defaultDate?: string;
  destinationName?: string;
  searchNear?: { lat: number; lon: number } | null;
  isLoading?: boolean;
  onSave: (data: LodgingSaveData) => Promise<void>;
}

const LODGING_TYPES = [
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "airbnb", label: "Airbnb / Aluguel", icon: Home },
  { id: "pousada", label: "Pousada", icon: BedDouble },
  { id: "resort", label: "Resort / Spa", icon: Palmtree },
  { id: "hostel", label: "Hostel", icon: Hotel },
];

export function LodgingDialog({
  open,
  onOpenChange,
  dayOptions,
  defaultDate,
  destinationName,
  searchNear,
  isLoading = false,
  onSave,
}: LodgingDialogProps) {
  const [lodgingType, setLodgingType] = useState("airbnb");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapsUrl, setMapsUrl] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (open) {
      const initialDate = defaultDate || dayOptions[0]?.date || "";
      setCheckInDate(initialDate);
      setCheckOutDate(dayOptions[dayOptions.length - 1]?.date || initialDate);
      setLodgingType("airbnb");
      setTitle("");
      setLocation("");
      setNotes("");
      setLatitude(null);
      setLongitude(null);
      setMapsUrl("");
    }
  }, [open, defaultDate, dayOptions]);

  const handleSearchAddress = async () => {
    const query = location.trim() || title.trim();
    if (!query) {
      toast.error("Digite o endereço ou nome da hospedagem para buscar");
      return;
    }

    // Se for URL do Maps
    if (query.includes("google.com/maps") || query.includes("maps.app.goo.gl")) {
      const coords = parseGoogleMapsUrl(query);
      if (coords) {
        setLatitude(coords.lat);
        setLongitude(coords.lon);
        setMapsUrl(query);
        const placeName = parseGoogleMapsPlaceName(query);
        if (placeName && !title) setTitle(placeName);
        toast.success("Coordenadas extraídas do link do Google Maps!");
        return;
      }
    }

    toast.info("A busca avançada de coordenadas foi desativada. Insira um link do Google Maps para precisão automática.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o nome da hospedagem (ex: Airbnb Centro ou Hotel Ibis)");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      toast.error("Selecione as datas de check-in e check-out");
      return;
    }

    await onSave({
      title: title.trim(),
      location: location.trim(),
      checkInDate,
      checkOutDate,
      type: lodgingType,
      latitude,
      longitude,
      mapsUrl: mapsUrl || (location ? buildGoogleMapsUrl(title, location) : undefined),
      notes: notes.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] sm:max-w-lg overflow-y-auto rounded-3xl p-5 sm:p-6 border-border shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Hotel className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Cadastrar Hospedagem
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Defina seu Hotel ou Airbnb para o sistema priorizar buscas de restaurantes e atrações próximas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo de Hospedagem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo de Acomodação</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LODGING_TYPES.map(({ id, label, icon: Icon }) => {
                const isSelected = lodgingType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLodgingType(id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold shadow-xs"
                        : "border-border/80 bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-amber-600 dark:text-amber-400" : ""}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nome da Hospedagem */}
          <div className="space-y-1.5">
            <Label htmlFor="lodging-title" className="text-xs font-semibold">
              Nome ou Identificação da Hospedagem *
            </Label>
            <Input
              id="lodging-title"
              placeholder="Ex: Airbnb Apt 402 no Centro, Hotel Ibis, Pousada Solar..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-10 text-sm rounded-xl"
            />
          </div>

          {/* Endereço Completo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="lodging-location" className="text-xs font-semibold">
                Endereço Completo ou Link (Google Maps / Airbnb)
              </Label>
              {latitude !== null && longitude !== null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  No mapa
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="lodging-location"
                placeholder="Ex: Rua das Flores 123, Bairro, Cidade (ou cole o link)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 text-sm rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchAddress}
                disabled={isGeocoding}
                className="h-10 px-3 text-xs shrink-0 rounded-xl border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
              >
                {isGeocoding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    Localizar
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              💡 Digite o endereço exato ou cole o link do Google Maps para que a busca por lugares próximos funcione perfeitamente.
            </p>
          </div>

          {/* Período de Permanência (Check-in / Check-out) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="lodging-checkin" className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Check-in (Entrada) *
              </Label>
              <select
                id="lodging-checkin"
                value={checkInDate}
                onChange={(e) => {
                  setCheckInDate(e.target.value);
                  if (e.target.value > checkOutDate) {
                    setCheckOutDate(e.target.value);
                  }
                }}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                required
              >
                {dayOptions.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lodging-checkout" className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Check-out (Saída) *
              </Label>
              <select
                id="lodging-checkout"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                required
              >
                {dayOptions.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações / Código de Reserva */}
          <div className="space-y-1.5">
            <Label htmlFor="lodging-notes" className="text-xs font-semibold">
              Observações / Código de Reserva / Contato (opcional)
            </Label>
            <Textarea
              id="lodging-notes"
              placeholder="Ex: Código Airbnb HM123456, Chave no cofre da porta (senha 1234), Telefone recepção..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs rounded-xl"
            />
          </div>

          {/* Rodapé e Botões */}
          <div className="pt-3 flex gap-2 justify-end border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isGeocoding}
              className="h-11 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Hotel className="mr-1.5 h-4 w-4" />
                  Salvar Hospedagem
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
