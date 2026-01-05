-- Corrigir a data de competência da transação "Caixa organizadora"
-- Transação criada em 04/01/2026 com cartão que fecha dia 26 e vence dia 2
-- Deve aparecer na fatura de FEVEREIRO (vencimento 02/02/2026)

-- Encontrar a transação
SELECT 
  id,
  description,
  date,
  competence_date,
  account_id,
  user_id
FROM transactions
WHERE description ILIKE '%caixa organizadora%'
  AND date >= '2026-01-01'
  AND date < '2026-02-01';

-- Atualizar o competence_date para fevereiro
UPDATE transactions
SET competence_date = '2026-02-01'
WHERE description ILIKE '%caixa organizadora%'
  AND date >= '2026-01-01'
  AND date < '2026-02-01'
  AND competence_date = '2026-01-01';

-- Verificar a atualização
SELECT 
  id,
  description,
  date,
  competence_date,
  account_id,
  user_id
FROM transactions
WHERE description ILIKE '%caixa organizadora%'
  AND date >= '2026-01-01'
  AND date < '2026-02-01';
