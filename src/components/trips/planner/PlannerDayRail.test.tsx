import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlannerDayRail } from "./PlannerDayRail";

describe("PlannerDayRail", () => {
  it("expõe o dia ativo, a quantidade de paradas e permite trocar de dia pelo teclado", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <PlannerDayRail
        days={[
          { date: "2026-08-21", label: "Sex, 21 ago", itemCount: 2 },
          { date: "2026-08-22", label: "Sáb, 22 ago", itemCount: 0 },
        ]}
        activeDate="2026-08-21"
        onSelect={onSelect}
      />
    );

    expect(screen.getByRole("button", { name: /sex, 21 ago/i })).toHaveAttribute(
      "aria-current",
      "date"
    );
    expect(screen.getByText("2 paradas")).toBeInTheDocument();
    expect(screen.getByText("Dia livre")).toBeInTheDocument();

    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("2026-08-22");
  });
});
