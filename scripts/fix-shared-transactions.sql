-- =====================================================
-- SCRIPT: Corrigir Sistema de Transações Compartilhadas
-- Data: 26/12/2024
-- Problema: Transações compartilhadas não aparecem para outros usuários
-- =====================================================

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT 
  'Verificando tabelas...' as status;

-- Verificar se shared_transaction_mirrors existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'shared_transaction_mirrors'
    ) THEN 'Tabela shared_transaction_mirrors EXISTE'
    ELSE 'Tabela shared_transaction_mirrors NÃO EXISTE'
  END as resultado;

-- 2. VERIFICAR TRANSAÇÕES COMPARTILHADAS EXISTENTES
SELECT 
  'Transações compartilhadas existentes:' as info,
  COUNT(*) as total
FROM transactions
WHERE is_shared = true
AND source_transaction_id IS NULL;

-- 3. VERIFICAR SPLITS EXISTENTES
SELECT 
  'Splits existentes:' as info,
  COUNT(*) as total
FROM transaction_splits;

-- 4. VERIFICAR ESPELHOS CRIADOS
SELECT 
  'Espelhos criados (source_transaction_id):' as info,
  COUNT(*) as total
FROM transactions
WHERE source_transaction_id IS NOT NULL;

-- 5. VERIFICAR MEMBROS DA FAMÍLIA COM USER_ID
SELECT 
  'Membros com user_id vinculado:' as info,
  COUNT(*) as total
FROM family_members
WHERE user_id IS NOT NULL OR linked_user_id IS NOT NULL;

-- =====================================================
-- SOLUÇÃO: Criar função simplificada de espelhamento
-- =====================================================

-- Remover triggers antigos que podem estar conflitando
DROP TRIGGER IF EXISTS trigger_mirror_shared_transaction ON transactions;
DROP TRIGGER IF EXISTS trigger_update_mirrors_on_split_change ON transaction_splits;
DROP TRIGGER IF EXISTS trigger_delete_mirror_on_split_delete ON transaction_splits;
DROP TRIGGER IF EXISTS trg_sync_shared_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS trg_sync_shared_transaction_update ON transactions;

-- Criar função simplificada de espelhamento
CREATE OR REPLACE FUNCTION create_transaction_mirrors()
RETURNS TRIGGER AS $$
DECLARE
  split_record RECORD;
  member_record RECORD;
  mirror_id UUID;
BEGIN
  -- Apenas processar se:
  -- 1. É uma transação compartilhada
  -- 2. NÃO é um espelho (source_transaction_id IS NULL)
  -- 3. É INSERT ou UPDATE que mudou is_shared para true
  IF NEW.is_shared = true 
     AND NEW.source_transaction_id IS NULL 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.is_shared IS NULL OR OLD.is_shared = false))) THEN
    
    -- Para cada split desta transação
    FOR split_record IN 
      SELECT * FROM transaction_splits 
      WHERE transaction_id = NEW.id
    LOOP
      -- Buscar informações do membro
      SELECT * INTO member_record 
      FROM family_members 
      WHERE id = split_record.member_id;
      
      -- Se o membro tem user_id ou linked_user_id vinculado
      IF member_record.user_id IS NOT NULL OR member_record.linked_user_id IS NOT NULL THEN
        
        -- Verificar se já existe espelho para este membro
        SELECT id INTO mirror_id
        FROM transactions
        WHERE source_transaction_id = NEW.id
        AND user_id = COALESCE(member_record.user_id, member_record.linked_user_id);
        
        IF mirror_id IS NULL THEN
          -- Criar transação espelhada
          INSERT INTO transactions (
            user_id,
            amount,
            description,
            date,
            type,
            category_id,
            trip_id,
            domain,
            is_shared,
            payer_id,
            source_transaction_id,
            is_settled,
            creator_user_id,
            created_at,
            updated_at
          ) VALUES (
            COALESCE(member_record.user_id, member_record.linked_user_id),
            split_record.amount,
            NEW.description || ' (Compartilhado)',
            NEW.date,
            NEW.type,
            NEW.category_id,
            NEW.trip_id,
            COALESCE(NEW.domain, 'SHARED'),
            true,
            NEW.user_id, -- Quem pagou
            NEW.id, -- Transação original
            split_record.is_settled,
            NEW.user_id, -- Criador original
            NOW(),
            NOW()
          );
        ELSE
          -- Atualizar espelho existente
          UPDATE transactions SET
            amount = split_record.amount,
            description = NEW.description || ' (Compartilhado)',
            date = NEW.date,
            is_settled = split_record.is_settled,
            updated_at = NOW()
          WHERE id = mirror_id;
        END IF;
        
      END IF;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para INSERT
