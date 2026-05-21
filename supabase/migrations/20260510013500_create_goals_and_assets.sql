-- ==============================================================================
-- MIGRATION: CREATE GOALS AND ASSETS TABLES
-- DATA: 2026-05-10
-- OBJETIVO: Implementar tabelas de metas e ativos com segurança e performance
-- ==============================================================================

BEGIN;

-- 1. Criar tabela de Metas (Goals) se não existir
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15,2) DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  category TEXT,
  priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- 2. Criar tabela de Ativos/Investimentos (Assets) se não existir
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('STOCK', 'BOND', 'FUND', 'CRYPTO', 'REAL_ESTATE', 'OTHER')),
  ticker TEXT,
  quantity NUMERIC(20,8) DEFAULT 0 CHECK (quantity >= 0),
  purchase_price NUMERIC(15,2) DEFAULT 0 CHECK (purchase_price >= 0),
  current_price NUMERIC(15,2) DEFAULT 0 CHECK (current_price >= 0),
  purchase_date DATE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- 3. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(type) WHERE deleted = false;

-- 4. RLS (Row Level Security)
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Políticas Unificadas (Padrão Senior Architect)
DROP POLICY IF EXISTS "goals_unified_policy" ON public.goals;
CREATE POLICY "goals_unified_policy" ON public.goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "assets_unified_policy" ON public.assets;
CREATE POLICY "assets_unified_policy" ON public.assets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Funções RPC (Security Invoker - Hardened)
CREATE OR REPLACE FUNCTION public.get_goal_progress(p_goal_id UUID)
RETURNS TABLE (
  goal_id UUID,
  target_amount NUMERIC,
  current_amount NUMERIC,
  remaining_amount NUMERIC,
  percentage_complete NUMERIC,
  days_remaining INTEGER
) 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.target_amount,
    g.current_amount,
    g.target_amount - g.current_amount as remaining,
    CASE 
      WHEN g.target_amount > 0 THEN (g.current_amount / g.target_amount * 100)
      ELSE 0
    END as percentage,
    CASE 
      WHEN g.target_date IS NOT NULL THEN (g.target_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_left
  FROM goals g
  WHERE g.id = p_goal_id AND g.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_asset_performance(p_asset_id UUID)
RETURNS TABLE (
  asset_id UUID,
  invested_amount NUMERIC,
  current_value NUMERIC,
  profit_loss NUMERIC,
  profit_loss_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    (a.quantity * a.purchase_price) as invested,
    (a.quantity * a.current_price) as current_val,
    (a.quantity * a.current_price) - (a.quantity * a.purchase_price) as pl,
    CASE 
      WHEN (a.quantity * a.purchase_price) > 0 
      THEN (((a.quantity * a.current_price) - (a.quantity * a.purchase_price)) / (a.quantity * a.purchase_price) * 100)
      ELSE 0
    END as pl_percentage
  FROM assets a
  WHERE a.id = p_asset_id AND a.user_id = auth.uid();
END;
$$;

-- 6. Triggers para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
