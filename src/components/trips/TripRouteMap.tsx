import "leaflet/dist/leaflet.css";

import L, { LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

export interface MappedItineraryItem {
  id: string;
  title: string;
  location: string | null;
  date: string;
  start_time: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TripRouteMapProps {
  items: MappedItineraryItem[];
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

export function TripRouteMap({ items }: TripRouteMapProps) {
  const mappedItems = useMemo(
    () => items.filter((item) => item.latitude !== null && item.longitude !== null),
    [items]
  );
  const positions = useMemo<[number, number][]>(
    () => mappedItems.map((item) => [Number(item.latitude), Number(item.longitude)]),
    [mappedItems]
  );

  if (mappedItems.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-label="Mapa do roteiro"
    >
      <MapContainer
        center={positions[0]}
        zoom={13}
        scrollWheelZoom
        className="h-[320px] w-full md:h-[420px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRoute positions={positions} />
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.72 }}
          />
        )}
        {mappedItems.map((item, index) => (
          <Marker
            key={item.id}
            position={[Number(item.latitude), Number(item.longitude)]}
            icon={L.divIcon({
              className: "",
              html: `<div style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#111827;color:#fff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28);font:700 12px system-ui">${index + 1}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              <strong>{item.title}</strong>
              {item.location && <span className="block">{item.location}</span>}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
