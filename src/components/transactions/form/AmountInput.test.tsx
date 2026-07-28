import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "./AmountInput";

describe("transaction AmountInput", () => {
  it("has a specific accessible name", () => {
    render(<AmountInput currency="BRL" currencySymbol="R$" />);
    expect(screen.getByRole("textbox", { name: "Valor da transação" })).toBeInTheDocument();
  });
});
