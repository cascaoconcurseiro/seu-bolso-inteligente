import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Trip, TripFinancialSummary, TripParticipant } from "@/hooks/useTrips";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionSplitRow = Database["public"]["Tables"]["transaction_splits"]["Row"];

export type TripTransactionSplit = TransactionSplitRow & {
  settled_by_creditor?: boolean | null;
  settled_by_debtor?: boolean | null;
};

export type TripTransaction = TransactionRow & {
  account?: { name: string; bank_id: string | null } | null;
  category?: { name: string; icon: string | null } | null;
  transaction_splits?: TripTransactionSplit[];
};

export interface TripPermissions {
  isOwner: boolean;
  canEditDetails: boolean | null;
  canManageExpenses: boolean | null;
}

export interface TripBalance {
  participantId: string;
  name: string;
  paid: number;
  owes: number;
  balance: number;
  currency: string;
}

export interface SentTripInvitation {
  id: string;
  status: string;
  invitee?: {
    full_name: string | null;
    email: string;
  };
}

export type TripUser = Pick<User, "id" | "email"> | null;

export interface TripDetailData {
  trip: Trip;
  permissions: TripPermissions | null | undefined;
  participants: TripParticipant[];
  tripTransactions: TripTransaction[];
  tripFinancialSummary: TripFinancialSummary | null | undefined;
  user: TripUser;
  balances: TripBalance[];
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
