import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TransactionForm } from "./TransactionForm";

// Mock heavy hooks that call Supabase
vi.mock("./form/useTransactionForm", () => ({
  useTransactionForm: () => ({
    form: {
      type: "EXPENSE",
      amount: "",
      description: "",
      category_id: "",
      account_id: "",
      date: new Date().toISOString().split("T")[0],
      is_recurring: false,
      notes: "",
    },
    setForm: vi.fn(),
    accounts: [],
    categories: [],
    isSubmitting: false,
    handleSubmit: vi.fn(),
    activeTab: "EXPENSE" as const,
    setActiveTab: vi.fn(),
    trips: [],
    selectedTrip: null,
    setSelectedTrip: vi.fn(),
  }),
}));

vi.mock("@/hooks/transactions/useTransactionMutations", () => ({
  useUpdateRecurringSeries: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("./form/AmountInput", () => ({
  AmountInput: () => <div data-testid="amount-input" />,
}));

vi.mock("./form/BasicInfoSection", () => ({
  BasicInfoSection: () => <div data-testid="basic-info" />,
}));

vi.mock("./form/AccountSelector", () => ({
  AccountSelector: () => <div data-testid="account-selector" />,
}));

vi.mock("./form/AdvancedOptions", () => ({
  AdvancedOptions: () => <div data-testid="advanced-options" />,
}));

vi.mock("./SplitModal", () => ({
  SplitModal: () => null,
}));

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={createClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

describe("TransactionForm", () => {
  it("renders empty form (snapshot)", () => {
    const { container } = wrap(<TransactionForm />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with initial expense data (snapshot)", () => {
    const { container } = wrap(
      <TransactionForm
        initialData={{
          type: "EXPENSE",
          amount: 100,
          description: "Almoço",
        }}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
