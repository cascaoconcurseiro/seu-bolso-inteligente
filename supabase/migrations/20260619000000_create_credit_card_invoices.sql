CREATE TABLE IF NOT EXISTS credit_card_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PAID', 'PARTIAL')),
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  closing_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_account_month_year ON credit_card_invoices(account_id, month, year);

ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credit card invoices" ON credit_card_invoices;
CREATE POLICY "Users can view their own credit card invoices"
  ON credit_card_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = credit_card_invoices.account_id
      AND accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own credit card invoices" ON credit_card_invoices;
CREATE POLICY "Users can manage their own credit card invoices"
  ON credit_card_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = credit_card_invoices.account_id
      AND accounts.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS shared_credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shared_credit_cards DROP CONSTRAINT IF EXISTS unique_shared_card_user;
ALTER TABLE shared_credit_cards ADD CONSTRAINT unique_shared_card_user UNIQUE (account_id, user_id);

ALTER TABLE shared_credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage shared credit cards" ON shared_credit_cards;
CREATE POLICY "Owner can manage shared credit cards"
  ON shared_credit_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = shared_credit_cards.account_id
      AND accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Invitee can view and update their own invites" ON shared_credit_cards;
CREATE POLICY "Invitee can view and update their own invites"
  ON shared_credit_cards FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Invitee can update their own invites" ON shared_credit_cards;
CREATE POLICY "Invitee can update their own invites"
  ON shared_credit_cards FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_credit_card_invoices ON credit_card_invoices;
CREATE TRIGGER set_timestamp_credit_card_invoices
BEFORE UPDATE ON credit_card_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_shared_credit_cards ON shared_credit_cards;
CREATE TRIGGER set_timestamp_shared_credit_cards
BEFORE UPDATE ON shared_credit_cards
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
