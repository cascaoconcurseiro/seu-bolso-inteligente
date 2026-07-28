import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionWarningDialog } from "./TransactionWarningDialog";

describe("TransactionWarningDialog", () => {
  it("uses dialog semantics and exposes both decisions", () => {
    const onOpenChange = vi.fn();
    const onContinue = vi.fn();

    render(
      <TransactionWarningDialog
        open
        warnings={["A data está fora do período esperado"]}
        onOpenChange={onOpenChange}
        onCancel={() => onOpenChange(false)}
        onContinue={onContinue}
      />
    );

    expect(screen.getByRole("dialog", { name: "Atenção" })).toHaveTextContent(
      "A data está fora do período esperado"
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
