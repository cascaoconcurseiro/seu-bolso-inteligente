-- ============================================================================
-- MIGRATION: Data Integrity Hardening
-- ============================================================================
-- 1. CHECK constraints on transactions (type, currency)
-- 2. Composite index (account_id, date DESC) for statement queries
-- 3. Idempotency key for duplicate prevention across tabs
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: CHECK constraints — prevent invalid data at DB level
-- ============================================================================

-- 1a. type must be one of the 3 valid transaction types
-- Uses NOT VALID to avoid blocking existing data, then validates.
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_transactions_type_valid
  CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER'))
  NOT VALID;

DO $$
BEGIN
  ALTER TABLE public.transactions VALIDATE CONSTRAINT chk_transactions_type_valid;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Existem transacoes com type invalido. Corrija antes de validar.';
END;
$$;

-- 1b. currency must be non-empty when provided
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_transactions_currency_not_empty
  CHECK (currency IS NULL OR currency != '')
  NOT VALID;

DO $$
BEGIN
  ALTER TABLE public.transactions VALIDATE CONSTRAINT chk_transactions_currency_not_empty;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Existem transacoes com currency vazio. Corrija antes de validar.';
END;
$$;

-- ============================================================================
-- PHASE 2: Composite index for statement queries
-- ============================================================================
-- Every account statement query does: WHERE (account_id = X OR destination_account_id = X)
-- AND date BETWEEN Y AND Z ORDER BY date. This index covers the most common pattern.
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
  ON public.transactions(account_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_dest_account_date
  ON public.transactions(destination_account_id, date DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- PHASE 3: Idempotency key for duplicate prevention
-- ============================================================================
-- Apps como Stripe usam idempotency_key para garantir que a mesma operacao
-- nao seja executada 2x (ex: duas abas abertas criando a mesma transacao).
-- UNIQUE com nullable: NULLs nao sao comparados, entao transacoes existentes
-- sem key nao sao afetadas.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID DEFAULT NULL;

-- Partial unique index: only enforce uniqueness when key IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key
  ON public.transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.transactions.idempotency_key IS
  'UUID gerado pelo frontend antes de enviar. Garante que a mesma transacao nao seja criada 2x.';

-- ============================================================================
-- ANALYZE
-- ============================================================================
ANALYZE public.transactions;

COMMIT;
