import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { AccountCard } from "./AccountCard";

vi.mock("@/contexts/PrivacyContext", () => ({
  usePrivacy: () => ({ isPrivate: false }),
}));

vi.mock("@/components/financial/BankIcon", () => ({
  BankIcon: ({ bankId }: { bankId: string | null }) => (
    <div data-testid="bank-icon" data-bank={bankId} />
  ),
}));

vi.mock("@/lib/banks", () => ({
  getBankById: () => ({ color: "#6B35C9", textColor: "#FFFFFF" }),
}));

const account = {
  id: "acc-1",
  name: "Conta Principal",
  type: "CHECKING",
  balance: 2500.5,
  bank_id: "nubank",
  currency: "BRL",
  is_international: false,
  bank_color: null,
  hide_balance: false,
};

const defaultProps = {
  account,
  lastTransactions: [
    {
      id: "tx-1",
      description: "Supermercado",
      type: "EXPENSE",
      amount: 150,
      destination_account_id: null,
    },
  ],
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
  getCurrencySymbol: () => "R$",
  accountTypeLabels: { CHECKING: "Conta Corrente", SAVINGS: "Poupança", CREDIT_CARD: "Cartão de Crédito", GLOBAL_ACCOUNT: "Conta Global" },
};

describe("AccountCard", () => {
  const wrap = (props = defaultProps) =>
    render(
      <MemoryRouter>
        <AccountCard {...props} />
      </MemoryRouter>
    );

  it("renders correctly (snapshot)", () => {
    const { container } = wrap();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders international account (snapshot)", () => {
    const { container } = wrap({
      ...defaultProps,
      account: { ...account, is_international: true, currency: "USD" },
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with hidden balance (snapshot)", () => {
    const { container } = wrap({
      ...defaultProps,
      account: { ...account, hide_balance: true },
    });
    expect(container.firstChild).toMatchSnapshot();
  });
});
