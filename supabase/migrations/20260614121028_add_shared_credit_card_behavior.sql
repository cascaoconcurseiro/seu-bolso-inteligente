-- Add shared_credit_card_behavior column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shared_credit_card_behavior text DEFAULT 'CARD_CYCLE';
