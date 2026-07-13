export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER" | "WITHDRAWAL" | "DEPOSIT";
export type TransactionDomain = "PERSONAL" | "SHARED" | "TRAVEL";
export type TransactionStatus = "CONFIRMED" | "PENDING" | "CANCELLED";

/** Dia da recorrência (1-31) */
export type RecurrenceDay =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  trip_id: string | null;
  amount: number;
  description: string;
  date: string;
  competence_date: string; // Data de competência (YYYY-MM-01)
  type: TransactionType;
  currency: string | null;
  domain: TransactionDomain;
  is_shared: boolean;
  payer_id: string | null;
  is_installment: boolean;
  current_installment: number | null;
  total_installments: number | null;
  series_id: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  source_transaction_id: string | null;
  status?: TransactionStatus | string;
  external_id?: string | null;
  notes: string | null;
  exchange_rate: number | null;
  destination_amount: number | null;
  destination_currency: string | null;
  created_at: string;
  updated_at: string;
  creator_user_id?: string | null;
  idempotency_key?: string | null;
  is_optimistic?: boolean;
  transaction_splits?: DBTransactionSplit[];
  // Joined data
  account?: {
    id: string;
    name: string;
    type?: string;
    currency?: string | null;
    bank_id?: string | null;
  };
  category?: { id: string; name: string; icon: string | null };
  trip?: { id: string; name: string };
}

export interface DBTransactionSplit {
  id: string;
  transaction_id: string;
  member_id: string;
  user_id: string | null;
  percentage: number;
  amount: number;
  name: string;
  is_settled: boolean;
  settled_at: string | null;
  settled_by_debtor: boolean;
  settled_by_creditor: boolean;
  created_at: string;
}

export interface TransactionSplit {
  member_id: string;
  percentage: number;
  amount: number;
}

export interface CreateTransactionInput {
  account_id?: string;
  destination_account_id?: string;
  category_id?: string;
  trip_id?: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  currency?: string;
  domain?: TransactionDomain;
  is_shared?: boolean;
  payer_id?: string;
  is_installment?: boolean;
  current_installment?: number;
  total_installments?: number;
  series_id?: string;
  notes?: string;
  exchange_rate?: number;
  destination_amount?: number;
  destination_currency?: string;
  related_member_id?: string;
  splits?: TransactionSplit[];
  competence_date?: string;
  is_refund?: boolean;
  is_recurring?: boolean;
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  recurrence_day?: RecurrenceDay;
  status?: TransactionStatus;
  enable_notification?: boolean;
  notification_date?: string;
  idempotency_key?: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  tripId?: string;
  domain?: TransactionDomain;
  limit?: number;
}
