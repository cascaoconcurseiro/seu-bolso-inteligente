# 📊 Schema Completo do Banco de Dados

## Tipos Enumerados

### transaction_type
```sql
CREATE TYPE transaction_type AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');
```

### transaction_domain
```sql
CREATE TYPE transaction_domain AS ENUM ('PERSONAL', 'SHARED', 'TRAVEL');
```

### account_type
```sql
CREATE TYPE account_type AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH');
```

### sync_status
```sql
CREATE TYPE sync_status AS ENUM ('SYNCED', 'PENDING', 'ERROR');
```

### family_role
```sql
CREATE TYPE family_role AS ENUM ('admin', 'editor', 'viewer');
```

### trip_status
```sql
CREATE TYPE trip_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
```

---

## Tabelas Core

### profiles
**Descrição:** Perfis de usuários do sistema

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `profiles_pkey` (PRIMARY KEY)

**RLS:** Habilitado
- Users can view own profile
- Users can update own profile

---

### accounts
**Descrição:** Contas bancárias dos usuários

```sql
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'CHECKING',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  initial_balance NUMERIC(15,2) DEFAULT 0,
  bank_id TEXT,
  bank_color TEXT,
  bank_logo TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  closing_day INTEGER,
  due_day INTEGER,
  credit_limit NUMERIC(15,2),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `accounts_pkey` (PRIMARY KEY)
- `idx_accounts_user_id` (user_id)
- `idx_accounts_user_active` (user_id, is_active) WHERE is_active = TRUE AND deleted_at IS NULL
- `idx_accounts_type` (user_id, type) WHERE deleted_at IS NULL
- `idx_accounts_deleted_at` (deleted_at) WHERE deleted_at IS NULL

**RLS:** Habilitado
- Users can view own accounts (WHERE deleted_at IS NULL)
- Users can create accounts
- Users can update own accounts (WHERE deleted_at IS NULL)
- Users can delete own accounts

---

### transactions
**Descrição:** Transações financeiras (receitas, despesas, transferências)

```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  competence_date DATE NOT NULL,
  type public.transaction_type NOT NULL,
  domain public.transaction_domain NOT NULL DEFAULT 'PERSONAL',
  currency TEXT NOT NULL DEFAULT 'BRL',
  
  -- Compartilhamento
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  payer_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  
  -- Parcelamento
  is_installment BOOLEAN NOT NULL DEFAULT FALSE,
  current_installment INTEGER,
  total_installments INTEGER,
  series_id UUID,
  
  -- Recorrência
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern TEXT,
  
  -- Espelhamento
  source_transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  external_id TEXT,
  sync_status public.sync_status NOT NULL DEFAULT 'SYNCED',
  
  -- Acerto
  is_settled BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  creator_user_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `transactions_pkey` (PRIMARY KEY)
- `idx_transactions_user_id` (user_id)
- `idx_transactions_account_id` (account_id)
- `idx_transactions_destination_account_id` (destination_account_id)
- `idx_transactions_category_id` (category_id)
- `idx_transactions_trip_id` (trip_id)
- `idx_transactions_competence_date` (competence_date)
- `idx_transactions_source_transaction_id` (source_transaction_id)
- `idx_transactions_user_date` (user_id, date)
- `idx_transactions_deleted_at` (deleted_at) WHERE deleted_at IS NULL
- `idx_unique_installment_per_series` (series_id, current_installment) WHERE series_id IS NOT NULL AND is_installment = TRUE
- `idx_transactions_category_date_expense` (category_id, date DESC) WHERE type = 'EXPENSE' AND deleted_at IS NULL
- `idx_transactions_shared_user_date` (user_id, is_shared, date DESC) WHERE is_shared = TRUE AND deleted_at IS NULL
- `idx_transactions_mirrors` (source_transaction_id, user_id) WHERE source_transaction_id IS NOT NULL
- `idx_transactions_installments_series` (series_id, current_installment, competence_date) WHERE is_installment = TRUE
- `idx_transactions_trip_date` (trip_id, date DESC) WHERE trip_id IS NOT NULL

