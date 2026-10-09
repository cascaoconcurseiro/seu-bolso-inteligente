import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreditCardSummary } from "./CreditCardSummary";

describe("CreditCardSummary", () => {
  it("identifies an overdue invoice instead of calling it today", () => {
    render(
      <CreditCardSummary
        totalInvoices={100}
        totalDebt={500}
        nextDueDate={-4}
        formatCurrency={(value) => `R$ ${value}`}
      />
    );

    expect(screen.getByText("4 dias atrasado")).toBeInTheDocument();
    expect(screen.queryByText("Hoje")).not.toBeInTheDocument();
  });
});
