-- 1. Adicionar global_cdi_rate em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS global_cdi_rate NUMERIC DEFAULT 11.15;

-- 2. Adicionar campos de rendimento em accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS yield_rate NUMERIC,
ADD COLUMN IF NOT EXISTS yield_type TEXT; -- Pode ser 'CDI', etc.
