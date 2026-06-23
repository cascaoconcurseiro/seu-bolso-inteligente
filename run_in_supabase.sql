-- =========================================================================
-- SCRIPT CONSOLIDADO DE BANCO DE DADOS
-- Copie este script inteiro e cole no "SQL Editor" do seu Supabase.
-- Isso é necessário porque seu histórico de migrações contém erros 
-- antigos que impedem o `supabase db push` de funcionar automaticamente.
-- =========================================================================

-- 1. Adiciona coluna asset_id na tabela transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE RESTRICT;

-- Caso a constraint já exista com CASCADE, remova e recrie com RESTRICT (Segurança Financeira)
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_asset_id_fkey,
ADD CONSTRAINT transactions_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON public.transactions(asset_id);


-- 2. Create table for B3 Tickers Cache
CREATE TABLE IF NOT EXISTS public.b3_tickers_cache (
    ticker TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    type TEXT,
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.b3_tickers_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select
CREATE POLICY "Allow authenticated users to select b3 tickers" 
ON public.b3_tickers_cache 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to manage the table (insert/update from Edge Functions)
CREATE POLICY "Allow service role to manage b3 tickers" 
ON public.b3_tickers_cache 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Ensure the extension pg_trgm is available for the GIN index
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index on ticker for faster text search using ILIKE
CREATE INDEX IF NOT EXISTS idx_b3_tickers_cache_ticker_search 
ON public.b3_tickers_cache USING GIN (ticker gin_trgm_ops);

-- 3. Fix check_account_dependencies (remove reference to non-existent "deleted" column)
CREATE OR REPLACE FUNCTION public.check_account_dependencies(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_count INTEGER;
  v_future_installments INTEGER;
  v_linked_goals INTEGER;
  v_can_delete BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_transaction_count 
  FROM public.transactions 
  WHERE account_id = p_account_id
    AND is_active = true;
  
  SELECT COUNT(*) INTO v_future_installments 
  FROM public.transactions 
  WHERE account_id = p_account_id 
    AND is_active = true
    AND date > CURRENT_DATE 
    AND (series_id IS NOT NULL OR is_recurring = TRUE);
  
  SELECT COUNT(*) INTO v_linked_goals 
  FROM public.goals 
  WHERE account_id = p_account_id;
  
  v_can_delete := (v_transaction_count = 0 AND v_linked_goals = 0);
  
  RETURN json_build_object(
    'can_delete', v_can_delete,
    'total_transactions', v_transaction_count,
    'future_installments', v_future_installments,
    'open_shared_expenses', 0,
    'linked_goals', v_linked_goals
  );
END;
$$;
