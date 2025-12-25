-- ==============================================================================
-- MIGRATION: BUDGETS, GOALS E INVESTMENTS
-- DATA: 2025-12-26
-- ORIGEM: Migrado do PE
-- OBJETIVO: Adicionar funcionalidades de orçamentos, metas e investimentos
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PARTE 1: TABELA DE ORÇAMENTOS (BUDGETS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('MONTHLY', 'YEARLY')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold NUMERIC CHECK (alert_threshold >= 0 AND alert_threshold <= 100), -- Percentual
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date) WHERE deleted = false;

-- RLS Policies
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- PARTE 2: TABELA DE METAS (GOALS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  category TEXT,
  priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date) WHERE deleted = false;

-- RLS Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- PARTE 3: TABELA DE INVESTIMENTOS (ASSETS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('STOCK', 'BOND', 'FUND', 'CRYPTO', 'REAL_ESTATE', 'OTHER')),
  ticker TEXT, -- Código do ativo (ex: PETR4, BTC)
  quantity NUMERIC CHECK (quantity >= 0),
  purchase_price NUMERIC CHECK (purchase_price >= 0),
  current_price NUMERIC CHECK (current_price >= 0),
  purchase_date DATE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_assets_account ON assets(account_id) WHERE deleted = false;

-- RLS Policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- PARTE 4: TABELA DE SNAPSHOTS (HISTÓRICO FINANCEIRO)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  total_assets NUMERIC DEFAULT 0,
  total_liabilities NUMERIC DEFAULT 0,
  net_worth NUMERIC DEFAULT 0,
  monthly_income NUMERIC DEFAULT 0,
  monthly_expenses NUMERIC DEFAULT 0,
  savings_rate NUMERIC, -- Percentual
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON financial_snapshots(user_id, snapshot_date DESC);

-- RLS Policies
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON financial_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON financial_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- PARTE 5: FUNÇÕES AUXILIARES
-- ==============================================================================

-- Função para calcular progresso de orçamento
CREATE OR REPLACE FUNCTION get_budget_progress(
  p_budget_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  budget_id UUID,
  budgeted_amount NUMERIC,
  spent_amount NUMERIC,
  remaining_amount NUMERIC,
  percentage_used NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.amount,
    COALESCE(SUM(t.amount), 0) as spent,
    b.amount - COALESCE(SUM(t.amount), 0) as remaining,
    CASE 
      WHEN b.amount > 0 THEN (COALESCE(SUM(t.amount), 0) / b.amount * 100)
      ELSE 0
    END as percentage
  FROM budgets b
  LEFT JOIN transactions t ON 
    t.category = b.category 
    AND t.type = 'DESPESA'
    AND t.deleted = false
    AND t.date >= p_start_date
    AND t.date <= p_end_date
    AND t.user_id = b.user_id
  WHERE b.id = p_budget_id
  GROUP BY b.id, b.amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular progresso de meta
CREATE OR REPLACE FUNCTION get_goal_progress(p_goal_id UUID)
RETURNS TABLE (
  goal_id UUID,
  target_amount NUMERIC,
  current_amount NUMERIC,
  remaining_amount NUMERIC,
  percentage_complete NUMERIC,
  days_remaining INTEGER
) AS $$
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
  WHERE g.id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular rentabilidade de investimento
CREATE OR REPLACE FUNCTION get_asset_performance(p_asset_id UUID)
RETURNS TABLE (
  asset_id UUID,
  invested_amount NUMERIC,
  current_value NUMERIC,
  profit_loss NUMERIC,
  profit_loss_percentage NUMERIC
) AS $$
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
  WHERE a.id = p_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY['budgets', 'goals', 'assets'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_%s_updated_at ON %I;
      CREATE TRIGGER trg_update_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

COMMIT;

-- ==============================================================================
-- NOTAS:
-- ==============================================================================
-- 1. Budgets: Orçamentos por categoria com alertas
-- 2. Goals: Metas financeiras com progresso
-- 3. Assets: Investimentos com cálculo de rentabilidade
-- 4. Snapshots: Histórico financeiro mensal
-- 5. Todas as tabelas têm RLS habilitado
-- ==============================================================================
