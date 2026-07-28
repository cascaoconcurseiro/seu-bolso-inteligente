import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TripItinerary } from "./TripItinerary";
import type { Trip } from "../../hooks/useTrips";

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
  it("renderiza o planejador por dias e exibe navegação dos dias", async () => {
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    expect(await screen.findByRole("heading", { name: "Lisboa" })).toBeInTheDocument();
    expect(screen.getByText("Dia 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dias da viagem" })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma parada neste dia")).toBeInTheDocument();
  });

  it("abre o formulário atual de adicionar parada com os campos essenciais", async () => {
    const user = userEvent.setup();
    render(<TripItinerary trip={trip} />, { wrapper: TestProviders });

    await screen.findByRole("heading", { name: "Lisboa" });
    await user.click(screen.getAllByRole("button", { name: "Adicionar parada" })[0]);

    expect(screen.getByRole("heading", { name: "Nova atividade" })).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toBeInTheDocument();
    expect(screen.getByLabelText(/Início/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fim/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Título/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Buscar local" })).toBeInTheDocument();
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

  it("extrai o lugar do link do Maps sem sobrescrever um título personalizado", async () => {
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

    expect(screen.getByLabelText(/Título/)).toHaveValue("Meu passeio no Louvre");
    expect(screen.getByText("Local selecionado: Museu do Louvre")).toBeInTheDocument();
  });
});
