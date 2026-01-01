-- Optimize RLS policies for notifications and notification_preferences

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON notification_preferences;

CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));;
