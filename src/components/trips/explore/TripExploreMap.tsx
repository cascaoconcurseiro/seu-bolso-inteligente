import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { getCategoryColor, getPlaceCategoryFallbackImage, type PlaceSearchResult } from "@/services/overpassService";

interface TripExploreMapProps {
  center: { lat: number; lon: number };
  places: PlaceSearchResult[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function RecenterMap({ center }: { center: { lat: number; lon: number } }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lon], Math.max(map.getZoom(), 13), { duration: 0.45 });
  }, [center.lat, center.lon, map]);

  return null;
}

export function TripExploreMap({ center, places, selectedIndex, onSelect }: TripExploreMapProps) {
  const selected = selectedIndex === null ? null : places[selectedIndex];
  const focusCenter = selected ? { lat: selected.lat, lon: selected.lon } : center;

  return (
    <div className="relative h-full min-h-[390px] overflow-hidden rounded-2xl border border-border bg-muted/20">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={13}
        scrollWheelZoom
        className="h-full min-h-[390px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <RecenterMap center={focusCenter} />

        {places.map((place, index) => {
          const active = selectedIndex === index;
          const size = active ? 46 : 38;
          const image = place.imageUrl || getPlaceCategoryFallbackImage(place.name, place.category);
          const color = getCategoryColor(place.category);

          return (
            <Marker
              key={`${place.name}-${place.lat}-${place.lon}`}
              position={[place.lat, place.lon]}
              eventHandlers={{ click: () => onSelect(index) }}
              icon={L.divIcon({
                className: "",
                html: `<button type="button" aria-label="${place.name.replace(/"/g, "&quot;")}" style="width:${size}px;height:${size}px;border-radius:999px;border:3px solid white;background:${color};box-shadow:0 5px 18px rgba(15,23,42,.32);overflow:hidden;padding:0;display:block;transform:${active ? "scale(1.06)" : "scale(1)"};transition:transform .18s ease"><img src="${image}" alt="" style="width:100%;height:100%;object-fit:cover" /></button>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              })}
            >
              <Tooltip direction="top" offset={[0, -18]}>
                <strong>{place.name}</strong>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
