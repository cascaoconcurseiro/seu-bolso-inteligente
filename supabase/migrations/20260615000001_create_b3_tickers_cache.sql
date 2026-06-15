-- Create table for B3 Tickers Cache
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
