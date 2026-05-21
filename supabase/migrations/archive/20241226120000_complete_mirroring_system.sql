-- =====================================================
-- MIGRAÇÃO: Sistema Completo de Espelhamento Automático
-- Data: 26/12/2024
-- Descrição: Implementa espelhamento automático de transações
--            compartilhadas para membros da família
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: Espelhar transação para membros da família
-- =====================================================

CREATE OR REPLACE FUNCTION mirror_shared_transaction()
RETURNS TRIGGER AS $$
DECLARE
  split_record RECORD;
  member_record RECORD;
  mirror_tx_id UUID;
BEGIN
  -- Apenas processar se a transação foi marcada como compartilhada
  IF NEW.is_shared = true AND (OLD IS NULL OR OLD.is_shared = false) THEN
    
    -- Buscar todos os splits desta transação
    FOR split_record IN 
      SELECT * FROM transaction_splits 
      WHERE transaction_id = NEW.id
    LOOP
      -- Buscar informações do membro
      SELECT * INTO member_record 
      FROM family_members 
      WHERE id = split_record.member_id;
      
      -- Se o membro tem user_id ou linked_user_id, criar transação espelhada
      IF member_record.user_id IS NOT NULL OR member_record.linked_user_id IS NOT NULL THEN
        
        -- Criar transação espelhada (mirror)
        INSERT INTO shared_transaction_mirrors (
          original_transaction_id,
          mirror_user_id,
          member_id,
          amount,
          percentage,
          description,
          date,
          category_id,
          trip_id,
          payer_id,
          is_settled,
          sync_status,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          COALESCE(member_record.user_id, member_record.linked_user_id),
          split_record.member_id,
          split_record.amount,
          split_record.percentage,
          NEW.description,
          NEW.date,
          NEW.category_id,
          NEW.trip_id,
          NEW.payer_id,
          split_record.is_settled,
          'SYNCED',
          NOW(),
          NOW()
        )
        ON CONFLICT (original_transaction_id, member_id) 
        DO UPDATE SET
          amount = EXCLUDED.amount,
          percentage = EXCLUDED.percentage,
          description = EXCLUDED.description,
          date = EXCLUDED.date,
          is_settled = EXCLUDED.is_settled,
          sync_status = 'SYNCED',
          updated_at = NOW();
        
      END IF;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TRIGGER: Espelhar automaticamente ao marcar como compartilhada
-- =====================================================

DROP TRIGGER IF EXISTS trigger_mirror_shared_transaction ON transactions;

CREATE TRIGGER trigger_mirror_shared_transaction
AFTER INSERT OR UPDATE OF is_shared ON transactions
FOR EACH ROW
WHEN (NEW.is_shared = true)
EXECUTE FUNCTION mirror_shared_transaction();

-- =====================================================
-- 3. FUNÇÃO: Atualizar espelhos quando splits mudam
-- =====================================================

CREATE OR REPLACE FUNCTION update_mirrors_on_split_change()
RETURNS TRIGGER AS $$
DECLARE
  tx_record RECORD;
  member_record RECORD;
BEGIN
  -- Buscar a transação relacionada
  SELECT * INTO tx_record 
  FROM transactions 
  WHERE id = NEW.transaction_id;
  
  -- Se a transação é compartilhada, atualizar o espelho
  IF tx_record.is_shared = true THEN
    
    -- Buscar informações do membro
    SELECT * INTO member_record 
    FROM family_members 
    WHERE id = NEW.member_id;
    
    IF member_record.user_id IS NOT NULL OR member_record.linked_user_id IS NOT NULL THEN
      
      -- Atualizar ou criar espelho
      INSERT INTO shared_transaction_mirrors (
        original_transaction_id,
        mirror_user_id,
        member_id,
        amount,
        percentage,
        description,
        date,
        category_id,
        trip_id,
        payer_id,
        is_settled,
        sync_status,
        created_at,
        updated_at
      ) VALUES (
        tx_record.id,
        COALESCE(member_record.user_id, member_record.linked_user_id),
        NEW.member_id,
        NEW.amount,
        NEW.percentage,
        tx_record.description,
        tx_record.date,
        tx_record.category_id,
        tx_record.trip_id,
        tx_record.payer_id,
        NEW.is_settled,
        'SYNCED',
        NOW(),
        NOW()
      )
      ON CONFLICT (original_transaction_id, member_id) 
      DO UPDATE SET
        amount = EXCLUDED.amount,
        percentage = EXCLUDED.percentage,
        is_settled = EXCLUDED.is_settled,
        sync_status = 'SYNCED',
        updated_at = NOW();
        
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER: Atualizar espelhos quando splits mudam
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_mirrors_on_split_change ON transaction_splits;

CREATE TRIGGER trigger_update_mirrors_on_split_change
AFTER INSERT OR UPDATE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION update_mirrors_on_split_change();

-- =====================================================
-- 5. FUNÇÃO: Remover espelhos quando split é deletado
-- =====================================================

CREATE OR REPLACE FUNCTION delete_mirror_on_split_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM shared_transaction_mirrors
  WHERE original_transaction_id = OLD.transaction_id
  AND member_id = OLD.member_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGER: Remover espelhos quando split é deletado
-- =====================================================

DROP TRIGGER IF EXISTS trigger_delete_mirror_on_split_delete ON transaction_splits;

CREATE TRIGGER trigger_delete_mirror_on_split_delete
AFTER DELETE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION delete_mirror_on_split_delete();

-- =====================================================
-- 7. RLS POLICIES PARA SHARED_TRANSACTION_MIRRORS
-- =====================================================

-- Habilitar RLS
ALTER TABLE shared_transaction_mirrors ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view their own mirrors" ON shared_transaction_mirrors;
DROP POLICY IF EXISTS "Users can view mirrors they created" ON shared_transaction_mirrors;

-- POLICY: Usuário pode ver seus próprios espelhos
CREATE POLICY "Users can view their own mirrors"
ON shared_transaction_mirrors FOR SELECT
USING (mirror_user_id = auth.uid());

-- POLICY: Criador da transação original pode ver todos os espelhos
CREATE POLICY "Users can view mirrors they created"
ON shared_transaction_mirrors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = shared_transaction_mirrors.original_transaction_id
    AND t.creator_user_id = auth.uid()
  )
);

-- =====================================================
-- 8. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_shared_mirrors_original_tx ON shared_transaction_mirrors(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_mirror_user ON shared_transaction_mirrors(mirror_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_member ON shared_transaction_mirrors(member_id);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_sync_status ON shared_transaction_mirrors(sync_status);

-- =====================================================
-- 9. COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION mirror_shared_transaction() IS 'Cria espelhos automáticos de transações compartilhadas para membros da família';
COMMENT ON FUNCTION update_mirrors_on_split_change() IS 'Atualiza espelhos quando splits são modificados';
COMMENT ON FUNCTION delete_mirror_on_split_delete() IS 'Remove espelhos quando splits são deletados';

-- =====================================================
-- 10. MIGRAR DADOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Criar espelhos para transações compartilhadas existentes
DO $$
DECLARE
  tx_record RECORD;
BEGIN
  FOR tx_record IN 
    SELECT * FROM transactions 
    WHERE is_shared = true
  LOOP
    -- Trigger vai criar os espelhos automaticamente
    UPDATE transactions 
    SET updated_at = NOW() 
    WHERE id = tx_record.id;
  END LOOP;
END $$;

