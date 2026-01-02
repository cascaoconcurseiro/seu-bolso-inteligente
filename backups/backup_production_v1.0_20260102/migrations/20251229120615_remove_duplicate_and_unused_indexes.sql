-- Remove duplicate index
DROP INDEX IF EXISTS idx_transactions_mirror_id;

-- Remove unused indexes (monitorados e confirmados como não utilizados)
DROP INDEX IF EXISTS idx_transactions_frequency;
DROP INDEX IF EXISTS idx_transactions_is_refund;
DROP INDEX IF EXISTS idx_family_members_role;
DROP INDEX IF EXISTS idx_accounts_is_international;
DROP INDEX IF EXISTS idx_transactions_is_mirror;
DROP INDEX IF EXISTS idx_transactions_source_transaction_id;
DROP INDEX IF EXISTS idx_accounts_deleted;
DROP INDEX IF EXISTS idx_family_invitations_from_user;
DROP INDEX IF EXISTS idx_family_members_scope;
DROP INDEX IF EXISTS idx_trip_invitations_invitee_id;
DROP INDEX IF EXISTS idx_transactions_linked;
DROP INDEX IF EXISTS idx_transactions_series_competence;
DROP INDEX IF EXISTS idx_budgets_category_id;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_transactions_trip;
DROP INDEX IF EXISTS idx_transaction_splits_unsettled;
DROP INDEX IF EXISTS idx_pending_operations_user_status;
DROP INDEX IF EXISTS idx_pending_operations_next_retry;;
