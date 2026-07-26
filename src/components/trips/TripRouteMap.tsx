import "leaflet/dist/leaflet.css";

import L, { LatLngBoundsExpression } from "leaflet";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { getCategoryColor } from "@/services/overpassService";

export interface MappedItineraryItem {
  id: string;
  title: string;
  location: string | null;
  date: string;
  start_time: string | null;
  latitude: number | null;
  longitude: number | null;
  category?: string | null;
}

interface TripRouteMapProps {
  items: MappedItineraryItem[];
  /** Centro do mapa quando ainda não há pins (ex.: coordenadas do destino da viagem) */
  fallbackCenter?: { lat: number; lon: number } | null;
  /** Toque no mapa → soltar um pin para criar atividade */
  onMapPick?: (pick: { lat: number; lon: number }) => void;
  /** Arrastar um marcador existente → atualizar coordenadas */
  onMarkerMove?: (id: string, lat: number, lon: number) => void;
  /** Item selecionado na lista — centraliza e realça o pin correspondente */
  focusedId?: string | null;
  /** Data exibida nas métricas da rota */
  activeDateLabel?: string;
}

function FocusMarker({ position, active }: { position: [number, number]; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) map.setView(position, Math.max(map.getZoom(), 15));
      else map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, position[0], position[1]]);
  return null;
}

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    if (positions.length > 1) {
      map.fitBounds(positions as LatLngBoundsExpression, { padding: [36, 36], maxZoom: 15 });
    }
  }, [map, positions]);

  return null;
}

