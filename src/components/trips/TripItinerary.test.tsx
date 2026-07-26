import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TripItinerary } from "./TripItinerary";
import type { Trip } from "@/hooks/useTrips";

const queryResult = { data: [], error: null };
const builder = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  then: (resolve: (value: typeof queryResult) => void) =>
    Promise.resolve(queryResult).then(resolve),
};
builder.select.mockReturnValue(builder);
builder.eq.mockReturnValue(builder);
builder.order.mockReturnValue(builder);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => builder),
    rpc: vi.fn(),
  },
}));

vi.mock("./TripRouteMap", () => ({
  TripRouteMap: () => <div role="region" aria-label="Mapa do roteiro" />,
}));

vi.mock("./AITripSuggestions", () => ({
  AITripSuggestions: () => <button type="button">Gerar sugestões</button>,
}));

vi.mock("@/services/overpassService", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/overpassService")>();
  return {
    ...original,
    geocodeDestination: vi.fn(),
    reverseGeocode: vi.fn(),
    searchPlaces: vi.fn(),
  };
});

const trip: Trip = {
  id: "trip-1",
  owner_id: "user-1",
  name: "Fim de semana em Lisboa",
  destination: "Lisboa",
  start_date: "2026-08-21",
  end_date: "2026-08-22",
  currency: "EUR",
  budget: 1000,
  status: "PLANNING",
  cover_image: null,
  notes: null,
  is_archived: false,
  archived_at: null,
  latitude: 38.7223,
  longitude: -9.1393,
  itinerary_order_version: 0,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

describe("TripItinerary", () => {
  it("renderiza o planejador por dias e alterna entre mapa e roteiro no mobile", async () => {
    const user = userEvent.setup();
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    expect(await screen.findByRole("heading", { name: "Lisboa" })).toBeInTheDocument();
    expect(screen.getByText("Dia 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mapa do roteiro" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /roteiro \(0\)/i }));

    expect(screen.getByRole("navigation", { name: "Dias da viagem" })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma parada neste dia")).toBeInTheDocument();
  });
});
