-- Criar tabela de orçamentos com suporte a multi-moeda
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  period TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_currency ON budgets(currency);

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- Função para calcular progresso do orçamento
CREATE OR REPLACE FUNCTION get_budget_progress(
  p_budget_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  budget_id UUID,
  budget_name TEXT,
  budget_amount DECIMAL,
  spent_amount DECIMAL,
  remaining_amount DECIMAL,
  percentage_used DECIMAL,
  category_name TEXT,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as budget_id,
    b.name as budget_name,
    b.amount as budget_amount,
    COALESCE(SUM(t.amount), 0) as spent_amount,
    b.amount - COALESCE(SUM(t.amount), 0) as remaining_amount,
    CASE 
      WHEN b.amount > 0 THEN (COALESCE(SUM(t.amount), 0) / b.amount) * 100
      ELSE 0
    END as percentage_used,
    c.name as category_name,
    b.currency
  FROM budgets b
  LEFT JOIN categories c ON b.category_id = c.id
  LEFT JOIN transactions t ON (
    t.category_id = b.category_id 
    AND t.user_id = b.user_id
    AND t.type = 'EXPENSE'
    AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
    AND t.date >= p_start_date
    AND t.date <= p_end_date
  )
  WHERE b.id = p_budget_id
  GROUP BY b.id, b.name, b.amount, c.name, b.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
