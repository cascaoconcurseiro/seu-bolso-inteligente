-- ============================================================================
-- Captura tabelas existentes no Supabase que não tinham CREATE TABLE migration
-- ============================================================================

BEGIN;

-- 1. asset_transactions
CREATE TABLE IF NOT EXISTS public.asset_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_asset_id ON public.asset_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_user_id ON public.asset_transactions(user_id);
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own asset transactions" ON public.asset_transactions FOR ALL USING (user_id = auth.uid());

-- 2. transaction_auto_share_rules
CREATE TABLE IF NOT EXISTS public.transaction_auto_share_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  split_ratio NUMERIC NOT NULL DEFAULT 0.5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auto_share_rules_user_id ON public.transaction_auto_share_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_share_rules_member_id ON public.transaction_auto_share_rules(member_id);
ALTER TABLE public.transaction_auto_share_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own auto share rules" ON public.transaction_auto_share_rules FOR ALL USING (user_id = auth.uid());

-- 3. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_due_enabled BOOLEAN DEFAULT true,
  invoice_due_days_before INTEGER DEFAULT 3,
  budget_warning_enabled BOOLEAN DEFAULT true,
  budget_warning_threshold INTEGER DEFAULT 80,
  low_balance_enabled BOOLEAN DEFAULT true,
  low_balance_threshold NUMERIC DEFAULT 100,
  credit_limit_warning_enabled BOOLEAN DEFAULT true,
  credit_limit_warning_threshold NUMERIC,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT false,
  push_bills_enabled BOOLEAN NOT NULL DEFAULT false,
  push_days_before INTEGER NOT NULL DEFAULT 3,
  push_goals_enabled BOOLEAN NOT NULL DEFAULT false,
  push_weekly_enabled BOOLEAN NOT NULL DEFAULT false,
  shared_pending_enabled BOOLEAN DEFAULT true,
  recurring_enabled BOOLEAN DEFAULT true,
  savings_goal_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  preferred_hour INTEGER NOT NULL DEFAULT 9,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());

COMMIT;
