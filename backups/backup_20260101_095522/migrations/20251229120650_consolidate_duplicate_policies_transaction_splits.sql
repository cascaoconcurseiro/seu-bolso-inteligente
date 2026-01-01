-- Consolidate duplicate policies for transaction_splits
-- Merge "Users can view own splits" and "Users can manage own splits"

DROP POLICY IF EXISTS "Users can view own splits" ON transaction_splits;
DROP POLICY IF EXISTS "Users can manage own splits" ON transaction_splits;

-- Single consolidated policy for all operations
CREATE POLICY "Users can manage splits" ON transaction_splits
  FOR ALL USING (user_id = (select auth.uid()));;