**RLS:** Habilitado
- Users can view own transactions (WHERE deleted_at IS NULL)
- Users can create transactions
- Users can update own transactions (WHERE source_transaction_id IS NULL AND deleted_at IS NULL)
- Users can delete own transactions (WHERE source_transaction_id IS NULL)

---

### transaction_splits
**Descrição:** Divisões de despesas compartilhadas

```sql
CREATE TABLE public.transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  
  -- Acerto de contas
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settled_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  -- Acerto separado por lado
  settled_by_debtor BOOLEAN DEFAULT FALSE,
  settled_by_creditor BOOLEAN DEFAULT FALSE,
  debtor_settlement_tx_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  creditor_settlement_tx_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `transaction_splits_pkey` (PRIMARY KEY)
- `idx_transaction_splits_transaction_id` (transaction_id)
- `idx_transaction_splits_member_id` (member_id)
- `idx_transaction_splits_user_id` (user_id)
- `idx_transaction_splits_settled` (transaction_id, is_settled)
- `idx_transaction_splits_lookup` (transaction_id, member_id, user_id)
- `idx_transaction_splits_deleted_at` (deleted_at) WHERE deleted_at IS NULL
- `idx_splits_settled_by_debtor` (settled_by_debtor) WHERE settled_by_debtor = FALSE
- `idx_splits_settled_by_creditor` (settled_by_creditor) WHERE settled_by_creditor = FALSE
- `idx_splits_unsettled_user` (user_id, is_settled) WHERE is_settled = FALSE AND deleted_at IS NULL

**RLS:** Habilitado
- Users can view own splits (WHERE deleted_at IS NULL)
- Users can manage own splits

---

### categories
**Descrição:** Categorias de transações

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  type TEXT NOT NULL DEFAULT 'expense',
  color TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS:** Habilitado
- Users can view own categories (WHERE deleted_at IS NULL)
- Users can create categories
- Users can update own categories
- Users can delete own categories

---

## Tabelas de Compartilhamento

### families
**Descrição:** Famílias/grupos de usuários

```sql
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Família',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS:** Habilitado
- Users can view own families
- Users can create families
- Users can update own families
- Users can delete own families

---

### family_members
**Descrição:** Membros de famílias

```sql
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  email TEXT,
  role public.family_role NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Escopo de compartilhamento
  sharing_scope TEXT DEFAULT 'all',
  scope_start_date DATE,
  scope_end_date DATE,
  scope_trip_id UUID REFERENCES public.trips(id),
  
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, email)
);
```

**Índices:**
- `family_members_pkey` (PRIMARY KEY)
- `idx_family_members_family_id` (family_id)
- `idx_family_members_user_id` (user_id)
- `idx_family_members_user_active` (user_id, status) WHERE status = 'active'
- `idx_family_members_family_active` (family_id, status) WHERE status = 'active'

**RLS:** Habilitado
- Users can view family members
- Family owners can manage members

---

### family_invitations
**Descrição:** Convites para participar de famílias

```sql
CREATE TABLE public.family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role public.family_role NOT NULL DEFAULT 'viewer',
  sharing_scope TEXT DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, family_id)
);
```

**Índices:**
- `idx_unique_pending_invitation` (from_user_id, to_user_id, family_id) WHERE status = 'pending'
- `idx_family_invitations_pending` (to_user_id, status) WHERE status = 'pending'

**RLS:** Habilitado
- Users can create invitations
- Users can view received invitations
- Users can update received invitations

---

### financial_ledger
**Descrição:** Ledger financeiro - fonte única da verdade para débitos/créditos

