import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "./MobileNav";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  }
);

vi.mock("@/hooks/useTransactionModal", () => ({
  useTransactionModal: () => ({ setShowTransactionModal: vi.fn() }),
}));

describe("MobileNav", () => {
  it("keeps Settings directly available as an item in the horizontal mobile navigation", () => {
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Navegação móvel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configurações" })).toBeInTheDocument();
  });
});
