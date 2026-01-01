-- Tabela de notificações do sistema
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'WELCOME',
    'INVOICE_DUE',
    'INVOICE_OVERDUE', 
    'BUDGET_WARNING',
    'BUDGET_EXCEEDED',
    'SHARED_PENDING',
    'SHARED_SETTLED',
    'RECURRING_PENDING',
    'RECURRING_GENERATED',
    'SAVINGS_GOAL',
    'WEEKLY_SUMMARY',
    'TRIP_INVITE',
    'FAMILY_INVITE',
    'GENERAL'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  action_url TEXT,
  action_label TEXT,
  related_id UUID,
  related_type TEXT,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_active ON notifications(user_id, is_dismissed) WHERE is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  invoice_due_enabled BOOLEAN DEFAULT true,
  invoice_due_days_before INTEGER DEFAULT 3,
  budget_warning_enabled BOOLEAN DEFAULT true,
  budget_warning_threshold INTEGER DEFAULT 80,
  shared_pending_enabled BOOLEAN DEFAULT true,
  recurring_enabled BOOLEAN DEFAULT true,
  savings_goal_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para preferências
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE notifications IS 'Notificações do sistema para usuários';
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação por usuário';;
