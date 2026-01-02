-- Corrigir política RLS de transaction_splits
-- Permitir que usuários vejam splits de transações que criaram OU splits onde são o user_id

DROP POLICY IF EXISTS "Users can manage splits" ON public.transaction_splits;

CREATE POLICY "Users can view and manage their splits"
ON public.transaction_splits
FOR ALL
USING (
  -- Pode ver se é o user_id do split (quem deve)
  user_id = auth.uid()
  OR
  -- Pode ver se é o criador da transação original (quem pagou)
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_splits.transaction_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Pode criar/editar se é o criador da transação
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_splits.transaction_id
      AND t.user_id = auth.uid()
  )
);;
