-- Corrigir políticas RLS de trip_members e transaction_splits

-- 1. Corrigir trip_members_select para usar função SECURITY DEFINER (evita recursão)
DROP POLICY IF EXISTS trip_members_select ON trip_members;

CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    is_trip_member(trip_id, auth.uid())
  );

-- 2. Corrigir transaction_splits para permitir undo de acerto
DROP POLICY IF EXISTS "Users can view and manage their splits" ON transaction_splits;

CREATE POLICY "Users can view and manage their splits" ON transaction_splits
  FOR ALL
  USING (
    -- Pode gerenciar se é o membro do split
    user_id = auth.uid()
    OR
    -- Pode gerenciar se é o criador da transação
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_splits.transaction_id
      AND t.user_id = auth.uid()
    )
    OR
    -- Pode gerenciar se é o pagador da transação
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_splits.transaction_id
      AND t.payer_id = auth.uid()
    )
  );
