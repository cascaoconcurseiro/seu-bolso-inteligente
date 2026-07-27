import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  ExternalLink,
  Globe,
  GripVertical,
  MapPin,
  Pencil,
  Phone,
  Star,
  Trash2,
  BookOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getCategoryColor } from "@/services/overpassService";
import { fetchNearbyWikipediaPlace } from "@/services/wikipediaPlaceService";
import { useState } from "react";
import type { ItineraryStop, ItineraryStopMeta } from "./types";

interface ItineraryStopCardProps {
  stop: ItineraryStop;
  position: number;
  itemCount: number;
  destination: string | null;
  meta: ItineraryStopMeta;
  dayOptions: Array<{ date: string; label: string }>;
  disabled?: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (targetDate: string, targetIndex: number) => void;
}

export function ItineraryStopCard({
  stop,
  position,
  itemCount,
  destination,
  meta,
  dayOptions,
  disabled = false,
  isFocused,
  onFocus,
  onEdit,
  onDelete,
  onMove,
}: ItineraryStopCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [expanded, setExpanded] = useState(false);

  // Info rica via Wikipedia (cache local de 7 dias)
  const { data: wiki } = useQuery({
    queryKey: ["wikipedia-place", stop.title, stop.latitude, stop.longitude],
    queryFn: ({ signal }) =>
      stop.latitude !== null && stop.longitude !== null
        ? fetchNearbyWikipediaPlace(stop.title, stop.latitude, stop.longitude, signal)
        : Promise.resolve(null),
    enabled: stop.latitude !== null && stop.longitude !== null,
    staleTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
  });

  // Prioriza busca pelo Nome do Estabelecimento + Cidade/Endereço para abrir a Ficha com Avaliações do Google
  const placeSearchText = [stop.title, stop.location || destination].filter(Boolean).join(", ");
  const isNumericCoordsUrl = stop.maps_url && /query=-?\d+\.\d+/.test(stop.maps_url);
  const mapsUrl =
    (stop.maps_url && !isNumericCoordsUrl ? stop.maps_url : null) ||
    meta.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeSearchText)}`;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeSearchText)}&travelmode=driving`;

  const catColor = getCategoryColor(stop.category);
  const hasRichInfo = Boolean(meta.phone || meta.website || meta.openingHours || wiki);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-stop-id={stop.id}
      className={`group relative rounded-3xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow,opacity] motion-reduce:transition-none sm:p-5 ${
        isFocused
          ? "border-primary ring-2 ring-primary/15"
          : "border-border/70 hover:border-primary/35"
      } ${isDragging ? "z-20 opacity-60 shadow-xl" : ""}`}
    >
      <div
        className="absolute inset-y-4 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: catColor }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-3 pl-1">
        <button
          type="button"
          onClick={onFocus}
          aria-label={`Localizar ${stop.title} no mapa`}
          aria-pressed={isFocused}
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {position + 1}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">{stop.title}</p>
              {(stop.start_time || stop.duration_minutes) && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {stop.start_time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {stop.start_time.slice(0, 5)}
                        {stop.end_time ? ` – ${stop.end_time.slice(0, 5)}` : ""}
                      </span>
                    </span>
                  )}
                  {stop.duration_minutes && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                      {Math.floor(stop.duration_minutes / 60)}h
                      {stop.duration_minutes % 60 > 0 ? ` ${stop.duration_minutes % 60}min` : ""}
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Arrastar ${stop.title}`}
              disabled={disabled}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {stop.location && (
            <p className="mt-1.5 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{stop.location}</span>
            </p>
          )}

          {meta.text && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {meta.text}
            </p>
          )}

          {/* Bloco de info rica: telefone, site, horário, Wikipedia */}
          {(hasRichInfo || wiki) && (
            <div
              className={`mt-3 grid gap-2 text-xs sm:grid-cols-2 ${
                expanded ? "" : "max-h-0 overflow-hidden sm:max-h-none"
              }`}
            >
              {(meta.phone || meta.website || meta.openingHours) && (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Informações úteis
                  </p>
                  <ul className="mt-1.5 space-y-1 text-foreground">
                    {meta.openingHours && (
                      <li className="flex items-start gap-1.5">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="line-clamp-1" title={meta.openingHours}>
                          {meta.openingHours}
                        </span>
                      </li>
                    )}
                    {meta.phone && (
                      <li className="flex items-start gap-1.5">
                        <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <a
                          href={`tel:${meta.phone}`}
                          className="line-clamp-1 hover:underline"
                          title={meta.phone}
                        >
                          {meta.phone}
                        </a>
                      </li>
                    )}
                    {meta.website && (
                      <li className="flex items-start gap-1.5">
                        <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <a
                          href={meta.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-1 hover:underline"
                          title={meta.website}
                        >
                          {meta.website.replace(/^https?:\/\//, "")}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {wiki && (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sobre
                  </p>
                  <p className="mt-1 line-clamp-3 text-foreground">{wiki.extract}</p>
                  <a
                    href={wiki.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <BookOpen className="h-3 w-3" />
                    Ler na Wikipedia
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Ações inline */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 text-xs font-bold text-primary hover:bg-primary/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ver avaliações de ${stop.title} no Google Maps`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              ⭐ Avaliações no Google
            </a>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Como chegar em ${stop.title} no Google Maps`}
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              🚗 Como Chegar
            </a>
            {meta.rating !== null && (
              <span className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {meta.rating.toLocaleString("pt-BR")}
              </span>
            )}
            {hasRichInfo && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-foreground sm:hidden"
                aria-expanded={expanded}
              >
                {expanded ? "Ocultar" : "Detalhes"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={disabled || position === 0}
          onClick={() => onMove(stop.date, position - 1)}
          aria-label={`Mover ${stop.title} para cima`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={disabled || position === itemCount - 1}
          onClick={() => onMove(stop.date, position + 1)}
          aria-label={`Mover ${stop.title} para baixo`}
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
        {dayOptions.length > 1 && (
          <label className="relative">
            <span className="sr-only">Mover {stop.title} para outro dia</span>
            <select
              value={stop.date}
              disabled={disabled}
              onChange={(event) => onMove(event.target.value, Number.MAX_SAFE_INTEGER)}
              className="h-10 max-w-36 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mover ${stop.title} para outro dia`}
            >
              {dayOptions.map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={onEdit}
          aria-label={`Editar ${stop.title}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label={`Excluir ${stop.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
