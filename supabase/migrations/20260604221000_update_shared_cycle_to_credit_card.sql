-- Migração para trocar o ciclo manual por vinculação a um Cartão de Crédito
-- Arquivo: 20260604221000_update_shared_cycle_to_credit_card.sql

BEGIN;

-- 1. Adicionar o vínculo de cartão de crédito no profile
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS shared_sync_credit_card_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 2. Remover as colunas antigas que pediam o dia manualmente
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS shared_closing_day;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS shared_due_day;

COMMIT;
