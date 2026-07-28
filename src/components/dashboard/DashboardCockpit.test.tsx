import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardQuickAccess } from "./DashboardQuickAccess";
import { DashboardRecentActivity } from "./DashboardRecentActivity";

vi.mock("@/contexts/PrivacyContext", () => ({
  usePrivacy: () => ({ isPrivate: false }),
}));

describe("Dashboard cockpit", () => {
  it("organiza os atalhos como navegação nomeada", () => {
    render(
      <MemoryRouter>
        <DashboardQuickAccess />
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Acesso rápido" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("expõe a atividade recente como uma lista semântica", () => {
    render(
      <MemoryRouter>
        <DashboardRecentActivity
          recentTransactions={[
            {
              id: "tx-1",
              date: "2026-07-28",
              description: "Mercado",
              type: "EXPENSE",
              amount: 120,
              currency: "BRL",
              is_shared: true,
              category: { name: "Alimentação", icon: "🛒" },
            },
          ]}
          formatCurrencyWithSymbol={(value) => `R$ ${value.toFixed(2)}`}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("list", { name: "Transações recentes" })).toBeInTheDocument();
    expect(screen.getByText("Compartilhada")).toHaveClass("sr-only");
  });
});
