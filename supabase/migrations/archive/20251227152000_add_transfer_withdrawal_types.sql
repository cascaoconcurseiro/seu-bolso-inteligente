-- Add TRANSFER and WITHDRAWAL transaction types
-- Data: 2024-12-27
-- Objetivo: Suportar transferências entre contas e saques

-- ============================================================================
-- 1. ADICIONAR NOVOS TIPOS DE TRANSAÇÃO
-- ============================================================================

-- Adicionar TRANSFER e WITHDRAWAL ao enum transaction_type
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DEPOSIT';

COMMENT ON TYPE transaction_type IS 
  'Tipos de transação: INCOME (receita), EXPENSE (despesa), TRANSFER (transferência), WITHDRAWAL (saque), DEPOSIT (depósito)';

-- ============================================================================
-- 2. ADICIONAR COLUNA PARA TRANSAÇÕES VINCULADAS
-- ============================================================================

-- Adicionar coluna para vincular transações (usado em transferências)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN transactions.linked_transaction_id IS 
  'ID da transação vinculada. Usado em transferências para vincular débito e crédito.';

-- ============================================================================
-- 3. CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_linked 
  ON transactions(linked_transaction_id) 
  WHERE linked_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_type 
  ON transactions(type);

-- ============================================================================
-- 4. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_has_transfer BOOLEAN;
  v_has_withdrawal BOOLEAN;
  v_has_deposit BOOLEAN;
  v_has_column BOOLEAN;
  v_has_index BOOLEAN;
BEGIN
  -- Verificar tipos
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'TRANSFER'
  ) INTO v_has_transfer;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'WITHDRAWAL'
  ) INTO v_has_withdrawal;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'DEPOSIT'
  ) INTO v_has_deposit;
  
  -- Verificar coluna
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'linked_transaction_id'
  ) INTO v_has_column;
  
  -- Verificar índice
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'transactions' AND indexname = 'idx_transactions_linked'
  ) INTO v_has_index;
  
  RAISE NOTICE '=== VALIDAÇÃO DA MIGRAÇÃO ===';
  RAISE NOTICE 'Tipo TRANSFER: %', CASE WHEN v_has_transfer THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Tipo WITHDRAWAL: %', CASE WHEN v_has_withdrawal THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Tipo DEPOSIT: %', CASE WHEN v_has_deposit THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Coluna linked_transaction_id: %', CASE WHEN v_has_column THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Índice criado: %', CASE WHEN v_has_index THEN '✓' ELSE '✗' END;
  
  IF v_has_transfer AND v_has_withdrawal AND v_has_deposit AND v_has_column AND v_has_index THEN
    RAISE NOTICE '✓ Migração aplicada com sucesso!';
  ELSE
    RAISE WARNING 'Alguns itens falharam. Verifique os detalhes acima.';
  END IF;
END $$;
