-- Add indexes for most important foreign keys (performance)

-- accounts table
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id) WHERE is_active = true;

-- categories table
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- transactions table (most critical)
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payer_id ON transactions(payer_id) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_transactions_related_member_id ON transactions(related_member_id);

-- family_members table
CREATE INDEX IF NOT EXISTS idx_family_members_invited_by ON family_members(invited_by);
CREATE INDEX IF NOT EXISTS idx_family_members_linked_user_id ON family_members(linked_user_id);

-- family_invitations table
CREATE INDEX IF NOT EXISTS idx_family_invitations_family_id ON family_invitations(family_id);

-- transaction_splits table
CREATE INDEX IF NOT EXISTS idx_transaction_splits_user_id ON transaction_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_settled_tx ON transaction_splits(settled_transaction_id) WHERE is_settled = true;

-- trip_invitations table
CREATE INDEX IF NOT EXISTS idx_trip_invitations_inviter_id ON trip_invitations(inviter_id);

-- trip_checklist table
CREATE INDEX IF NOT EXISTS idx_trip_checklist_trip_id ON trip_checklist(trip_id);

-- trip_itinerary table
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_trip_id ON trip_itinerary(trip_id);

-- trips table
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);

-- families table
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON families(owner_id);;
