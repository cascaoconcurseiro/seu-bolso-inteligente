import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface CreditCardInvoicePaymentRequest {
  cardAccountId: string;
  sourceAccountId: string;
  invoiceMonth: string;
  invoiceTotal: number;
  amount: number;
  paymentDate: string;
  idempotencyKey: string;
  exchangeRate?: number;
}

/**
 * Persists invoice payment, reversal, and carryover in one database transaction.
 * The RPC's database idempotency key makes retries of a single attempt safe.
 */
export async function payCreditCardInvoiceAtomic(
  request: CreditCardInvoicePaymentRequest
): Promise<Json[]> {
  const { data, error } = await supabase.rpc("pay_credit_card_invoice_atomic", {
    p_card_account_id: request.cardAccountId,
    p_source_account_id: request.sourceAccountId,
    p_invoice_month: request.invoiceMonth,
    p_invoice_total: request.invoiceTotal,
    p_amount: request.amount,
    p_payment_date: request.paymentDate,
    p_idempotency_key: request.idempotencyKey,
    ...(request.exchangeRate === undefined ? {} : { p_exchange_rate: request.exchangeRate }),
  });

  if (error) throw error;

  const expectedRows = request.amount < request.invoiceTotal ? 3 : 1;
  if (!Array.isArray(data) || data.length !== expectedRows) {
    throw new Error("O servidor não confirmou todas as movimentações da fatura.");
  }

  return data as Json[];
}
