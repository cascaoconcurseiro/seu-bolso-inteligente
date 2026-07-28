/**
 * Tipos compartilhados pela página de roteiro e seus componentes.
 * Mantém contratos estáveis para os hooks e mutations.
 */
export type PlaceCategory = string;

export const PLACE_CATEGORIES = [
  { id: "hotel", label: "Hospedagem", color: "#3b82f6" },
  { id: "restaurant", label: "Restaurante", color: "#f97316" },
  { id: "cafe", label: "Café/Padaria", color: "#f97316" },
  { id: "bar", label: "Bar/Vida Noturna", color: "#f97316" },
  { id: "park", label: "Parque/Natureza", color: "#22c55e" },
  { id: "museum", label: "Museu/Cultura", color: "#a855f7" },
  { id: "shopping", label: "Compras", color: "#ec4899" },
  { id: "beach", label: "Praia", color: "#22c55e" },
  { id: "historic", label: "Histórico", color: "#a855f7" },
  { id: "airport", label: "Aeroporto", color: "#64748b" },
  { id: "transport", label: "Transporte/Estação", color: "#64748b" },
];

export interface PlaceSearchResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PlaceCategory;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
}

export interface ItineraryStop {
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
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  place_id: string | null;
  reservation_id: string | null;
  duration_minutes: number | null;
  transport_mode: string | null;
}

export interface ItineraryStopMeta {
  text: string;
  mapsUrl: string;
  rating: number | null;
  /** Campos ricos extraídos do JSON embutido em description (futuro) */
  notes?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  wikipediaUrl?: string;
}

/** Extrai o bloco `<!--meta:JSON-->` salvo dentro do `description`. */
export function parseStopMeta(desc: string | null): ItineraryStopMeta {
  if (!desc) return { text: "", mapsUrl: "", rating: null };
  const match = desc.match(/<!--meta:(.+?)-->/);
  if (!match) return { text: desc, mapsUrl: "", rating: null };
  try {
    const meta = JSON.parse(match[1]) as Partial<ItineraryStopMeta>;
    return {
      text: desc.replace(/<!--meta:.+?-->/, "").trim(),
      mapsUrl: meta.mapsUrl || "",
      rating: meta.rating ?? null,
      notes: meta.notes,
      phone: meta.phone,
      website: meta.website,
      openingHours: meta.openingHours,
      wikipediaUrl: meta.wikipediaUrl,
    };
  } catch {
    return { text: desc.replace(/<!--meta:.+?-->/, "").trim(), mapsUrl: "", rating: null };
  }
}
