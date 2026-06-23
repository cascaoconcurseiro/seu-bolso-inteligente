import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PayInvoiceDialog } from "./PayInvoiceDialog";

describe("PayInvoiceDialog", () => {
  it("renderiza o dialogo aberto sem quebrar", () => {
    render(
      <PayInvoiceDialog
        isOpen
        onClose={vi.fn()}
        card={{
          id: "card-1",
          name: "Cartao Principal",
          bank_id: "nubank",
          currency: "BRL",
          is_international: false,
        }}
        invoiceTotal={250}
        accounts={[
          {
            id: "account-1",
            name: "Conta Corrente",
            bank_id: "itau",
            balance: 1000,
            currency: "BRL",
            is_international: false,
          },
        ]}
        onPay={vi.fn()}
      />,
    );

    expect(screen.getByText("Pagar Fatura")).toBeInTheDocument();
    expect(screen.getByText("Cartao Principal")).toBeInTheDocument();
  });
});