function MapClickHandler({ onPick }: { onPick: (p: { lat: number; lon: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

interface RouteState {
  geometry: [number, number][] | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  status: "idle" | "loading" | "ready" | "error";
}

function useOsrmRoute(positions: [number, number][]): RouteState {
  const [route, setRoute] = useState<RouteState>({
    geometry: null,
    distanceMeters: null,
    durationSeconds: null,
    status: "idle",
  });
  const key = positions.map((p) => p.join(",")).join(";");

  useEffect(() => {
    if (positions.length < 2) {
      setRoute({
        geometry: null,
        distanceMeters: null,
        durationSeconds: null,
        status: "idle",
      });
      return;
    }
    const controller = new AbortController();
    const coords = positions.map(([lat, lon]) => `${lon},${lat}`).join(";");
    setRoute((current) => ({ ...current, status: "loading" }));
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const firstRoute = data?.routes?.[0];
        const geometry: [number, number][] | undefined = firstRoute?.geometry?.coordinates;
        if (!geometry) {
          setRoute({
            geometry: null,
            distanceMeters: null,
            durationSeconds: null,
            status: "error",
          });
          return;
        }
        setRoute({
          geometry: geometry.map(([lon, lat]) => [lat, lon] as [number, number]),
          distanceMeters: Number(firstRoute.distance),
          durationSeconds: Number(firstRoute.duration),
          status: "ready",
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "AbortError") return;
        setRoute({
          geometry: null,
          distanceMeters: null,
          durationSeconds: null,
          status: "error",
        });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return route;
}

export function TripRouteMap({
  items,
  fallbackCenter,
  onMapPick,
  onMarkerMove,
  focusedId,
  activeDateLabel,
}: TripRouteMapProps) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const mappedItems = useMemo(
    () => items.filter((item) => item.latitude !== null && item.longitude !== null),
    [items]
  );
  const positions = useMemo<[number, number][]>(
    () => mappedItems.map((item) => [Number(item.latitude), Number(item.longitude)]),
    [mappedItems]
  );
  const osrmRoute = useOsrmRoute(positions);
  const focusedPosition = useMemo(() => {
    const focused = mappedItems.find((item) => item.id === focusedId);
    return focused
      ? ([Number(focused.latitude), Number(focused.longitude)] as [number, number])
      : null;
  }, [mappedItems, focusedId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (mappedItems.length === 0 && !fallbackCenter) return null;

  const center: [number, number] = positions[0] ?? [fallbackCenter!.lat, fallbackCenter!.lon];

  return (
    <section
      className="relative overflow-hidden rounded-lg border border-border bg-card"
      aria-label="Mapa do roteiro"
      aria-describedby="trip-route-status"
    >
      {!isOnline ? (
        <div className="grid min-h-[420px] place-items-center bg-muted/35 p-6 text-center">
          <div>
            <MapPin className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <p className="mt-3 font-semibold text-foreground">Mapa indisponível sem internet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu roteiro continua acessível na lista.
            </p>
          </div>
        </div>
      ) : (
        <MapContainer
          center={center}
          zoom={positions.length > 0 ? 13 : 12}
          scrollWheelZoom
          className="h-[52vh] min-h-[420px] max-h-[680px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {onMapPick && <MapClickHandler onPick={onMapPick} />}
          <FitRoute positions={positions} />
          {focusedPosition && <FocusMarker position={focusedPosition} active />}
          {positions.length > 1 && (
            <Polyline
              positions={osrmRoute.geometry ?? positions}
              pathOptions={
                osrmRoute.geometry
                  ? { color: "#2563eb", weight: 4, opacity: 0.8 }
                  : { color: "#2563eb", weight: 4, opacity: 0.72, dashArray: "8 8" }
              }
            />
          )}
          {mappedItems.map((item, index) => {
            const isFocused = focusedId === item.id;
            const position: [number, number] = [Number(item.latitude), Number(item.longitude)];
            return (
              <Marker
                key={item.id}
                position={position}
                draggable={!!onMarkerMove}
                eventHandlers={
                  onMarkerMove
                    ? {
                        dragend: (e) => {
                          const pos = (e.target as L.Marker).getLatLng();
                          onMarkerMove(item.id, pos.lat, pos.lng);
                        },
                      }
                    : undefined
                }
                icon={L.divIcon({
                  className: "",
                  html: `<div style="width:${isFocused ? 38 : 30}px;height:${isFocused ? 38 : 30}px;border-radius:50%;display:grid;place-items:center;background:${isFocused ? "hsl(var(--primary))" : getCategoryColor(item.category)};color:#fff;border:3px solid #fff;box-shadow:0 2px ${isFocused ? 14 : 8}px rgba(0,0,0,.32);font:700 ${isFocused ? 14 : 12}px system-ui">${index + 1}</div>`,
                  iconSize: [isFocused ? 38 : 30, isFocused ? 38 : 30],
                  iconAnchor: [isFocused ? 19 : 15, isFocused ? 19 : 15],
                })}
              >
                <Tooltip direction="top" offset={[0, -16]}>
                  <strong>{item.title}</strong>
                  {item.location && <span className="block">{item.location}</span>}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      )}
      <div
        id="trip-route-status"
        className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-background px-4 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span className="font-semibold text-foreground">
          {activeDateLabel ? `Rota de ${activeDateLabel}` : "Rota selecionada"}
        </span>
        {positions.length < 2 && <span>Adicione dois lugares com pin para calcular a rota.</span>}
        {osrmRoute.status === "loading" && <span>Calculando distância e duração…</span>}
        {osrmRoute.status === "ready" && (
          <>
            <span>
              {(Number(osrmRoute.distanceMeters) / 1000).toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}{" "}
              km
            </span>
            <span>
              {Math.max(1, Math.round(Number(osrmRoute.durationSeconds) / 60))} min de carro
            </span>
          </>
        )}
        {osrmRoute.status === "error" && (
          <span>Não conseguimos calcular a rota agora. O traçado exibido é aproximado.</span>
        )}
      </div>
      {onMapPick && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-[1000] -translate-x-1/2">
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 text-xs font-medium text-muted-foreground shadow-md backdrop-blur">
            <MapPin className="h-3 w-3" />
            Toque no mapa para adicionar uma parada
          </span>
        </div>
      )}
    </section>
  );
}
