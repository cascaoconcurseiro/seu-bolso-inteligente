-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO: Split do Wesley (teste compartilhado)
-- ============================================================================
-- Este script verifica o estado atual do split problemático onde
-- a Fran pagou a fatura do Wesley mas não foi marcado como pago.
-- ============================================================================

-- 1. Buscar a transação "teste compartilhado"
SELECT 
  id,
  description,
  amount,
  date,
  competence_date,
  type,
  user_id,
  payer_id,
  is_shared,
  is_mirror,
  is_settled,
  settled_at,
  source_transaction_id,
  created_at
FROM transactions
WHERE description LIKE '%teste compartilhado%'
ORDER BY created_at DESC;

-- 2. Buscar os splits dessa transação
SELECT 
  ts.id as split_id,
  ts.transaction_id,
  ts.member_id,
  ts.user_id,
  fm.name as member_name,
  ts.amount,
  ts.percentage,
  ts.is_settled,
  ts.settled_at,
  ts.settled_transaction_id,
  ts.created_at
FROM transaction_splits ts
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.transaction_id IN (
  SELECT id FROM transactions 
  WHERE description LIKE '%teste compartilhado%'
)
ORDER BY ts.created_at DESC;

-- 3. Verificar se há transação de acerto relacionada
SELECT 
  t.id,
  t.description,
  t.amount,
  t.date,
  t.type,
  t.domain,
  t.related_member_id,
  fm.name as related_member_name,
  t.created_at
FROM transactions t
LEFT JOIN family_members fm ON fm.id = t.related_member_id
WHERE t.description LIKE '%Acerto%'
  AND (
    t.description LIKE '%Wesley%' 
    OR t.description LIKE '%Fran%'
  )
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Verificar membros da família (Fran e Wesley)
SELECT 
  id,
  name,
  user_id,
  linked_user_id,
  created_at
FROM family_members
WHERE name IN ('Fran', 'Wesley', 'fran', 'wesley')
ORDER BY name;

-- 5. Verificar políticas RLS da tabela transaction_splits
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'transaction_splits';

-- 6. Verificar triggers da tabela transaction_splits
SELECT 
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'transaction_splits'::regclass
ORDER BY tgname;

-- ============================================================================
-- ANÁLISE ESPERADA
-- ============================================================================
-- 
-- Query 1 (Transações):
-- - Deve mostrar a transação "teste compartilhado" criada pela Fran
-- - user_id deve ser o ID da Fran
-- - is_shared deve ser TRUE
-- - is_settled pode estar FALSE (problema)
--
-- Query 2 (Splits):
-- - Deve mostrar o split do Wesley
-- - member_id deve ser o ID do Wesley
-- - user_id deve ser o ID do Wesley (linked_user_id)
-- - is_settled deve estar FALSE (problema) ou TRUE (se já foi corrigido)
-- - settled_transaction_id deve estar NULL (problema) ou preenchido
--
-- Query 3 (Transações de Acerto):
-- - Deve mostrar se há alguma transação de acerto criada
-- - Se houver, verificar se settled_transaction_id do split aponta para ela
--
-- Query 4 (Membros):
-- - Deve mostrar Fran e Wesley
-- - Verificar linked_user_id de cada um
--
-- Query 5 (RLS):
-- - Verificar se há política que permite UPDATE em transaction_splits
-- - Deve ter algo como: user_id = auth.uid()
--
-- Query 6 (Triggers):
-- - Verificar se há triggers que podem estar interferindo
-- - Especialmente triggers BEFORE UPDATE ou AFTER UPDATE
--
-- ============================================================================

-- ============================================================================
-- CORREÇÃO MANUAL (SE NECESSÁRIO)
-- ============================================================================
-- Se o split não foi marcado como pago, você pode corrigir manualmente:
--
-- UPDATE transaction_splits
-- SET 
--   is_settled = TRUE,
--   settled_at = NOW(),
--   settled_transaction_id = '<ID_DA_TRANSACAO_DE_ACERTO>'
-- WHERE id = '<ID_DO_SPLIT_DO_WESLEY>';
--
-- IMPORTANTE: Substitua <ID_DO_SPLIT_DO_WESLEY> e <ID_DA_TRANSACAO_DE_ACERTO>
-- pelos valores corretos obtidos nas queries acima.
-- ============================================================================
