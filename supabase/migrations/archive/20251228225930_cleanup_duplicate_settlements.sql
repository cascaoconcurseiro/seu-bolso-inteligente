-- Limpar transações duplicadas de acerto (manter apenas a primeira)
-- Primeiro, identificar as duplicatas
WITH duplicates AS (
  SELECT id, description, amount, created_at,
         ROW_NUMBER() OVER (PARTITION BY description, amount ORDER BY created_at ASC) as rn
  FROM transactions
  WHERE user_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9'
    AND description LIKE 'Pagamento%Acerto%'
    AND amount = 3.75
)
DELETE FROM transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Recalcular saldo da conta Nubank
-- Saldo inicial: 1000
-- Transações: uber -50, carro -100, Testei comida -55.55, ooo +100, Pagamento Parcial Acerto -28.73
-- Saldo esperado: 1000 - 50 - 100 - 55.55 + 100 - 28.73 = 865.72
UPDATE accounts
SET balance = 865.72
WHERE id = 'adc7c429-fe72-44bc-a535-c65ddade4e9f';;
