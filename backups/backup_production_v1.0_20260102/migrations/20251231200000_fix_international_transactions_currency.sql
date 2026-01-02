-- Corrigir moeda de transações de contas internacionais
-- Transações de contas internacionais devem ter a moeda da conta, não NULL ou BRL

-- Atualizar transações existentes de contas internacionais que não têm moeda definida
UPDATE transactions t
SET currency = a.currency
FROM accounts a
WHERE t.account_id = a.id
  AND a.is_international = true
  AND (t.currency IS NULL OR t.currency = 'BRL')
  AND a.currency IS NOT NULL;

-- Comentário
COMMENT ON COLUMN transactions.currency IS 'Moeda da transação (BRL para nacionais, USD/EUR/etc para internacionais)';
