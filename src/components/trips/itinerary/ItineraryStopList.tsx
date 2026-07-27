import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Footprints, MapPin, Navigation2, Plus, Route as RouteIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItineraryStopCard } from "./ItineraryStopCard";
import type { ItineraryStop, ItineraryStopMeta } from "./types";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItineraryStopListProps {
  activeDate: string;
  activeItems: ItineraryStop[];
  dayCount: number;
  dayIndex: number;
  dayOptions: Array<{ date: string; label: string }>;
  parsedMetas: Record<string, ItineraryStopMeta>;
  focusedId: string | null;
  reorderPending: boolean;
  reorderAnnouncement: string;
  onFocus: (id: string | null) => void;
  onEdit: (stop: ItineraryStop) => void;
  onDelete: (stop: ItineraryStop) => void;
  onMove: (id: string, targetDate: string, targetIndex: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAddStop: () => void;
  onOptimize: () => void;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function travelEstimate(a: ItineraryStop, b: ItineraryStop): { label: string; km: number; min: number } | null {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) {
    return null;
  }
  const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  if (km < 0.05) return null;
  if (km <= 1.5) {
    const min = Math.max(3, Math.round(km * 12));
    return { label: `🚶 ${min} min a pé · ${Math.round(km * 1000)} m`, km, min };
  }
  const min = Math.max(5, Math.round(km * 2.5));
  return { label: `🚗 ${min} min de carro · ${km.toFixed(1)} km`, km, min };
}

export function ItineraryStopList({
  activeDate,
  activeItems,
  dayCount,
  dayIndex,
  dayOptions,
  parsedMetas,
  focusedId,
  reorderPending,
  reorderAnnouncement,
  onFocus,
  onEdit,
  onDelete,
  onMove,
  onDragEnd,
  onAddStop,
  onOptimize,
}: ItineraryStopListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const totalKm = activeItems.reduce((acc, item, idx) => {
    const next = activeItems[idx + 1];
    if (!next) return acc;
    return acc + (travelEstimate(item, next)?.km ?? 0);
  }, 0);
  const totalMin = activeItems.reduce((acc, item, idx) => {
    const next = activeItems[idx + 1];
    if (!next) return acc;
    return acc + (travelEstimate(item, next)?.min ?? 0);
  }, 0);

  return (
    <section aria-labelledby="active-day-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Dia {Math.max(1, dayIndex + 1)} de {dayCount}
          </p>
          <h3
            id="active-day-title"
            className="text-lg font-bold capitalize tracking-tight text-foreground sm:text-xl"
          >
            {activeDate
              ? dateFns.format(dateFns.parseISO(activeDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
              : "Escolha um dia"}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1">
            <Navigation2 className="h-3.5 w-3.5" aria-hidden="true" />
            <strong className="text-foreground">{activeItems.length}</strong> paradas
          </span>
          {totalKm > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1">
              <RouteIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <strong className="text-foreground">{totalKm.toFixed(1)} km</strong> ·{" "}
              <span>~{totalMin} min</span>
            </span>
          )}
          {activeItems.length >= 2 && (
            <Button asChild variant="outline" size="sm" className="min-h-9 text-emerald-600">
              <a
                href={(() => {
                  const mapped = activeItems.filter(
                    (i) => i.latitude !== null && i.longitude !== null
                  );
                  if (mapped.length < 2) return "#";
                  const origin = `${mapped[0].latitude},${mapped[0].longitude}`;
                  const dest = `${mapped[mapped.length - 1].latitude},${mapped[mapped.length - 1].longitude}`;
                  const waypoints = mapped
                    .slice(1, -1)
                    .slice(0, 9)
                    .map((i) => `${i.latitude},${i.longitude}`)
                    .join("|");
                  const params = new URLSearchParams({
                    api: "1",
                    origin,
                    destination: dest,
                    travelmode: "driving",
                  });
                  if (waypoints) params.set("waypoints", waypoints);
                  return `https://www.google.com/maps/dir/?${params.toString()}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Footprints className="mr-1.5 h-3.5 w-3.5" />
                Navegar dia
              </a>
            </Button>
          )}
          {activeItems.length >= 2 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9 text-emerald-600"
              onClick={onOptimize}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Otimizar
            </Button>
          )}
        </div>
      </div>

      {activeItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <MapPin className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-foreground">
            Nenhuma parada neste dia
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Adicione uma parada manualmente, ou busque lugares próximos para começar a montar o
            roteiro do dia.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={onAddStop} className="min-h-11">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Adicionar parada
            </Button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={activeItems.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-2.5">
              {activeItems.map((item, index) => {
                const next = activeItems[index + 1];
                const estimate = next ? travelEstimate(item, next) : null;
                return (
                  <li key={item.id} className="space-y-2">
                    <ItineraryStopCard
                      stop={item}
                      position={index}
                      itemCount={activeItems.length}
                      destination={dayOptions[0]?.label ?? null}
                      meta={parsedMetas[item.id] ?? { text: "", mapsUrl: "", rating: null }}
                      dayOptions={dayOptions}
                      disabled={reorderPending}
                      isFocused={focusedId === item.id}
                      onFocus={() => onFocus(focusedId === item.id ? null : item.id)}
                      onEdit={() => onEdit(item)}
                      onDelete={() => onDelete(item)}
                      onMove={(targetDate, targetIndex) => onMove(item.id, targetDate, targetIndex)}
                    />
                    {estimate && (
                      <div className="flex items-center justify-center" aria-hidden="true">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {estimate.label}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {reorderAnnouncement}
      </p>
    </section>
  );
}
