-- Fix foreign key constraint for assets in transactions table
-- Allows deleting an asset by cascading the delete to its transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_asset_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_asset_id_fkey
  FOREIGN KEY (asset_id)
  REFERENCES public.assets(id)
  ON DELETE CASCADE;
