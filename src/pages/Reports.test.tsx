import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Reports } from "./Reports";

const mocks = vi.hoisted(() => ({
  useTransactions: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/contexts/MonthContext", () => ({
  useMonth: () => ({ currentDate: new Date(2026, 9, 1) }),
}));
vi.mock("@/hooks/useTransactions", () => ({ useTransactions: mocks.useTransactions }));
vi.mock("@/hooks/useAccounts", () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock("@/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/hooks/useFamily", () => ({ useFamilyMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/useSharedFinances", () => ({
  useSharedFinances: () => ({ invoices: [], transactions: [] }),
}));
vi.mock("@/hooks/useTransactionModal", () => ({
  useTransactionModal: () => ({ showTransactionModal: false, setShowTransactionModal: vi.fn() }),
}));
vi.mock("./reports/useReportsData", () => ({ useReportsData: () => ({}) }));

describe("Reports transaction loading errors", () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.useTransactions.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it("shows an error and retry action instead of the empty-period state", () => {
    mocks.useTransactions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });

    render(<Reports />);

    expect(screen.getByRole("heading", { name: "Erro ao carregar relatórios" })).toBeVisible();
    expect(screen.queryByText("Nenhum dado neste período")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
