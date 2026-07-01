BEGIN;

-- ============================================================
-- Fix: settlement transaction descriptions with wrong year
-- ============================================================

-- 1. Update existing settlement transactions: rebuild description
-- using the correct year from the transaction's date column
UPDATE transactions
SET description =
  CASE
    WHEN description LIKE 'Recebimento de despesa compartilhada - %' THEN
      'Recebimento de despesa compartilhada - ' ||
      CASE EXTRACT(MONTH FROM date)::int
        WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março'
        WHEN 4 THEN 'Abril' WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho'
        WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Setembro'
        WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
      END || '/' || EXTRACT(YEAR FROM date)::text
    WHEN description LIKE 'Pagamento de despesa compartilhada - %' THEN
      'Pagamento de despesa compartilhada - ' ||
      CASE EXTRACT(MONTH FROM date)::int
        WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março'
        WHEN 4 THEN 'Abril' WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho'
        WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Setembro'
        WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
      END || '/' || EXTRACT(YEAR FROM date)::text
    ELSE description
  END
WHERE (
  description LIKE 'Recebimento de despesa compartilhada - %' OR
  description LIKE 'Pagamento de despesa compartilhada - %'
);

COMMIT;
