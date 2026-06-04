-- Migration to add B-Tree indexes to foreign keys to prevent Full Table Scans
-- and dramatically improve performance for joins and cascade deletes.

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_family_id ON public.transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trip_id ON public.transactions(trip_id);

-- accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_family_id ON public.accounts(family_id);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_category_id ON public.categories(parent_category_id);

-- family_members
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);

-- transaction_splits
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON public.transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_user_id ON public.transaction_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_debtor_id ON public.transaction_splits(debtor_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_debtor_settlement_tx_id ON public.transaction_splits(debtor_settlement_tx_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_creditor_settlement_tx_id ON public.transaction_splits(creditor_settlement_tx_id);

-- goals and assets
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_linked_account_id ON public.goals(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_account_id ON public.assets(account_id);

-- trips
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON public.trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON public.trip_participants(user_id);

-- credit_card_invoices
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_account_id ON public.credit_card_invoices(account_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_id ON public.audit_logs(transaction_id);
