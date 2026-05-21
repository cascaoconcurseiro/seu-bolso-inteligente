-- =====================================================
-- CORREÇÃO: Exclusão de Séries de Parcelas
-- =====================================================
-- 
-- Problema: Ao excluir série de parcelas, algumas parcelas
-- não são excluídas devido a restrições RLS ou triggers
--
-- Solução: Garantir que a política RLS permita exclusão
-- de todas as transações da série, incluindo mirrors
-- =====================================================

-- 1. Verificar e corrigir política RLS de DELETE
-- =====================================================

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can delete transactions" ON transactions;

-- Criar política SEM recursão
-- A chave é NÃO fazer subconsulta na própria tabela transactions
CREATE POLICY "Users can delete transactions" ON transactions
  FOR DELETE USING (
    -- Pode deletar transações próprias
    user_id = auth.uid()
    OR
    -- Admin da família pode deletar transações de membros
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = auth.uid()
      AND fm.family_id IN (
        SELECT family_id FROM family_members WHERE user_id = transactions.user_id
      )
      AND fm.role = 'admin'
    )
  );

-- 2. Criar função auxiliar para deletar série completa
-- =====================================================

CREATE OR REPLACE FUNCTION delete_installment_series(p_series_id UUID)
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_tx_ids UUID[];
  v_mirror_ids UUID[];
BEGIN
  -- Buscar IDs de todas as transações da série (apenas do usuário atual)
  SELECT ARRAY_AGG(id) INTO v_tx_ids
  FROM transactions
  WHERE series_id = p_series_id
  AND user_id = auth.uid()
  AND source_transaction_id IS NULL; -- Apenas originais

  -- Se não encontrou nenhuma, retornar 0
  IF v_tx_ids IS NULL OR array_length(v_tx_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  -- Buscar IDs dos mirrors (espelhos) dessas transações
  SELECT ARRAY_AGG(id) INTO v_mirror_ids
  FROM transactions
  WHERE source_transaction_id = ANY(v_tx_ids);

  -- Deletar splits das transações originais
  DELETE FROM transaction_splits
  WHERE transaction_id = ANY(v_tx_ids);

  -- Deletar splits dos mirrors (se houver)
  IF v_mirror_ids IS NOT NULL AND array_length(v_mirror_ids, 1) > 0 THEN
    DELETE FROM transaction_splits
    WHERE transaction_id = ANY(v_mirror_ids);
  END IF;

  -- Deletar mirrors (espelhos) - ANTES das originais
  IF v_mirror_ids IS NOT NULL AND array_length(v_mirror_ids, 1) > 0 THEN
    DELETE FROM transactions
    WHERE id = ANY(v_mirror_ids);
  END IF;

  -- Deletar transações originais
  DELETE FROM transactions
  WHERE id = ANY(v_tx_ids);

  -- Contar quantas foram deletadas
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Retornar contagem
  RETURN QUERY SELECT v_count;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION delete_installment_series IS 
'Deleta todas as parcelas de uma série, incluindo splits e mirrors. Apenas o dono pode deletar.';

-- =====================================================
-- FIM DA CORREÇÃO
-- =====================================================
