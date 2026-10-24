
-- BUG CONFIRMADO (reportado pelo usuario): "new row violates row-level security
-- policy for table transactions" ao editar/excluir qualquer transacao com
-- source_transaction_id preenchido (ocorrencia de recorrencia gerada por
-- fn_handle_recurring_transactions, ou espelho de despesa compartilhada).
--
-- As 2 policies de UPDATE em transactions exigiam source_transaction_id IS NULL
-- no WITH CHECK (uma explicitamente, outra implicitamente ao reusar o USING como
-- CHECK) -- impossivel de satisfazer numa linha ja vinculada, entao NENHUMA edicao
-- ou exclusao (soft-delete via UPDATE) funcionava pra essas transacoes. O app
-- suporta deletar 1 ocorrencia (cascadeType NONE) via UI, entao isso e bug, nao
-- restricao intencional.
--
-- Reproduzido e confirmado: UPDATE falhando com o erro exato antes do fix;
-- sucesso depois.

ALTER POLICY family_members_can_edit_based_on_role ON public.transactions
  WITH CHECK (true);

ALTER POLICY "Users can update own transactions" ON public.transactions
  WITH CHECK ((user_id = (select auth.uid())));
