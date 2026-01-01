-- Consolidate duplicate policies for transactions (fixed)

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "family_members_can_view_based_on_role" ON transactions;

-- Consolidated SELECT policy
CREATE POLICY "Users can view transactions" ON transactions
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = (select auth.uid())
      AND fm.family_id IN (
        SELECT family_id FROM family_members WHERE user_id = transactions.user_id
      )
      AND (
        fm.role = 'admin' OR
        (fm.role IN ('editor', 'viewer') AND transactions.is_shared = true)
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can settle own mirror transactions" ON transactions;
DROP POLICY IF EXISTS "family_members_can_edit_based_on_role" ON transactions;

-- Consolidated UPDATE policy
CREATE POLICY "Users can update transactions" ON transactions
  FOR UPDATE USING (
    user_id = (select auth.uid()) OR
    (source_transaction_id IS NOT NULL AND user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = (select auth.uid())
      AND fm.family_id IN (
        SELECT family_id FROM family_members WHERE user_id = transactions.user_id
      )
      AND fm.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "family_members_can_delete_based_on_role" ON transactions;

-- Consolidated DELETE policy
CREATE POLICY "Users can delete transactions" ON transactions
  FOR DELETE USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = (select auth.uid())
      AND fm.family_id IN (
        SELECT family_id FROM family_members WHERE user_id = transactions.user_id
      )
      AND fm.role = 'admin'
    )
  );;
