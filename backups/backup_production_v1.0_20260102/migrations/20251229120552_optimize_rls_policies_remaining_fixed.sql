-- Optimize RLS policies for remaining tables (fixed)

DROP POLICY IF EXISTS "Users can view own splits" ON transaction_splits;
DROP POLICY IF EXISTS "Users can manage own splits" ON transaction_splits;

CREATE POLICY "Users can view own splits" ON transaction_splits
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage own splits" ON transaction_splits
  FOR ALL USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own mirrors" ON shared_transaction_mirrors;

CREATE POLICY "Users can view own mirrors" ON shared_transaction_mirrors
  FOR SELECT USING (mirror_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own invitations" ON family_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON family_invitations;
DROP POLICY IF EXISTS "Users can update received invitations" ON family_invitations;

CREATE POLICY "Users can view own invitations" ON family_invitations
  FOR SELECT USING (
    from_user_id = (select auth.uid()) OR 
    to_user_id = (select auth.uid())
  );

CREATE POLICY "Users can create invitations" ON family_invitations
  FOR INSERT WITH CHECK (from_user_id = (select auth.uid()));

CREATE POLICY "Users can update received invitations" ON family_invitations
  FOR UPDATE USING (to_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own pending operations" ON pending_operations;
DROP POLICY IF EXISTS "Users can insert their own pending operations" ON pending_operations;
DROP POLICY IF EXISTS "Users can update their own pending operations" ON pending_operations;
DROP POLICY IF EXISTS "Users can delete their own pending operations" ON pending_operations;

CREATE POLICY "Users can view their own pending operations" ON pending_operations
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own pending operations" ON pending_operations
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own pending operations" ON pending_operations
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own pending operations" ON pending_operations
  FOR DELETE USING (user_id = (select auth.uid()));;
