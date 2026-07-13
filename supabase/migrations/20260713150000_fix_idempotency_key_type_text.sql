-- Corrige o tipo da coluna transactions.idempotency_key.
--
-- Contexto do bug:
-- A coluna foi adicionada como UUID em 20260702040000_data_integrity_hardening.sql,
-- porém TODO o código a trata como texto:
--   * As RPCs create_transaction_with_splits / create_installment_series extraem o
--     valor com o operador `->>` (que retorna text) e inserem sem cast para uuid.
--   * O fluxo de parcelamento no front gera chaves no formato `${uuid}:${parcela}`
--     (ex.: "550e8400-e29b-41d4-a716-446655440000:1"), que NUNCA é um uuid válido.
--
-- Resultado: qualquer transação que passe pela RPC (toda transação COMPARTILHADA,
-- e todo PARCELAMENTO) falhava com:
--   42804: column "idempotency_key" is of type uuid but expression is of type text
-- e a transação não era salva.
--
-- Chaves de idempotência (padrão Stripe) são strings opacas, não uuids.
-- Portanto o tipo correto é text.

ALTER TABLE public.transactions
  ALTER COLUMN idempotency_key TYPE text USING idempotency_key::text;

-- O índice único parcial é reconstruído automaticamente pelo ALTER TYPE acima;
-- garantimos aqui apenas que ele exista com a mesma semântica.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key
  ON public.transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.transactions.idempotency_key IS
  'Chave de idempotência (string opaca, padrão Stripe) usada para deduplicar '
  'retries. Parcelamentos usam o formato "<uuid>:<n>", por isso o tipo é text.';

NOTIFY pgrst, 'reload schema';
