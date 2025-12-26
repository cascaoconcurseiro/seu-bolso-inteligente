# 🚀 APLICAR MIGRAÇÃO DE PERMISSÕES - AGORA

## 📋 PASSO A PASSO

### 1. Abrir Supabase Dashboard
- Acesse: https://supabase.com/dashboard
- Projeto: `vrrcagukyfnlhxuvnssp`

### 2. Ir para SQL Editor
- Menu lateral → **SQL Editor**
- Clique em **New Query**

### 3. Copiar e Colar o SQL
Abra o arquivo: `scripts/apply-permissions-migration.sql`

**OU copie daqui**:

```sql
-- 1. ADICIONAR AVATAR EM FAMILY_MEMBERS
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. ADICIONAR CREATOR_USER_ID EM TRANSACTIONS
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES profiles(id);

UPDATE transactions 
SET creator_user_id = user_id 
WHERE creator_user_id IS NULL;

-- 3. ADICIONAR IS_INTERNATIONAL EM ACCOUNTS
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- 4. ADICIONAR CAMPOS DE RECORRÊNCIA
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IS NULL OR frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;

-- 5. ADICIONAR CAMPOS DE LEMBRETE
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_date DATE,
ADD COLUMN IF NOT EXISTS reminder_option TEXT;

-- 6. ADICIONAR CAMPOS DE CONVERSÃO DE MOEDA
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS destination_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS destination_currency TEXT;

-- 7. ADICIONAR CAMPO IS_REFUND
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_of_transaction_id UUID REFERENCES transactions(id);

-- 8. RLS POLICIES
DROP POLICY IF EXISTS "family_members_can_view_based_on_role" ON transactions;
DROP POLICY IF EXISTS "family_members_can_edit_based_on_role" ON transactions;
DROP POLICY IF EXISTS "family_members_can_delete_based_on_role" ON transactions;

CREATE POLICY "family_members_can_view_based_on_role"
ON transactions FOR SELECT
USING (
  user_id = auth.uid() 
  OR
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

CREATE POLICY "family_members_can_edit_based_on_role"
ON transactions FOR UPDATE
USING (
  creator_user_id = auth.uid() 
  OR
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
WITH CHECK (source_transaction_id IS NULL);

CREATE POLICY "family_members_can_delete_based_on_role"
ON transactions FOR DELETE
USING (
  creator_user_id = auth.uid() 
  OR
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

-- 9. POLICIES PARA FAMILY_MEMBERS
DROP POLICY IF EXISTS "family_members_can_update_role" ON family_members;
DROP POLICY IF EXISTS "family_members_can_update_avatar" ON family_members;

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
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
);

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

-- 10. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_transactions_creator_user_id ON transactions(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_frequency ON transactions(frequency) WHERE frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_refund ON transactions(is_refund) WHERE is_refund = true;
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);
CREATE INDEX IF NOT EXISTS idx_accounts_is_international ON accounts(is_international);
```

### 4. Executar
- Clique em **RUN** (ou Ctrl+Enter)
- Aguarde a mensagem de sucesso

### 5. Verificar
Execute para confirmar:

```sql
-- Verificar colunas adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'family_members' 
AND column_name IN ('avatar_url', 'role');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('creator_user_id', 'frequency', 'enable_notification', 'exchange_rate', 'is_refund');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name = 'is_international';
```

## ✅ RESULTADO ESPERADO

Você deve ver:
- `family_members.avatar_url` (text)
- `family_members.role` (text)
- `transactions.creator_user_id` (uuid)
- `transactions.frequency` (text)
- `transactions.recurrence_day` (integer)
- `transactions.enable_notification` (boolean)
- `transactions.notification_date` (date)
- `transactions.reminder_option` (text)
- `transactions.exchange_rate` (numeric)
- `transactions.destination_amount` (numeric)
- `transactions.destination_currency` (text)
- `transactions.is_refund` (boolean)
- `transactions.refund_of_transaction_id` (uuid)
- `accounts.is_international` (boolean)

## 🎯 PRÓXIMO PASSO

Depois de aplicar, me avise para eu:
1. Gerar os types TypeScript atualizados
2. Implementar o sistema de permissões no código
3. Criar os componentes de Role e Avatar

