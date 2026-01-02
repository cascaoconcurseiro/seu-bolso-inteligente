-- =====================================================
-- FIX DEFINITIVO: Sistema de Espelhamento
-- Data: 27/12/2024
-- Corrige TODOS os 7 problemas clássicos
-- =====================================================

-- =====================================================
-- PASSO 1: LIMPAR TRIGGERS E FUNÇÕES ANTIGAS
-- =====================================================

-- Remover todos os triggers antigos
DROP TRIGGER IF EXISTS trigger_mirror_shared_transaction ON transactions;
DROP TRIGGER IF EXISTS trigger_update_mirrors_on_split_change ON transaction_splits;
DROP TRIGGER IF EXISTS trigger_delete_mirror_on_split_delete ON transaction_splits;
DROP TRIGGER IF EXISTS trg_sync_shared_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS trg_sync_shared_transaction_update ON transactions;
DROP TRIGGER IF EXISTS sync_shared_transaction_trigger ON transactions;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_update ON transactions;
DROP TRIGGER IF EXISTS sync_pending_on_link_trigger ON family_members;
DROP TRIGGER IF EXISTS delete_mirror_trigger ON transactions;
DROP TRIGGER IF EXISTS sync_installment_mirrors_trigger ON transactions;

-- Remover funções antigas
DROP FUNCTION IF EXISTS create_transaction_mirrors() CASCADE;
DROP FUNCTION IF EXISTS sync_shared_transaction(UUID) CASCADE;
DROP FUNCTION IF EXISTS handle_shared_transaction_sync() CASCADE;

-- =====================================================
-- PASSO 2: CRIAR FUNÇÃO PROFISSIONAL DE ESPELHAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION handle_transaction_mirroring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
  v_member RECORD;
  v_mirror_id UUID;
  v_payer_name TEXT;
BEGIN
  -- =====================================================
  -- 1️⃣ ANTI-LOOP: Evitar recursão infinita
  -- =====================================================
  IF TG_OP <> 'DELETE' AND NEW.source_transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- =====================================================
  -- 2️⃣ DELETE: Apagar espelhos quando original é deletada
  -- =====================================================
  IF TG_OP = 'DELETE' THEN
    DELETE FROM transactions
    WHERE source_transaction_id = OLD.id;
    
    DELETE FROM shared_transaction_mirrors
    WHERE original_transaction_id = OLD.id;
    
    RETURN OLD;
  END IF;

  -- =====================================================
  -- 3️⃣ VERIFICAR SE É COMPARTILHADA
  -- =====================================================
  IF NEW.is_shared IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  -- =====================================================
  -- 4️⃣ UPDATE: Sincronizar espelhos existentes
  -- =====================================================
  IF TG_OP = 'UPDATE' THEN
    UPDATE transactions
    SET
      amount = (
        SELECT ts.amount 
        FROM transaction_splits ts
        LEFT JOIN family_members fm ON fm.id = ts.member_id
        WHERE ts.transaction_id = NEW.id
        AND (fm.user_id = transactions.user_id OR fm.linked_user_id = transactions.user_id)
        LIMIT 1
      ),
      description = NEW.description,
      date = NEW.date,
      type = NEW.type,
      category_id = NEW.category_id,
      updated_at = NOW()
    WHERE source_transaction_id = NEW.id;
    
    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  -- =====================================================
  -- 5️⃣ INSERT/UPDATE: Criar espelhos para novos membros
  -- =====================================================
  
  SELECT COALESCE(full_name, email, 'Outro') INTO v_payer_name
  FROM profiles
  WHERE id = NEW.user_id;

  FOR v_split IN
    SELECT 
      ts.*,
      fm.user_id as member_user_id,
      fm.linked_user_id as member_linked_user_id,
      fm.name as member_name
    FROM transaction_splits ts
    INNER JOIN family_members fm ON fm.id = ts.member_id
    WHERE ts.transaction_id = NEW.id
  LOOP
    v_member.target_user_id := COALESCE(
      v_split.member_user_id,
      v_split.member_linked_user_id
    );
    
    IF v_member.target_user_id IS NOT NULL 
       AND v_member.target_user_id != NEW.user_id THEN
      
      SELECT id INTO v_mirror_id
      FROM transactions
      WHERE source_transaction_id = NEW.id
      AND user_id = v_member.target_user_id;
      
      IF v_mirror_id IS NULL THEN
        v_mirror_id := gen_random_uuid();
        
        INSERT INTO transactions (
          id,
          user_id,
          amount,
          description,
          date,
          type,
          account_id,
          category_id,
          trip_id,
          is_shared,
          payer_id,
          source_transaction_id,
          domain,
          sync_status,
          created_at,
          updated_at
        ) VALUES (
          v_mirror_id,
          v_member.target_user_id,
          v_split.amount,
          NEW.description || ' (Compartilhado por ' || v_payer_name || ')',
          NEW.date,
          NEW.type,
          NULL,
          NULL,
          NULL,
          TRUE,
          NEW.user_id,
          NEW.id,
          COALESCE(NEW.domain, 'SHARED'),
          'SYNCED',
          NOW(),
          NOW()
        );
        
        INSERT INTO shared_transaction_mirrors (
          original_transaction_id,
          mirror_transaction_id,
          mirror_user_id,
          sync_status,
          last_sync_at
        ) VALUES (
          NEW.id,
          v_mirror_id,
          v_member.target_user_id,
          'SYNCED',
          NOW()
        )
        ON CONFLICT (original_transaction_id, mirror_user_id) 
        DO UPDATE SET
          mirror_transaction_id = EXCLUDED.mirror_transaction_id,
          sync_status = 'SYNCED',
          last_sync_at = NOW(),
          updated_at = NOW();
        
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- =====================================================
-- PASSO 3: CRIAR TRIGGERS CORRETOS
-- =====================================================

CREATE TRIGGER trg_transaction_mirroring
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION handle_transaction_mirroring();

-- =====================================================
-- PASSO 4: CRIAR ÍNDICES OBRIGATÓRIOS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_mirror_id 
ON transactions (source_transaction_id)
WHERE source_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_shared 
ON transactions (is_shared, source_transaction_id)
WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction 
ON transaction_splits (transaction_id);

CREATE INDEX IF NOT EXISTS idx_family_members_user_ids
ON family_members (user_id, linked_user_id)
WHERE user_id IS NOT NULL OR linked_user_id IS NOT NULL;

-- =====================================================
-- PASSO 5: TRIGGER PARA AUTO-CONEXÃO DE MEMBROS
-- =====================================================

CREATE OR REPLACE FUNCTION handle_auto_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_user_id UUID;
  v_transaction RECORD;
BEGIN
  IF NEW.linked_user_id IS NOT NULL 
     AND (OLD.linked_user_id IS NULL OR OLD.linked_user_id IS DISTINCT FROM NEW.linked_user_id) THEN
    
    FOR v_transaction IN
      SELECT DISTINCT t.*
      FROM transactions t
      INNER JOIN transaction_splits ts ON ts.transaction_id = t.id
      WHERE t.is_shared = true
      AND t.source_transaction_id IS NULL
      AND ts.member_id = NEW.id
    LOOP
      UPDATE transactions
      SET updated_at = updated_at
      WHERE id = v_transaction.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_connection ON family_members;
CREATE TRIGGER trg_auto_connection
AFTER INSERT OR UPDATE ON family_members
FOR EACH ROW
WHEN (NEW.linked_user_id IS NOT NULL)
EXECUTE FUNCTION handle_auto_connection();;
