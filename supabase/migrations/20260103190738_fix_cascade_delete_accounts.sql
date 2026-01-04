-- =====================================================
-- FIX: CASCADE DELETE para Contas e Transações
-- Data: 03/01/2026
-- Problema: Ao excluir uma conta, as transações ficavam órfãs (account_id = NULL)
-- Solução: Alterar ON DELETE SET NULL para ON DELETE CASCADE
-- =====================================================

-- 1. Remover as constraints antigas de accounts
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_destination_account_id_fkey;

-- 2. Adicionar as constraints com CASCADE DELETE para accounts
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_account_id_fkey 
  FOREIGN KEY (account_id) 
  REFERENCES public.accounts(id) 
  ON DELETE CASCADE;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_destination_account_id_fkey 
  FOREIGN KEY (destination_account_id) 
  REFERENCES public.accounts(id) 
  ON DELETE CASCADE;

-- 3. Garantir CASCADE em trips
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_trip_id_fkey;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_trip_id_fkey 
  FOREIGN KEY (trip_id) 
  REFERENCES public.trips(id) 
  ON DELETE CASCADE;

-- 4. Garantir CASCADE em transaction_splits
ALTER TABLE public.transaction_splits 
  DROP CONSTRAINT IF EXISTS transaction_splits_transaction_id_fkey;

ALTER TABLE public.transaction_splits 
  ADD CONSTRAINT transaction_splits_transaction_id_fkey 
  FOREIGN KEY (transaction_id) 
  REFERENCES public.transactions(id) 
  ON DELETE CASCADE;

ALTER TABLE public.transaction_splits 
  DROP CONSTRAINT IF EXISTS transaction_splits_member_id_fkey;

ALTER TABLE public.transaction_splits 
  ADD CONSTRAINT transaction_splits_member_id_fkey 
  FOREIGN KEY (member_id) 
  REFERENCES public.family_members(id) 
  ON DELETE CASCADE;

-- 5. Garantir CASCADE em trip_members
ALTER TABLE public.trip_members 
  DROP CONSTRAINT IF EXISTS trip_members_trip_id_fkey;

ALTER TABLE public.trip_members 
  ADD CONSTRAINT trip_members_trip_id_fkey 
  FOREIGN KEY (trip_id) 
  REFERENCES public.trips(id) 
  ON DELETE CASCADE;

-- 6. Garantir CASCADE em trip_itinerary
ALTER TABLE public.trip_itinerary 
  DROP CONSTRAINT IF EXISTS trip_itinerary_trip_id_fkey;

ALTER TABLE public.trip_itinerary 
  ADD CONSTRAINT trip_itinerary_trip_id_fkey 
  FOREIGN KEY (trip_id) 
  REFERENCES public.trips(id) 
  ON DELETE CASCADE;

-- 7. Garantir CASCADE em trip_exchange_purchases
ALTER TABLE public.trip_exchange_purchases 
  DROP CONSTRAINT IF EXISTS trip_exchange_purchases_trip_id_fkey;

ALTER TABLE public.trip_exchange_purchases 
  ADD CONSTRAINT trip_exchange_purchases_trip_id_fkey 
  FOREIGN KEY (trip_id) 
  REFERENCES public.trips(id) 
  ON DELETE CASCADE;

-- 8. Garantir CASCADE em budgets
ALTER TABLE public.budgets 
  DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

ALTER TABLE public.budgets 
  ADD CONSTRAINT budgets_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.categories(id) 
  ON DELETE CASCADE;

-- 9. Limpar transações órfãs existentes (que já estão com account_id NULL)
-- CUIDADO: Isso vai excluir transações que perderam a conta
DELETE FROM public.transactions 
WHERE account_id IS NULL 
  AND destination_account_id IS NULL 
  AND type != 'INCOME';

-- 10. Comentários finais
COMMENT ON CONSTRAINT transactions_account_id_fkey ON public.transactions IS 
  'CASCADE DELETE: Quando uma conta é excluída, todas as suas transações são excluídas automaticamente';

COMMENT ON CONSTRAINT transactions_destination_account_id_fkey ON public.transactions IS 
  'CASCADE DELETE: Quando uma conta de destino é excluída, todas as transferências para ela são excluídas';

COMMENT ON CONSTRAINT transactions_trip_id_fkey ON public.transactions IS 
  'CASCADE DELETE: Quando uma viagem é excluída, todas as suas transações são excluídas automaticamente';;
