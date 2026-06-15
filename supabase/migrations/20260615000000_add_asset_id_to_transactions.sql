-- Adiciona coluna asset_id na tabela transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON public.transactions(asset_id);
