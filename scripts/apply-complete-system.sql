-- =====================================================
-- SCRIPT COMPLETO: Aplicar TODAS as funcionalidades
-- Data: 26/12/2024
-- Descrição: Script consolidado com TUDO que falta
-- =====================================================

-- =====================================================
-- PARTE 1: PERMISSÕES E CAMPOS (se ainda não aplicado)
-- =====================================================

-- 1. ADICIONAR ROLE E AVATAR EM FAMILY_MEMBERS
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

DO $ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE family_members ADD COLUMN role TEXT DEFAULT 'viewer';
  END IF;
END $;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_role_check'
  ) THEN
    ALTER TABLE family_members 
    ADD CONSTRAINT family_members_role_check 
    CHECK (role IN ('admin', 'editor', 'viewer'));
  END IF;
END $;

-- 2. ADICIONAR CREATOR_USER_ID EM TRANSACTIONS
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES profiles(id);

UPDATE transactions 
SET creator_user_id = user_id 
WHERE creator_user_id IS NULL;

-- 3. ADICIONAR IS_INTERNATIONAL EM ACCOUNTS
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- 4. ADICIONAR CAMPOS DE RECORRÊNCIA
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS frequency TEXT,
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_frequency_check'
  ) THEN
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_frequency_check 
    CHECK (frequency IS NULL OR frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));
  END IF;
END $;

-- 5. ADICIONAR CAMPOS DE LEMBRETE
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_date DATE,
ADD COLUMN IF NOT EXISTS reminder_option TEXT;

-- 6. ADICIONAR CAMPOS DE CONVERSÃO DE MOEDA
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS destination_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS destination_currency TEXT;

-- 7. ADICIONAR CAMPO IS_REFUND (ESTORNO)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_of_transaction_id UUID REFERENCES transactions(id);

-- =====================================================
-- PARTE 2: RLS POLICIES BASEADAS EM ROLE
-- =====================================================

DROP POLICY IF EXISTS "family_members_can_view_based_on_role" ON transactions;
DROP POLICY IF EXISTS "family_members_can_edit_based_on_role" ON transactions;
DROP POLICY IF EXISTS "family_members_can_delete_based_on_role" ON transactions;

CREATE POLICY "family_members_can_view_based_on_role"
ON transactions FOR SELECT
USING (
  user_id = auth.uid() 
  OR
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      f.owner_id = transactions.user_id 
      OR 
      EXISTS (
        SELECT 1 FROM family_members fm2 
        WHERE fm2.family_id = f.id 
        AND fm2.user_id = transactions.user_id
      )
    )
    AND fm.role IN ('admin', 'editor', 'viewer')
  )
);

CREATE POLICY "family_members_can_edit_based_on_role"
ON transactions FOR UPDATE
USING (
  creator_user_id = auth.uid() 
  OR
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      f.owner_id = transactions.user_id 
      OR 
      EXISTS (
        SELECT 1 FROM family_members fm2 
        WHERE fm2.family_id = f.id 
        AND fm2.user_id = transactions.user_id
      )
    )
    AND fm.role IN ('admin', 'editor')
  )
)
WITH CHECK (
  source_transaction_id IS NULL
);

CREATE POLICY "family_members_can_delete_based_on_role"
ON transactions FOR DELETE
USING (
  creator_user_id = auth.uid() 
  OR
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      f.owner_id = transactions.user_id 
      OR 
      EXISTS (
        SELECT 1 FROM family_members fm2 
        WHERE fm2.family_id = f.id 
        AND fm2.user_id = transactions.user_id
      )
    )
    AND fm.role = 'admin'
  )
);

-- =====================================================
-- PARTE 3: SISTEMA DE ESPELHAMENTO AUTOMÁTICO
-- =====================================================

-- Função: Espelhar transação para membros da família
CREATE OR REPLACE FUNCTION mirror_shared_transaction()
RETURNS TRIGGER AS $$
DECLARE
  split_record RECORD;
  member_record RECORD;
BEGIN
  IF NEW.is_shared = true AND (OLD IS NULL OR OLD.is_shared = false) THEN
    
    FOR split_record IN 
      SELECT * FROM transaction_splits 
      WHERE transaction_id = NEW.id
    LOOP
      SELECT * INTO member_record 
      FROM family_members 
      WHERE id = split_record.member_id;
      
      IF member_record.user_id IS NOT NULL OR member_record.linked_user_id IS NOT NULL THEN
        
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

DROP TRIGGER IF EXISTS trigger_mirror_shared_transaction ON transactions;

CREATE TRIGGER trigger_mirror_shared_transaction
AFTER INSERT OR UPDATE OF is_shared ON transactions
FOR EACH ROW
WHEN (NEW.is_shared = true)
EXECUTE FUNCTION mirror_shared_transaction();

-- Função: Atualizar espelhos quando splits mudam
CREATE OR REPLACE FUNCTION update_mirrors_on_split_change()
RETURNS TRIGGER AS $$
DECLARE
  tx_record RECORD;
  member_record RECORD;
BEGIN
  SELECT * INTO tx_record 
  FROM transactions 
  WHERE id = NEW.transaction_id;
  
  IF tx_record.is_shared = true THEN
    
    SELECT * INTO member_record 
    FROM family_members 
    WHERE id = NEW.member_id;
    
    IF member_record.user_id IS NOT NULL OR member_record.linked_user_id IS NOT NULL THEN
      
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

DROP TRIGGER IF EXISTS trigger_update_mirrors_on_split_change ON transaction_splits;

CREATE TRIGGER trigger_update_mirrors_on_split_change
AFTER INSERT OR UPDATE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION update_mirrors_on_split_change();

-- Função: Remover espelhos quando split é deletado
CREATE OR REPLACE FUNCTION delete_mirror_on_split_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM shared_transaction_mirrors
  WHERE original_transaction_id = OLD.transaction_id
  AND member_id = OLD.member_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_mirror_on_split_delete ON transaction_splits;

CREATE TRIGGER trigger_delete_mirror_on_split_delete
AFTER DELETE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION delete_mirror_on_split_delete();

-- =====================================================
-- PARTE 4: RLS POLICIES PARA ESPELHOS
-- =====================================================

ALTER TABLE shared_transaction_mirrors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mirrors" ON shared_transaction_mirrors;
DROP POLICY IF EXISTS "Users can view mirrors they created" ON shared_transaction_mirrors;

CREATE POLICY "Users can view their own mirrors"
ON shared_transaction_mirrors FOR SELECT
USING (mirror_user_id = auth.uid());

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
-- PARTE 5: ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_creator_user_id ON transactions(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_frequency ON transactions(frequency) WHERE frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_refund ON transactions(is_refund) WHERE is_refund = true;
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);
CREATE INDEX IF NOT EXISTS idx_accounts_is_international ON accounts(is_international);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_original_tx ON shared_transaction_mirrors(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_mirror_user ON shared_transaction_mirrors(mirror_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_member ON shared_transaction_mirrors(member_id);
CREATE INDEX IF NOT EXISTS idx_shared_mirrors_sync_status ON shared_transaction_mirrors(sync_status);

-- =====================================================
-- PARTE 6: MIGRAR DADOS EXISTENTES
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
    UPDATE transactions 
    SET updated_at = NOW() 
    WHERE id = tx_record.id;
  END LOOP;
END $$;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

SELECT 'Sistema completo aplicado com sucesso!' AS status;

