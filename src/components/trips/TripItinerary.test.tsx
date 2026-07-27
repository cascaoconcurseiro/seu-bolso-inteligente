import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TripItinerary } from "./TripItinerary";
import type { Trip } from "@/hooks/useTrips";
import { reverseGeocode, searchPlaces } from "@/services/overpassService";

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

  it("separa a descoberta de lugares do formulário de adicionar parada", async () => {
    const user = userEvent.setup();
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    await screen.findByRole("heading", { name: "Lisboa" });
    await user.click(screen.getAllByRole("button", { name: "Buscar lugares" })[0]);

    expect(screen.getByRole("heading", { name: "Buscar lugares" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Data")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Horário de início")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getAllByRole("button", { name: "Adicionar parada" })[0]);

    expect(screen.getByRole("heading", { name: "Nova atividade" })).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toBeInTheDocument();
    expect(screen.getByLabelText(/Início/)).toBeInTheDocument();
  });

  it("preenche título, endereço e link ao selecionar um lugar", async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce([
      {
        name: "Museu do Louvre",
        address: "Rue de Rivoli, Paris, França",
        lat: 48.8606111,
        lon: 2.337644,
      },
    ]);
    const user = userEvent.setup();
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    await screen.findByRole("heading", { name: "Lisboa" });
    await user.click(screen.getAllByRole("button", { name: "Adicionar parada" })[0]);
    await user.type(screen.getByRole("combobox", { name: "Buscar local" }), "Louvre");

    await waitFor(() => expect(searchPlaces).toHaveBeenCalled());
    await user.click(await screen.findByRole("option", { name: /Museu do Louvre/i }));

    expect(screen.getByLabelText(/Título/)).toHaveValue("Museu do Louvre");
    expect(screen.getByRole("combobox", { name: "Buscar local" })).toHaveValue(
      "Rue de Rivoli, Paris, França"
    );
    expect(screen.getByLabelText("Link do Google Maps")).toHaveValue(
      "https://www.google.com/maps/search/?api=1&query=48.8606111%2C2.337644"
    );
    expect(screen.getByText(/Local selecionado|Pin marcado|marcado no mapa/)).toBeInTheDocument();
  });

  it("impede adicionar uma parada quando o horário final é anterior ao inicial", async () => {
    const user = userEvent.setup();
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    await screen.findByRole("heading", { name: "Lisboa" });
    await user.click(screen.getAllByRole("button", { name: "Adicionar parada" })[0]);
    await user.type(screen.getByLabelText(/Título/), "Jantar");
    await user.type(screen.getByLabelText(/Início/), "20:00");
    await user.type(screen.getByLabelText(/Fim/), "19:00");
    await user.click(screen.getByRole("button", { name: "Adicionar ao roteiro" }));

    expect(
      screen.getByText("O horário de fim deve ser posterior ao horário de início")
    ).toBeInTheDocument();
  });

  it("identifica endereço pelo link do Maps sem sobrescrever um título personalizado", async () => {
    vi.mocked(reverseGeocode).mockResolvedValueOnce({
      name: "Museu do Louvre",
      address: "Rue de Rivoli, Paris, França",
    });
    const user = userEvent.setup();
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    await screen.findByRole("heading", { name: "Lisboa" });
    await user.click(screen.getAllByRole("button", { name: "Adicionar parada" })[0]);
    await user.type(screen.getByLabelText(/Título/), "Meu passeio no Louvre");
    if (!screen.queryByLabelText("Link do Google Maps")) {
      await user.click(screen.getByText(/Mais opções/i));
    }
    await user.type(
      screen.getByLabelText("Link do Google Maps"),
      "https://www.google.com/maps/place/Museu+do+Louvre/data=!3d48.8606111!4d2.337644"
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Buscar local" })).toHaveValue(
        "Rue de Rivoli, Paris, França"
      )
    );
    expect(screen.getByLabelText(/Título/)).toHaveValue("Meu passeio no Louvre");
    expect(reverseGeocode).toHaveBeenCalledWith(48.8606111, 2.337644);
  });
});
