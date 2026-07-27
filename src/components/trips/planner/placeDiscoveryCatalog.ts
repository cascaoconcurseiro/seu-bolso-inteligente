import type { PlaceCategory } from "@/services/overpassService";

export interface PlaceDiscoveryPreset {
  id: string;
  label: string;
  query: string;
  category: PlaceCategory | null;
  group: "quick" | "more";
}

/**
 * Catálogo de pesquisas livres compatível com Photon, Nominatim e OpenStreetMap.
 * Os itens sem categoria nativa usam texto livre, evitando dependência de APIs pagas.
 */
export const PLACE_DISCOVERY_PRESETS: PlaceDiscoveryPreset[] = [
  { id: "restaurant", label: "Comer", query: "restaurant", category: "restaurant", group: "quick" },
  { id: "market", label: "Compras", query: "supermarket shopping", category: null, group: "quick" },
  { id: "health", label: "Saúde", query: "pharmacy hospital", category: null, group: "quick" },
  { id: "transport", label: "Transporte", query: "station airport", category: "transport", group: "quick" },
  { id: "attraction", label: "Turismo", query: "tourist attraction museum", category: "attraction", group: "more" },
  { id: "hotel", label: "Hospedagem", query: "hotel hostel", category: "hotel", group: "more" },
  { id: "gym", label: "Academia", query: "gym fitness centre", category: null, group: "more" },
  { id: "cafe", label: "Café", query: "cafe coffee", category: null, group: "more" },
  { id: "pharmacy", label: "Farmácia", query: "pharmacy", category: null, group: "more" },
  { id: "hospital", label: "Hospital", query: "hospital clinic", category: null, group: "more" },
  { id: "atm", label: "Caixa eletrônico", query: "atm bank", category: null, group: "more" },
  { id: "parking", label: "Estacionamento", query: "parking", category: null, group: "more" },
  { id: "laundry", label: "Lavanderia", query: "laundry laundromat", category: null, group: "more" },
  { id: "park", label: "Parque", query: "park garden", category: null, group: "more" },
  { id: "beach", label: "Praia", query: "beach", category: "beach", group: "more" },
  { id: "nightlife", label: "Vida noturna", query: "bar pub nightclub", category: null, group: "more" },
];

export const QUICK_PLACE_PRESETS = PLACE_DISCOVERY_PRESETS.filter((item) => item.group === "quick");
export const MORE_PLACE_PRESETS = PLACE_DISCOVERY_PRESETS.filter((item) => item.group === "more");
