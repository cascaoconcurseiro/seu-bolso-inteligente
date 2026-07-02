-- Fase 3a do plano de reorganizacao SSOT (2026-07-01)
-- Indices de FK faltando (aditivo) + indices/constraints duplicados (confirmados identicos
-- via pg_indexes/pg_constraint antes de remover)

CREATE INDEX IF NOT EXISTS idx_admin_users_granted_by ON public.admin_users(granted_by);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_payment_transaction_id ON public.settlement_reversals(payment_transaction_id);

DROP INDEX IF EXISTS public.family_members_type_idx;
DROP INDEX IF EXISTS public.goal_milestones_goal_id_idx;
DROP INDEX IF EXISTS public.idx_trip_exchange_trip_id;
DROP INDEX IF EXISTS public.idx_trip_exchange_user_id;

ALTER TABLE public.trip_members DROP CONSTRAINT IF EXISTS trip_members_trip_id_user_id_key;
