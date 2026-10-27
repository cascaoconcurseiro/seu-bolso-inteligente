import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { payCreditCardInvoiceAtomic } from "./creditCardInvoicePayment";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

describe("payCreditCardInvoiceAtomic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists a partial payment and its rotating balance in one RPC call", async () => {
    const rpc = vi.mocked(supabase.rpc);
    rpc.mockResolvedValue({
      data: [{ id: "payment" }, { id: "reversal" }, { id: "carryover" }] as never,
      error: null,
    } as never);

    const result = await payCreditCardInvoiceAtomic({
      cardAccountId: "card-1",
      sourceAccountId: "account-1",
      invoiceMonth: "2026-10-01",
      invoiceTotal: 120,
      amount: 90,
      paymentDate: "2026-10-25",
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      exchangeRate: 5.25,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("pay_credit_card_invoice_atomic", {
      p_card_account_id: "card-1",
      p_source_account_id: "account-1",
      p_invoice_month: "2026-10-01",
      p_invoice_total: 120,
      p_amount: 90,
      p_payment_date: "2026-10-25",
      p_idempotency_key: "00000000-0000-4000-8000-000000000001",
      p_exchange_rate: 5.25,
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toHaveLength(3);
  });

  it("does not fall back to separate inserts when the RPC fails", async () => {
    const rpc = vi.mocked(supabase.rpc);
    rpc.mockResolvedValue({ data: null, error: new Error("database failure") } as never);

    await expect(
      payCreditCardInvoiceAtomic({
        cardAccountId: "card-1",
        sourceAccountId: "account-1",
        invoiceMonth: "2026-10-01",
        invoiceTotal: 120,
        amount: 90,
        paymentDate: "2026-10-25",
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      })
    ).rejects.toThrow("database failure");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a success-shaped response missing invoice rows", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: "payment" }], error: null } as never);

    await expect(
      payCreditCardInvoiceAtomic({
        cardAccountId: "card-1",
        sourceAccountId: "account-1",
        invoiceMonth: "2026-10-01",
        invoiceTotal: 120,
        amount: 90,
        paymentDate: "2026-10-25",
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      })
    ).rejects.toThrow("não confirmou todas as movimentações");
  });
});
