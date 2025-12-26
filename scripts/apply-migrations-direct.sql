-- ============================================================================
-- SCRIPT COMPLETO PARA APLICAR TODAS AS MIGRAÇÕES
-- Execute este script no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql
-- ============================================================================

-- PARTE 1: CRIAR TIPOS ENUMERADOS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_domain AS ENUM ('PERSONAL', 'SHARED', 'TRAVEL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_status AS ENUM ('SYNCED', 'PENDING', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.family_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.split_method AS ENUM ('EQUAL', 'PERCENTAGE', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.trip_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PARTE 2: CRIAR TABELAS
-- ============================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Families
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Família',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Family Members
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role public.family_role NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES public.profiles(id),
  linked_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, email)
);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'CHECKING',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  bank_id TEXT,
  bank_color TEXT,
  bank_logo TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  closing_day INTEGER,
  due_day INTEGER,
  credit_limit NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  type TEXT NOT NULL DEFAULT 'expense',
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
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
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trip Participants
CREATE TABLE IF NOT EXISTS public.trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  personal_budget NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, user_id),
  UNIQUE(trip_id, member_id)
);
ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  type public.transaction_type NOT NULL,
  domain public.transaction_domain NOT NULL DEFAULT 'PERSONAL',
  
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  payer_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  
  is_installment BOOLEAN NOT NULL DEFAULT FALSE,
  current_installment INTEGER,
  total_installments INTEGER,
  series_id UUID,
  
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern TEXT,
  
  source_transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  external_id TEXT,
  sync_status public.sync_status NOT NULL DEFAULT 'SYNCED',
  
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  related_member_id UUID REFERENCES public.family_members(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transaction Splits
CREATE TABLE IF NOT EXISTS public.transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settled_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

-- Shared Transaction Mirrors
CREATE TABLE IF NOT EXISTS public.shared_transaction_mirrors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  mirror_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  mirror_user_id UUID NOT NULL,
  sync_status TEXT DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCED', 'PENDING', 'ERROR')),
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(original_transaction_id, mirror_user_id)
);
ALTER TABLE public.shared_transaction_mirrors ENABLE ROW LEVEL SECURITY;

-- Trip Itinerary
CREATE TABLE IF NOT EXISTS public.trip_itinerary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIME,
  end_time TIME,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.trip_itinerary ENABLE ROW LEVEL SECURITY;

-- Trip Checklist
CREATE TABLE IF NOT EXISTS public.trip_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to UUID REFERENCES public.trip_participants(id) ON DELETE SET NULL,
  category TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.trip_checklist ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 3: FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_families_updated_at ON public.families;
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.families (owner_id, name)
  VALUES (NEW.id, 'Minha Família');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families WHERE id = _family_id AND owner_id = _user_id
    UNION
    SELECT 1 FROM public.family_members WHERE family_id = _family_id AND user_id = _user_id AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_trip_participant(_user_id UUID, _trip_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = _trip_id AND owner_id = _user_id
    UNION
    SELECT 1 FROM public.trip_participants WHERE trip_id = _trip_id AND user_id = _user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.families WHERE owner_id = _user_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- PARTE 4: RLS POLICIES
-- ============================================================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- FAMILIES
DROP POLICY IF EXISTS "Users can view own families" ON public.families;
CREATE POLICY "Users can view own families" ON public.families
  FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create families" ON public.families;
CREATE POLICY "Users can create families" ON public.families
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own families" ON public.families;
CREATE POLICY "Users can update own families" ON public.families
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own families" ON public.families;
CREATE POLICY "Users can delete own families" ON public.families
  FOR DELETE USING (owner_id = auth.uid());

-- FAMILY MEMBERS
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
CREATE POLICY "Users can view family members" ON public.family_members
  FOR SELECT USING (
    family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Family owners can manage members" ON public.family_members;
CREATE POLICY "Family owners can manage members" ON public.family_members
  FOR ALL USING (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

-- ACCOUNTS
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create accounts" ON public.accounts;
CREATE POLICY "Users can create accounts" ON public.accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
CREATE POLICY "Users can delete own accounts" ON public.accounts
  FOR DELETE USING (user_id = auth.uid());

-- CATEGORIES
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create categories" ON public.categories;
CREATE POLICY "Users can create categories" ON public.categories
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (user_id = auth.uid());

-- TRIPS
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
CREATE POLICY "Users can view own trips" ON public.trips
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    public.is_trip_participant(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
CREATE POLICY "Users can create trips" ON public.trips
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update trips" ON public.trips;
CREATE POLICY "Owners can update trips" ON public.trips
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete trips" ON public.trips;
CREATE POLICY "Owners can delete trips" ON public.trips
  FOR DELETE USING (owner_id = auth.uid());

-- TRIP PARTICIPANTS
DROP POLICY IF EXISTS "Users can view trip participants" ON public.trip_participants;
CREATE POLICY "Users can view trip participants" ON public.trip_participants
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Trip owners can manage participants" ON public.trip_participants;
CREATE POLICY "Trip owners can manage participants" ON public.trip_participants
  FOR ALL USING (trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid()));

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
CREATE POLICY "Users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (user_id = auth.uid() AND source_transaction_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (user_id = auth.uid() AND source_transaction_id IS NULL);

-- TRANSACTION SPLITS
DROP POLICY IF EXISTS "Users can view own splits" ON public.transaction_splits;
CREATE POLICY "Users can view own splits" ON public.transaction_splits
  FOR SELECT USING (
    transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can manage own splits" ON public.transaction_splits;
CREATE POLICY "Users can manage own splits" ON public.transaction_splits
  FOR ALL USING (transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid()));

-- SHARED TRANSACTION MIRRORS
DROP POLICY IF EXISTS "Users can view own mirrors" ON public.shared_transaction_mirrors;
CREATE POLICY "Users can view own mirrors" ON public.shared_transaction_mirrors
  FOR SELECT USING (
    mirror_user_id = auth.uid() OR
    original_transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid())
  );

-- TRIP ITINERARY
DROP POLICY IF EXISTS "Users can view trip itinerary" ON public.trip_itinerary;
CREATE POLICY "Users can view trip itinerary" ON public.trip_itinerary
  FOR SELECT USING (public.is_trip_participant(auth.uid(), trip_id));

DROP POLICY IF EXISTS "Trip owners can manage itinerary" ON public.trip_itinerary;
CREATE POLICY "Trip owners can manage itinerary" ON public.trip_itinerary
  FOR ALL USING (trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid()));

-- TRIP CHECKLIST
DROP POLICY IF EXISTS "Users can view trip checklist" ON public.trip_checklist;
CREATE POLICY "Users can view trip checklist" ON public.trip_checklist
  FOR SELECT USING (public.is_trip_participant(auth.uid(), trip_id));

DROP POLICY IF EXISTS "Participants can manage checklist" ON public.trip_checklist;
CREATE POLICY "Participants can manage checklist" ON public.trip_checklist
  FOR ALL USING (public.is_trip_participant(auth.uid(), trip_id));

-- ============================================================================
-- CONCLUÍDO!
-- ============================================================================
