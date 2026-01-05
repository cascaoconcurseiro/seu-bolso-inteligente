-- PROBLEMA: RLS da tabela accounts está bloqueando acesso a contas de outros membros da família
-- Isso impede que o cálculo de vencimento funcione corretamente no Compartilhados

-- 1. Ver a policy atual
SELECT * FROM pg_policies WHERE tablename = 'accounts';

-- 2. Dropar a policy antiga (se existir)
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view family accounts" ON accounts;

-- 3. Criar nova policy que permite:
--    a) Ver suas próprias contas
--    b) Ver contas de membros da família
--    c) Ver contas usadas em transações compartilhadas
CREATE POLICY "Users can view own and family accounts"
ON accounts
FOR SELECT
USING (
  -- Suas próprias contas
  user_id = auth.uid()
  OR
  -- Contas de membros da sua família
  user_id IN (
    SELECT fm.linked_user_id
    FROM family_members fm
    WHERE fm.family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE linked_user_id = auth.uid()
    )
  )
  OR
  -- Contas usadas em transações compartilhadas onde você está envolvido
  id IN (
    SELECT DISTINCT t.account_id
    FROM transactions t
    INNER JOIN transaction_splits ts ON ts.transaction_id = t.id
    WHERE ts.user_id = auth.uid()
    AND t.account_id IS NOT NULL
  )
);

-- 4. Verificar se a policy foi criada
SELECT * FROM pg_policies WHERE tablename = 'accounts';

-- 5. Testar a query que estava falhando
-- (Execute isso logado como Wesley)
SELECT id, type, closing_day, due_day, user_id
FROM accounts
WHERE id IN (
  '9e04ab26-4b75-4844-a530-3c4359f6c6f3',  -- Conta da Fran
  '7921a968-401f-4bb5-b7dd-900aa6954f55'   -- Conta do Wesley
);

-- Deve retornar 2 contas agora!
