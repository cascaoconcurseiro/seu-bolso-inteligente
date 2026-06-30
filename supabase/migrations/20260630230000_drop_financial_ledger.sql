-- AUD-07: Drop financial_ledger — tabela órfã, substituída por expense_splits + settlement_reversals
-- 252 rows de dados legacy, sem uso no frontend, sem FKs apontando para ela

DROP TABLE IF EXISTS financial_ledger CASCADE;
