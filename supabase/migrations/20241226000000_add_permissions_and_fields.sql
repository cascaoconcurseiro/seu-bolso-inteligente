-- =====================================================
-- MIGRAÇÃO: Adicionar Permissões e Campos Faltantes
-- Data: 26/12/2024
-- Descrição: Adiciona roles, avatar, campos de recorrência, 
--            lembrete, conversão de moeda e creator_user_id
-- =====================================================

-- 1. ADICIONAR ROLE E AVATAR EM FAMILY_MEMBERS
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- Atualizar role existente para ter valores corretos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE family_members ADD COLUMN role TEXT DEFAULT 'viewer';
  END IF;
END $$;
-- Adicionar constraint de role se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_role_check'
  ) THEN
    ALTER TABLE family_members 
    ADD CONSTRAINT family_members_role_check 
    CHECK (role IN ('admin', 'editor', 'viewer'));
  END IF;
END $$;
-- 2. ADICIONAR CREATOR_USER_ID EM TRANSACTIONS
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES profiles(id);
-- Preencher creator_user_id com user_id para transações existentes
UPDATE transactions 
SET creator_user_id = user_id 
WHERE creator_user_id IS NULL;
-- 3. ADICIONAR IS_INTERNATIONAL EM ACCOUNTS
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;
-- 4. ADICIONAR CAMPOS DE RECORRÊNCIA EM TRANSACTIONS
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS frequency TEXT,
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;
-- Adicionar constraint de frequency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_frequency_check'
  ) THEN
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_frequency_check 
    CHECK (frequency IS NULL OR frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));
  END IF;
END $$;
-- 5. ADICIONAR CAMPOS DE LEMBRETE EM TRANSACTIONS
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_date DATE,
ADD COLUMN IF NOT EXISTS reminder_option TEXT;
-- 6. ADICIONAR CAMPOS DE CONVERSÃO DE MOEDA EM TRANSACTIONS
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS destination_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS destination_currency TEXT;
-- 7. ADICIONAR CAMPO IS_REFUND (ESTORNO)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_of_transaction_id UUID REFERENCES transactions(id);
-- =====================================================
-- RLS POLICIES BASEADAS EM ROLE
-- =====================================================

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "family_members_can_view_based_on_role" ON transactions;
DROP POLICY IF EXISTS "family_members_can_edit_based_on_role" ON transactions;
DROP POLICY IF EXISTS "family_members_can_delete_based_on_role" ON transactions;
-- POLICY: Visualização baseada em role
CREATE POLICY "family_members_can_view_based_on_role"
ON transactions FOR SELECT
USING (
  -- Próprio usuário sempre pode ver
  user_id = auth.uid() 
  OR
  -- Membros da família com qualquer role podem ver
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      f.owner_id = transactions.user_id 
      OR 
      EXISTS (
        SELECT 1 FROM family_members fm2 
        WHERE fm2.family_id = f.id 
        AND fm2.user_id = transactions.user_id
      )
    )
    AND fm.role IN ('admin', 'editor', 'viewer')
  )
);
-- POLICY: Edição baseada em role
CREATE POLICY "family_members_can_edit_based_on_role"
ON transactions FOR UPDATE
USING (
  -- Criador sempre pode editar
  creator_user_id = auth.uid() 
  OR
  -- Admin e Editor podem editar
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      f.owner_id = transactions.user_id 
      OR 
      EXISTS (
        SELECT 1 FROM family_members fm2 
        WHERE fm2.family_id = f.id 
        AND fm2.user_id = transactions.user_id
      )
    )
    AND fm.role IN ('admin', 'editor')
  )
)
WITH CHECK (
  -- Não pode editar transações espelhadas (mirrors)
  source_transaction_id IS NULL
);
-- POLICY: Exclusão baseada em role
CREATE POLICY "family_members_can_delete_based_on_role"
ON transactions FOR DELETE
USING (
  -- Criador sempre pode excluir
  creator_user_id = auth.uid() 
  OR
  -- Apenas Admin pode excluir transações de outros
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      f.owner_id = transactions.user_id 
      OR 
      EXISTS (
        SELECT 1 FROM family_members fm2 
        WHERE fm2.family_id = f.id 
        AND fm2.user_id = transactions.user_id
      )
    )
    AND fm.role = 'admin'
  )
);
-- =====================================================
-- POLICIES PARA FAMILY_MEMBERS (ROLE E AVATAR)
-- =====================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "family_members_can_update_role" ON family_members;
DROP POLICY IF EXISTS "family_members_can_update_avatar" ON family_members;
-- POLICY: Apenas Admin pode alterar role
CREATE POLICY "family_members_can_update_role"
ON family_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'admin'
  )
  OR
  -- Owner da família sempre pode
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
);
-- POLICY: Usuário pode atualizar próprio avatar
CREATE POLICY "family_members_can_update_avatar"
ON family_members FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  linked_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'admin'
  )
);
-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_creator_user_id ON transactions(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_frequency ON transactions(frequency) WHERE frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_refund ON transactions(is_refund) WHERE is_refund = true;
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);
CREATE INDEX IF NOT EXISTS idx_accounts_is_international ON accounts(is_international);
-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN family_members.role IS 'Nível de permissão: admin (total), editor (criar/editar), viewer (apenas visualizar)';
COMMENT ON COLUMN family_members.avatar_url IS 'URL da foto do membro da família';
COMMENT ON COLUMN transactions.creator_user_id IS 'ID do usuário que criou a transação (para controle de edição/exclusão)';
COMMENT ON COLUMN transactions.frequency IS 'Frequência de recorrência: DAILY, WEEKLY, MONTHLY, YEARLY';
COMMENT ON COLUMN transactions.recurrence_day IS 'Dia da recorrência (1-31 para mensal, 1-7 para semanal)';
COMMENT ON COLUMN transactions.enable_notification IS 'Se deve enviar lembrete';
COMMENT ON COLUMN transactions.notification_date IS 'Data do lembrete';
COMMENT ON COLUMN transactions.reminder_option IS 'Opção de antecedência do lembrete';
COMMENT ON COLUMN transactions.exchange_rate IS 'Taxa de câmbio para conversão de moeda';
COMMENT ON COLUMN transactions.destination_amount IS 'Valor convertido na moeda de destino';
COMMENT ON COLUMN transactions.destination_currency IS 'Moeda de destino da conversão';
COMMENT ON COLUMN transactions.is_refund IS 'Se é um estorno';
COMMENT ON COLUMN transactions.refund_of_transaction_id IS 'ID da transação original que está sendo estornada';
COMMENT ON COLUMN accounts.is_international IS 'Se é uma conta internacional (USD, EUR, etc)';
