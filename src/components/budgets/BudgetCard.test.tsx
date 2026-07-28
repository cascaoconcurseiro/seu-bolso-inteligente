import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetProgress } from "@/types/database";
import { BudgetCard } from "./BudgetCard";

describe("BudgetCard", () => {
  it("keeps card content non-interactive and exposes explicit actions", () => {
    const onEdit = vi.fn();
    const budget = {
      budget_id: "budget-1",
      budget_name: "Mercado",
      category_name: "Supermercado",
      category_icon: "🛒",
      currency: "BRL",
      spent_amount: 250,
      budget_amount: 1000,
      percentage_used: 25,
    } as BudgetProgress;

    render(
      <BudgetCard budget={budget} formatCurrency={() => ""} onEdit={onEdit} onDelete={vi.fn()} />
    );

    expect(screen.queryByRole("button", { name: /Orçamento:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir orçamento Mercado" }));
    expect(onEdit).toHaveBeenCalledWith(budget);
  });
});
