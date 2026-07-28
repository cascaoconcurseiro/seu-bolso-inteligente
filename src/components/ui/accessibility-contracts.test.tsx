import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmountInput } from "./amount-input";
import { CurrencyInput } from "./currency-input";
import { FormField } from "./form-field";
import { InfoTooltip } from "./info-tooltip";
import { Input } from "./input";

describe("shared form accessibility contracts", () => {
  it("gives AmountInput an accessible label and error relationship", () => {
    render(
      <AmountInput
        label="Valor da contribuição"
        value=""
        onChange={vi.fn()}
        error="Informe um valor maior que zero"
      />
    );

    const input = screen.getByRole("textbox", { name: "Valor da contribuição" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Informe um valor maior que zero");
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um valor maior que zero");
  });

  it("gives a standalone CurrencyInput a safe fallback name", () => {
    render(<CurrencyInput value="" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Valor monetário" })).toBeInTheDocument();
  });

  it("connects FormField label, hint and error to its child input", () => {
    const { rerender } = render(
      <FormField label="Apelido" hint="Como a conta será exibida">
        <Input />
      </FormField>
    );

    const input = screen.getByRole("textbox", { name: "Apelido" });
    expect(input).toHaveAccessibleDescription("Como a conta será exibida");

    rerender(
      <FormField label="Apelido" error="Apelido obrigatório">
        <Input />
      </FormField>
    );

    expect(screen.getByRole("textbox", { name: "Apelido" })).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(screen.getByRole("textbox", { name: "Apelido" })).toHaveAccessibleDescription(
      "Apelido obrigatório"
    );
  });

  it("exposes InfoTooltip as a keyboard-focusable named button", () => {
    render(<InfoTooltip content="Explica este indicador" />);

    const trigger = screen.getByRole("button", { name: "Mais informações" });
    expect(trigger).not.toHaveAttribute("tabindex", "-1");
  });
});
