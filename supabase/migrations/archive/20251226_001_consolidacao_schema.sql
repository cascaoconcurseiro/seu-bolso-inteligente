-- ==============================================================================
-- MIGRATION: CONSOLIDAÇÃO E OTIMIZAÇÃO DO SCHEMA
-- DATA: 2025-12-26
-- ORIGEM: Migrado do PE (20260128_consolidacao_schema.sql)
-- OBJETIVO: Adicionar constraints, índices e otimizações do PE
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PARTE 1: ADICIONAR CONSTRAINTS DE TIPO
-- ==============================================================================

-- Verificar e corrigir valores inválidos em accounts.type
DO $$ 
DECLARE
  invalid_types TEXT[];
  type_count INTEGER;
BEGIN
  -- Verificar quais tipos inválidos existem
  SELECT array_agg(DISTINCT type) INTO invalid_types
  FROM accounts
  WHERE type NOT IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'LOAN', 'OTHER');
  
  -- Se houver tipos inválidos, corrigir para 'OTHER'
  IF invalid_types IS NOT NULL AND array_length(invalid_types, 1) > 0 THEN
    RAISE NOTICE 'Corrigindo tipos inválidos: %', invalid_types;
    
    SELECT COUNT(*) INTO type_count
    FROM accounts
    WHERE type NOT IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'LOAN', 'OTHER');
    
    RAISE NOTICE 'Atualizando % registros para type = ''OTHER''', type_count;
    
    UPDATE accounts
    SET type = 'OTHER'
    WHERE type NOT IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'LOAN', 'OTHER');
  END IF;
END $$;

-- Adicionar constraint de tipo para accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_account_type' 
    AND conrelid = 'accounts'::regclass
  ) THEN
    ALTER TABLE accounts
    ADD CONSTRAINT check_account_type
    CHECK (type IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'LOAN', 'OTHER'));
  END IF;
END $$;

-- Verificar e adicionar constraint para transactions.type
DO $$ 
DECLARE
  invalid_types TEXT[];
  type_count INTEGER;
BEGIN
  SELECT array_agg(DISTINCT type) INTO invalid_types
  FROM transactions
  WHERE type NOT IN ('RECEITA', 'DESPESA', 'TRANSFERÊNCIA');
  
  IF invalid_types IS NOT NULL AND array_length(invalid_types, 1) > 0 THEN
    RAISE WARNING 'Tipos inválidos encontrados em transactions: %. Verifique manualmente!', invalid_types;
    
    SELECT COUNT(*) INTO type_count
    FROM transactions
    WHERE type NOT IN ('RECEITA', 'DESPESA', 'TRANSFERÊNCIA');
    
    RAISE WARNING '% transações com tipos inválidos. Constraint não será adicionada.', type_count;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_transaction_type' 
      AND conrelid = 'transactions'::regclass
    ) THEN
      ALTER TABLE transactions
      ADD CONSTRAINT check_transaction_type
      CHECK (type IN ('RECEITA', 'DESPESA', 'TRANSFERÊNCIA'));
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- PARTE 2: ADICIONAR ÍNDICES CRÍTICOS
-- ==============================================================================

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
  ON transactions(user_id, date DESC) 
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_transactions_account 
  ON transactions(account_id) 
  WHERE account_id IS NOT NULL AND deleted = false;

CREATE INDEX IF NOT EXISTS idx_transactions_type 
  ON transactions(type) 
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_transactions_destination 
  ON transactions(destination_account_id) 
  WHERE destination_account_id IS NOT NULL AND deleted = false;

-- Índices para accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_type 
  ON accounts(user_id, type) 
  WHERE deleted = false;

-- ==============================================================================
-- PARTE 3: FUNÇÃO DE ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas principais (se não existir)
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY['accounts', 'transactions', 'trips'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_%s_updated_at ON %I;
      CREATE TRIGGER trg_update_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- ==============================================================================
-- PARTE 4: VIEW DE SAÚDE DO SISTEMA
-- ==============================================================================

CREATE OR REPLACE VIEW view_system_health AS
SELECT 
  'ORPHAN_TRANSACTIONS' as issue_type,
  COUNT(*) as count,
  'Transações com conta de origem deletada ou inválida' as description
FROM transactions t
WHERE t.account_id IS NOT NULL
  AND t.deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM accounts a 
    WHERE a.id = t.account_id 
    AND a.deleted = false
  )

UNION ALL

SELECT 
  'TRANSFERS_WITHOUT_DESTINATION' as issue_type,
  COUNT(*) as count,
  'Transferências sem conta de destino' as description
FROM transactions t
WHERE t.type = 'TRANSFERÊNCIA'
  AND t.deleted = false
  AND t.destination_account_id IS NULL

UNION ALL

SELECT 
  'CIRCULAR_TRANSFERS' as issue_type,
  COUNT(*) as count,
  'Transferências com origem igual ao destino' as description
FROM transactions t
WHERE t.type = 'TRANSFERÊNCIA'
  AND t.deleted = false
  AND t.account_id = destination_account_id;

COMMIT;

-- ==============================================================================
-- NOTAS:
-- ==============================================================================
-- 1. Esta migration adiciona constraints e índices sem quebrar funcionalidade
-- 2. updated_at automático em tabelas principais
-- 3. View de saúde do sistema para monitoramento
-- ==============================================================================
