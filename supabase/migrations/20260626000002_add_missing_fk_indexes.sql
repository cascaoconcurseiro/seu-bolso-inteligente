-- Add indexes for foreign keys without covering index
-- Identified by Supabase performance advisors

CREATE INDEX IF NOT EXISTS idx_goal_milestones_user_id
  ON public.goal_milestones (user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_default_account_id
  ON public.profiles (default_account_id)
  WHERE default_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_default_credit_card_id
  ON public.profiles (default_credit_card_id)
  WHERE default_credit_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_credit_cards_user_id
  ON public.shared_credit_cards (user_id);

CREATE INDEX IF NOT EXISTS idx_auto_share_rules_member_id
  ON public.transaction_auto_share_rules (member_id);

CREATE INDEX IF NOT EXISTS idx_auto_share_rules_user_id
  ON public.transaction_auto_share_rules (user_id);
