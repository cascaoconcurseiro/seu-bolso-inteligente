import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TripCard } from "./TripCard";

const financialQuery = vi.hoisted(() => ({
  data: undefined as { total_spent: number } | undefined,
  isPending: false,
  isError: false,
}));

vi.mock("@/hooks/useTrips", () => ({
  useTripFinancialSummary: () => financialQuery,
}));

const trip = {
  id: "trip-1",
  name: "Japão 2026",
  destination: "Tóquio",
  start_date: "2026-09-12",
  end_date: "2026-09-18",
  budget: 1000,
  currency: "BRL",
  status: "PLANNING",
  cover_image: null,
};

describe("TripCard", () => {
  beforeEach(() => {
    financialQuery.data = { total_spent: 250 };
    financialQuery.isPending = false;
    financialQuery.isError = false;
  });

  it("mantém título e detalhes semânticos e abre pelo controle dedicado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TripCard trip={trip} onClick={onClick} />);

    expect(screen.getByRole("heading", { name: "Japão 2026" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Abrir viagem Japão 2026" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("não transforma loading ou erro financeiro em gasto zero", () => {
    financialQuery.data = undefined;
    financialQuery.isPending = true;
    const { rerender } = render(<TripCard trip={trip} onClick={vi.fn()} />);
    expect(screen.getByLabelText("Carregando resumo financeiro")).toBeVisible();

    financialQuery.isPending = false;
    financialQuery.isError = true;
    rerender(<TripCard trip={trip} onClick={vi.fn()} />);
    expect(screen.getByText("Resumo indisponível")).toBeVisible();
  });

  it("mostra ausência de orçamento e o status cancelado", () => {
    render(<TripCard trip={{ ...trip, budget: null, status: "CANCELLED" }} onClick={vi.fn()} />);
    expect(screen.getByText("Sem orçamento definido")).toBeVisible();
    expect(screen.getByText("Cancelada")).toBeVisible();
  });

  it("preserva o percentual real quando o orçamento estoura", () => {
    financialQuery.data = { total_spent: 1350 };
    render(<TripCard trip={trip} onClick={vi.fn()} />);
    expect(screen.getByText("135% utilizado")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