CREATE TRIGGER trigger_create_mirrors_on_insert
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.is_shared = true AND NEW.source_transaction_id IS NULL)
EXECUTE FUNCTION create_transaction_mirrors();

-- Criar trigger para UPDATE
CREATE TRIGGER trigger_create_mirrors_on_update
AFTER UPDATE ON transactions
FOR EACH ROW
WHEN (NEW.is_shared = true AND NEW.source_transaction_id IS NULL)
EXECUTE FUNCTION create_transaction_mirrors();

-- =====================================================
-- MIGRAR TRANSAÇÕES EXISTENTES
-- =====================================================

-- Criar espelhos para transações compartilhadas que ainda não têm
DO $$
DECLARE
  tx_record RECORD;
  split_record RECORD;
  member_record RECORD;
  mirror_id UUID;
BEGIN
  -- Para cada transação compartilhada sem espelhos
  FOR tx_record IN 
    SELECT * FROM transactions 
    WHERE is_shared = true 
    AND source_transaction_id IS NULL
  LOOP
    -- Para cada split desta transação
    FOR split_record IN 
      SELECT * FROM transaction_splits 
      WHERE transaction_id = tx_record.id
    LOOP
      -- Buscar informações do membro
      SELECT * INTO member_record 
      FROM family_members 
      WHERE id = split_record.member_id;
      
      -- Se o membro tem user_id ou linked_user_id vinculado
      IF member_record.user_id IS NOT NULL OR member_record.linked_user_id IS NOT NULL THEN
        
        -- Verificar se já existe espelho
        SELECT id INTO mirror_id
        FROM transactions
        WHERE source_transaction_id = tx_record.id
        AND user_id = COALESCE(member_record.user_id, member_record.linked_user_id);
        
        IF mirror_id IS NULL THEN
          -- Criar transação espelhada
          INSERT INTO transactions (
            user_id,
            amount,
            description,
            date,
            type,
            category_id,
            trip_id,
            domain,
            is_shared,
            payer_id,
            source_transaction_id,
            is_settled,
            creator_user_id,
            created_at,
            updated_at
          ) VALUES (
            COALESCE(member_record.user_id, member_record.linked_user_id),
            split_record.amount,
            tx_record.description || ' (Compartilhado)',
            tx_record.date,
            tx_record.type,
            tx_record.category_id,
            tx_record.trip_id,
            COALESCE(tx_record.domain, 'SHARED'),
            true,
            tx_record.user_id,
            tx_record.id,
            split_record.is_settled,
            tx_record.user_id,
            NOW(),
            NOW()
          );
          
          RAISE NOTICE 'Espelho criado para transação % e membro %', tx_record.id, member_record.name;
        END IF;
        
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
  'VERIFICAÇÃO FINAL' as status;

SELECT 
  'Transações compartilhadas:' as tipo,
  COUNT(*) as total
FROM transactions
WHERE is_shared = true
AND source_transaction_id IS NULL;

SELECT 
  'Espelhos criados:' as tipo,
  COUNT(*) as total
FROM transactions
WHERE source_transaction_id IS NOT NULL;

SELECT 
  'Splits:' as tipo,
  COUNT(*) as total
FROM transaction_splits;

-- Mostrar detalhes das transações compartilhadas
SELECT 
  t.id,
  t.description,
  t.amount,
  t.date,
  t.user_id as criador_user_id,
  p.email as criador_email,
  COUNT(ts.id) as num_splits,
  COUNT(m.id) as num_espelhos
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN transactions m ON m.source_transaction_id = t.id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
GROUP BY t.id, t.description, t.amount, t.date, t.user_id, p.email
ORDER BY t.created_at DESC
LIMIT 10;
