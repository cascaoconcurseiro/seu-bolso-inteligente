-- Permitir que usuários atualizem suas próprias transações espelhadas (para marcar como settled)
CREATE POLICY "Users can settle own mirror transactions"
ON transactions
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND source_transaction_id IS NOT NULL
)
WITH CHECK (
  user_id = auth.uid() 
  AND source_transaction_id IS NOT NULL
);;
