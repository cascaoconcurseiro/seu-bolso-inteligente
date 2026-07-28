import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  ExternalLink,
  GripVertical,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
function getCategoryColor(category?: string | null) {
  if (!category) return "#3b82f6";
  const cat = category.toLowerCase();
  if (cat.includes("restauran") || cat.includes("food") || cat.includes("din")) return "#f97316";
  if (cat.includes("hotel") || cat.includes("lodg")) return "#3b82f6";
  if (cat.includes("park") || cat.includes("nature")) return "#22c55e";
  if (cat.includes("museum") || cat.includes("art")) return "#a855f7";
  if (cat.includes("shop")) return "#ec4899";
  return "#64748b";
}

export interface PlannerStop {
  id: string;
  title: string;
  date: string;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
}

interface ItineraryStopCardProps {
  item: PlannerStop;
  position: number;
  itemCount: number;
  destination: string | null;
  description: string;
  rating: number | null;
  isFocused: boolean;
  dayOptions: Array<{ date: string; label: string }>;
  disabled?: boolean;
  onFocus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (targetDate: string, targetIndex: number) => void;
}

export function ItineraryStopCard({
  item,
  position,
  itemCount,
  destination,
  description,
  rating,
  isFocused,
  dayOptions,
  disabled = false,
  onFocus,
  onEdit,
  onDelete,
  onMove,
}: ItineraryStopCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const mapsQuery = encodeURIComponent(
    `${item.location || item.title}${destination ? `, ${destination}` : ""}`
  );
  const mapsUrl = item.maps_url || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-stop-id={item.id}
      className={`group relative rounded-2xl border bg-card p-3 shadow-sm transition-[border-color,box-shadow,opacity] motion-reduce:transition-none ${
        isFocused
          ? "border-primary ring-2 ring-primary/15"
          : "border-border/70 hover:border-primary/35"
      } ${isDragging ? "z-20 opacity-60 shadow-xl" : ""}`}
    >
      <div
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: getCategoryColor(item.category) }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-2 pl-1">
        <button
          type="button"
          onClick={onFocus}
          aria-label={`Localizar ${item.title} no mapa`}
          aria-pressed={isFocused}
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {position + 1}
        </button>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{item.title}</p>
              {item.start_time && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {item.start_time.slice(0, 5)}
                    {item.end_time ? `–${item.end_time.slice(0, 5)}` : ""}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Arrastar ${item.title}`}
              disabled={disabled}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {item.location && (
            <p className="mt-1.5 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{item.location}</span>
            </p>
          )}
          {description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ver avaliações de ${item.title} no Google Maps`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              ⭐ Avaliações no Google
            </a>
            {rating !== null && (
              <span className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-foreground">
                {rating.toLocaleString("pt-BR")} de 5
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          disabled={disabled || position === 0}
          onClick={() => onMove(item.date, position - 1)}
          aria-label={`Mover ${item.title} para cima`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          disabled={disabled || position === itemCount - 1}
          onClick={() => onMove(item.date, position + 1)}
          aria-label={`Mover ${item.title} para baixo`}
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
        {dayOptions.length > 1 && (
          <label className="relative">
            <span className="sr-only">Mover {item.title} para outro dia</span>
            <select
              value={item.date}
              disabled={disabled}
              onChange={(event) => onMove(event.target.value, Number.MAX_SAFE_INTEGER)}
              className="h-11 max-w-32 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mover ${item.title} para outro dia`}
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
          className="h-11 w-11"
          onClick={onEdit}
          aria-label={`Editar ${item.title}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label={`Excluir ${item.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
