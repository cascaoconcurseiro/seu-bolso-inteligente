import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OFXImportModal } from "./OFXImportModal";

const mocks = vi.hoisted(() => ({
  insertRecords: vi.fn(),
  existingTransactions: [] as Array<Record<string, unknown>>,
  existingTransactionsError: null as { message: string } | null,
  supabaseFrom: vi.fn(),
  queryCalls: [] as Array<[string, ...unknown[]]>,
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [{ id: "account-1", name: "Conta teste", is_active: true }] }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: unknown[]) => mocks.supabaseFrom(...args) },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/utils/supabaseHelpers", () => ({
  insertRecords: (...args: unknown[]) => mocks.insertRecords(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    info: (...args: unknown[]) => mocks.toastInfo(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

async function uploadOfx(user: ReturnType<typeof userEvent.setup>, contents: string) {
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: "Conta teste" }));

  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("OFX file input was not rendered");

  const file = new File([contents], "extrato.ofx", { type: "application/x-ofx" });
  Object.defineProperty(file, "text", { value: async () => contents });
  fireEvent.change(input, { target: { files: [file] } });
}

const sgmlOfx = (transactions: string) => `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
${transactions}
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

describe("OFXImportModal", () => {
  beforeAll(() => {
    Object.defineProperties(Element.prototype, {
      hasPointerCapture: { configurable: true, value: () => false },
      setPointerCapture: { configurable: true, value: () => {} },
      releasePointerCapture: { configurable: true, value: () => {} },
      scrollIntoView: { configurable: true, value: () => {} },
    });
  });

  beforeEach(() => {
    mocks.insertRecords.mockReset().mockResolvedValue(undefined);
    mocks.existingTransactions = [];
    mocks.existingTransactionsError = null;
    mocks.queryCalls = [];
    mocks.supabaseFrom.mockReset().mockImplementation(() => {
      const chain: Record<string, (...args: unknown[]) => unknown> = {};
      let rangeStart = 0;
      let rangeEnd = 999;
      for (const method of ["select", "eq", "is", "or", "gte", "lte"]) {
        chain[method] = vi.fn((...args: unknown[]) => {
          mocks.queryCalls.push([method, ...args]);
          return chain;
        });
      }
      chain.order = vi.fn(() => chain);
      chain.range = vi.fn((start: unknown, end: unknown) => {
        rangeStart = Number(start);
        rangeEnd = Number(end);
        mocks.queryCalls.push(["range", start, end]);
        return chain;
      });
      chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: mocks.existingTransactions.slice(rangeStart, rangeEnd + 1),
          error: mocks.existingTransactionsError,
        }).then(resolve, reject);
      return chain;
    });
    mocks.toastSuccess.mockReset();
    mocks.toastInfo.mockReset();
    mocks.toastError.mockReset();
  });

  it("imports all transactions from a headered SGML statement into the selected account", async () => {
    const user = userEvent.setup();
    render(<OFXImportModal isOpen onClose={vi.fn()} />, { wrapper: createWrapper() });

    await uploadOfx(
      user,
      sgmlOfx(`
        <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261015<TRNAMT>-12.34<FITID>ofx-1<NAME>Loja A</STMTTRN>
        <STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261016<TRNAMT>45.67<FITID>ofx-2<NAME>Reembolso</STMTTRN>
      `)
    );

    await waitFor(() => expect(mocks.insertRecords).toHaveBeenCalledTimes(1));
    expect(mocks.insertRecords).toHaveBeenCalledWith(
      "transactions",
      expect.arrayContaining([
        expect.objectContaining({
          user_id: "user-1",
          account_id: "account-1",
          amount: 12.34,
          type: "EXPENSE",
          date: "2026-10-15",
          external_id: "ofx-1",
          description: "Loja A",
        }),
        expect.objectContaining({
          user_id: "user-1",
          account_id: "account-1",
          amount: 45.67,
          type: "INCOME",
          date: "2026-10-16",
          external_id: "ofx-2",
          description: "Reembolso",
        }),
      ])
    );
    expect(await screen.findByText("2 novas transações adicionadas")).toBeInTheDocument();
  });

  it("skips an exact legacy duplicate but keeps a different transaction with the same amount and date", async () => {
    mocks.existingTransactions = [
      {
        account_id: "account-1",
        amount: 12.34,
        type: "EXPENSE",
        date: "2026-10-15",
        external_id: null,
        description: "Farmácia",
      },
    ];
    const user = userEvent.setup();
    render(<OFXImportModal isOpen onClose={vi.fn()} />, { wrapper: createWrapper() });

    await uploadOfx(
      user,
      sgmlOfx(`
        <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261015<TRNAMT>-12.34<NAME>Farmácia</STMTTRN>
        <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261015<TRNAMT>-12.34<NAME>Mercado</STMTTRN>
      `)
    );

    await waitFor(() => expect(mocks.insertRecords).toHaveBeenCalledTimes(1));
    const inserted = mocks.insertRecords.mock.calls[0][1] as Array<Record<string, unknown>>;
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toEqual(expect.objectContaining({ description: "Mercado", amount: 12.34 }));
    expect(await screen.findByText("1 transação duplicada ignorada.")).toBeInTheDocument();
  });

  it("checks duplicates outside the selected month before inserting the imported date range", async () => {
    mocks.existingTransactions = [
      {
        account_id: "account-1",
        amount: 12.34,
        type: "EXPENSE",
        date: "2026-06-15",
        external_id: null,
        description: "Farmácia",
      },
    ];
    const user = userEvent.setup();
    render(<OFXImportModal isOpen onClose={vi.fn()} />, { wrapper: createWrapper() });

    await uploadOfx(
      user,
      sgmlOfx("<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260615<TRNAMT>-12.34<NAME>Farmácia</STMTTRN>")
    );

    await waitFor(() => expect(mocks.supabaseFrom).toHaveBeenCalledWith("transactions"));
    expect(mocks.insertRecords).not.toHaveBeenCalled();
    expect(await screen.findByText("0 novas transações adicionadas")).toBeInTheDocument();
    expect(await screen.findByText("1 transação duplicada ignorada.")).toBeInTheDocument();
    expect(mocks.queryCalls).toContainEqual(["gte", "date", "2026-06-15"]);
    expect(mocks.queryCalls).toContainEqual(["lte", "date", "2026-06-15"]);
  });

  it("does not insert when the duplicate lookup fails", async () => {
    mocks.existingTransactionsError = { message: "lookup failed" };
    const user = userEvent.setup();
    render(<OFXImportModal isOpen onClose={vi.fn()} />, { wrapper: createWrapper() });

    await uploadOfx(
      user,
      sgmlOfx(
        "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261015<TRNAMT>-12.34<FITID>ofx-error<NAME>Compra</STMTTRN>"
      )
    );

    await waitFor(() => expect(mocks.supabaseFrom).toHaveBeenCalledWith("transactions"));
    expect(mocks.insertRecords).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Não foi possível verificar duplicatas. Nenhuma transação foi importada."
    );
  });

  it("checks every page when more than 1000 existing transactions match the date range", async () => {
    mocks.existingTransactions = Array.from({ length: 1001 }, (_, index) => ({
      account_id: "account-1",
      amount: 50,
      type: "EXPENSE",
      date: "2026-06-15",
      external_id: null,
      description: `Outra compra ${index}`,
    }));
    mocks.existingTransactions[1000] = {
      account_id: "account-1",
      amount: 12.34,
      type: "EXPENSE",
      date: "2026-06-15",
      external_id: null,
      description: "Farmácia",
    };
    const user = userEvent.setup();
    render(<OFXImportModal isOpen onClose={vi.fn()} />, { wrapper: createWrapper() });

    await uploadOfx(
      user,
      sgmlOfx("<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260615<TRNAMT>-12.34<NAME>Farmácia</STMTTRN>")
    );

    await screen.findByText("1 transação duplicada ignorada.");
    expect(mocks.queryCalls).toContainEqual(["range", 0, 999]);
    expect(mocks.queryCalls).toContainEqual(["range", 1000, 1999]);
    expect(mocks.insertRecords).not.toHaveBeenCalled();
  });

  it("falls back to row-by-row writes when a concurrent import wins the unique FITID", async () => {
    mocks.insertRecords
      .mockRejectedValueOnce({ code: "23505" })
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ code: "23505" });
    const user = userEvent.setup();
    render(<OFXImportModal isOpen onClose={vi.fn()} />, { wrapper: createWrapper() });

    await uploadOfx(
      user,
      sgmlOfx(`
        <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261015<TRNAMT>-12.34<FITID>race-1<NAME>Compra</STMTTRN>
        <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261016<TRNAMT>-15.00<FITID>race-2<NAME>Mercado</STMTTRN>
      `)
    );

    await waitFor(() => expect(mocks.insertRecords).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("1 nova transação adicionada")).toBeInTheDocument();
    expect(await screen.findByText("1 transação duplicada ignorada.")).toBeInTheDocument();
  });
});
