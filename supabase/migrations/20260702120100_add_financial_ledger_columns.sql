-- Add missing columns to financial_ledger that the orphan trigger expects
BEGIN;

ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS related_user_id UUID;
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS related_member_id UUID;
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT false;
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS settlement_transaction_id UUID;
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

COMMIT;
