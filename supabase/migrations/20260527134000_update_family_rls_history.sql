-- Migration: 20260527134000_update_family_rls_history.sql

-- 1. Atualizar transações
DROP POLICY IF EXISTS "transactions_unified_select" ON transactions;
CREATE POLICY "transactions_unified_select" ON transactions FOR SELECT TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR 
  (creator_user_id = (SELECT auth.uid())) OR 
  (EXISTS (
    SELECT 1 FROM family_members owner_fm
    JOIN family_members my_fm ON owner_fm.family_id = my_fm.family_id
    WHERE owner_fm.user_id = transactions.user_id 
      AND (my_fm.user_id = (SELECT auth.uid()) OR my_fm.linked_user_id = (SELECT auth.uid()))
      AND (
          my_fm.status = 'active' 
          OR (my_fm.status = 'inactive' AND transactions.date <= my_fm.removed_at)
      )
  )) OR
  (
    (trip_id IS NOT NULL) AND 
    (EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = transactions.trip_id 
        AND trip_members.user_id = (SELECT auth.uid())
    )) AND 
    (is_shared = true OR user_id = (SELECT auth.uid()) OR creator_user_id = (SELECT auth.uid()))
  )
);

-- 2. Transaction Splits não precisam mudar drasticamente se check_split_access cuida disso, mas ele pode ter a mesma lógica atrelada a transação.
-- Como transaction_splits faz JOIN com transactions, não mexeremos para não inflar custo, ou melhor, 
-- se check_split_access checa apenas a transação pai, ela já vai puxar a nova regra da transação.
