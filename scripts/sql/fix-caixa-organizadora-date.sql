-- DIAGNÓSTICO: Verificar a transação "Caixa organizadora"
-- Esta transação foi criada em 04/01/2026 e está aparecendo no mês errado

-- 1. Encontrar a transação e ver seus dados atuais
SELECT 
  id,
  description,
  date,
  competence_date,
  account_id,
  user_id,
  amount,
  is_shared
FROM transactions
WHERE description ILIKE '%caixa organizadora%'
  AND date >= '2026-01-01'
  AND date < '2026-02-01'
ORDER BY date DESC;

-- 2. Verificar a conta (cartão) associada
SELECT 
  a.id,
  a.name,
  a.type,
  a.closing_day,
  a.due_day,
  a.user_id
FROM accounts a
WHERE a.id IN (
  SELECT account_id 
  FROM transactions 
  WHERE description ILIKE '%caixa organizadora%'
    AND date >= '2026-01-01'
    AND date < '2026-02-01'
);

-- 3. Verificar os splits (divisão) da transação
SELECT 
  ts.id,
  ts.transaction_id,
  ts.user_id,
  ts.member_id,
  ts.amount,
  ts.settled_by_debtor,
  ts.settled_by_creditor,
  t.description,
  t.date,
  t.competence_date
FROM transaction_splits ts
JOIN transactions t ON t.id = ts.transaction_id
WHERE t.description ILIKE '%caixa organizadora%'
  AND t.date >= '2026-01-01'
  AND t.date < '2026-02-01';

-- IMPORTANTE: Execute as queries acima primeiro para ver os dados
-- Depois me envie os resultados para eu determinar a correção correta