```sql
CREATE TABLE public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  
  related_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  
  description TEXT NOT NULL,
  category TEXT,
  
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settlement_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `financial_ledger_pkey` (PRIMARY KEY)
- `idx_ledger_user_id` (user_id)
- `idx_ledger_transaction_id` (transaction_id)
- `idx_ledger_related_user_id` (related_user_id)
- `idx_ledger_is_settled` (is_settled)
- `idx_ledger_created_at` (created_at DESC)
- `idx_ledger_user_related_unsettled` (user_id, related_user_id, is_settled) WHERE is_settled = FALSE
- `idx_ledger_currency` (currency, user_id) WHERE is_settled = FALSE

**RLS:** Habilitado
- Users can view own ledger entries
- Users can insert own ledger entries
- Users can update own ledger entries

---

## Tabelas de Viagens

### trips
**Descrição:** Viagens

```sql
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  budget NUMERIC(15,2),
  status public.trip_status NOT NULL DEFAULT 'PLANNING',
  cover_image TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS:** Habilitado
- Users can view own trips or trips they participate in
- Users can create trips
- Owners can update trips
- Owners can delete trips

---

### trip_members
**Descrição:** Membros de viagens (sistema de compartilhamento)

```sql
CREATE TABLE public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  can_edit_details BOOLEAN DEFAULT FALSE,
  can_add_expenses BOOLEAN DEFAULT TRUE,
  can_view_all_expenses BOOLEAN DEFAULT TRUE,
  personal_budget NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);
```

**Índices:**
- `idx_trip_members_user` (user_id, trip_id)

**RLS:** Habilitado
- Trip members can view
- Trip owners can manage

---

### trip_invitations
**Descrição:** Convites para participar de viagens

```sql
CREATE TABLE public.trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(trip_id, invitee_id)
);
```

**Índices:**
- `idx_trip_invitations_invitee` (invitee_id, status) WHERE status = 'pending'

**RLS:** Habilitado
- Trip owners can create invitations
- Invitees can view and update their invitations

---

## Tabelas de Auditoria

### audit_log
**Descrição:** Log de auditoria de todas as mudanças

```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  request_id TEXT
);
```

**Índices:**
- `audit_log_pkey` (PRIMARY KEY)
- `idx_audit_log_table_record` (table_name, record_id)
- `idx_audit_log_changed_by` (changed_by)
- `idx_audit_log_changed_at` (changed_at DESC)
- `idx_audit_log_action` (action)
- `idx_audit_log_table_action` (table_name, action, changed_at DESC)
- `idx_audit_log_user_recent` (changed_by, changed_at DESC)

**RLS:** Habilitado
- Users can view own audit log

---

### notifications
**Descrição:** Notificações do sistema

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('WELCOME', 'INVOICE_DUE', 'SHARED_EXPENSE', ...)),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  related_type TEXT,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_notifications_user_unread` (user_id, is_read, created_at DESC) WHERE is_read = FALSE
- `idx_notifications_type_user` (type, user_id, created_at DESC)
- `idx_notifications_welcome_unique` (user_id, type) WHERE type = 'WELCOME'

**RLS:** Habilitado
- Users can view own notifications
- System can create notifications

---

## Tabelas Auxiliares

### budgets
**Descrição:** Orçamentos por categoria

```sql
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  period TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS:** Habilitado
- Users can view own budgets
- Users can create budgets
- Users can update own budgets
- Users can delete own budgets

---

## Diagrama de Relacionamentos

```
profiles (usuários)
  ├─ accounts (contas bancárias)
  │   └─ transactions (via account_id, destination_account_id)
  ├─ transactions (transações)
  │   ├─ transaction_splits (divisões)
  │   ├─ financial_ledger (ledger)
  │   └─ transactions (espelhos via source_transaction_id)
  ├─ categories (categorias)
  ├─ families (famílias - como owner)
  │   └─ family_members (membros)
  │       └─ transaction_splits (via member_id)
  ├─ family_invitations (convites enviados/recebidos)
  ├─ trips (viagens - como owner)
  │   ├─ trip_members (membros)
  │   ├─ trip_invitations (convites)
  │   └─ transactions (via trip_id)
  ├─ budgets (orçamentos)
  ├─ notifications (notificações)
  └─ audit_log (auditoria)
```

