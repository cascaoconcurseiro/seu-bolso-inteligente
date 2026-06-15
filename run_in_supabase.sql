-- =========================================================================
-- SCRIPT CONSOLIDADO DE BANCO DE DADOS
-- Copie este script inteiro e cole no "SQL Editor" do seu Supabase.
-- Isso é necessário porque seu histórico de migrações contém erros 
-- antigos que impedem o `supabase db push` de funcionar automaticamente.
-- =========================================================================

-- 1. Adiciona coluna asset_id na tabela transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE;

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
