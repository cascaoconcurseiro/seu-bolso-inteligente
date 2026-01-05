-- =====================================================
-- MIGRATION: Fix all credit card competence dates
-- Data: 2026-01-04
-- Descrição: Corrigir competence_date de todas as transações de cartão de crédito
-- =====================================================

-- Corrigir transações originais de cartão de crédito
WITH transactions_to_fix AS (
  SELECT 
    t.id,
    calculate_credit_card_competence_date(t.date::DATE, a.closing_day, a.due_day) as correct_competence_date
  FROM transactions t
  JOIN accounts a ON t.account_id = a.id
  WHERE a.type = 'CREDIT_CARD'
    AND t.source_transaction_id IS NULL
    AND t.competence_date != calculate_credit_card_competence_date(t.date::DATE, a.closing_day, a.due_day)
)
UPDATE transactions t
SET competence_date = ttf.correct_competence_date
FROM transactions_to_fix ttf
WHERE t.id = ttf.id;

-- Corrigir transações espelho copiando da original
UPDATE transactions mirror
SET competence_date = original.competence_date
FROM transactions original
WHERE mirror.source_transaction_id = original.id
  AND mirror.source_transaction_id IS NOT NULL
  AND mirror.competence_date != original.competence_date;

-- Retornar estatísticas
SELECT 
  'Transações corrigidas' as status,
  COUNT(*) as total
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.type = 'CREDIT_CARD'
  AND t.competence_date = calculate_credit_card_competence_date(t.date::DATE, a.closing_day, a.due_day);;
