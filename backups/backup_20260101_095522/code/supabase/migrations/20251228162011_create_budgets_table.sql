CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  period TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON public.budgets(user_id, is_active) WHERE is_active = true;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.budgets IS 'Orcamentos mensais por categoria e moeda';
COMMENT ON COLUMN public.budgets.currency IS 'Moeda do orcamento (BRL, USD, EUR, etc)';
COMMENT ON COLUMN public.budgets.period IS 'Periodo do orcamento: DAILY, WEEKLY, MONTHLY, YEARLY';;
